
import math
from abc import ABC, abstractmethod
from typing import Optional, Tuple, Dict
from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import QGraphicsSceneMouseEvent

from sketcher.models import SketchPoint, SketchLine, SketchCircle
from sketcher.solver import Constraint, ConstraintType

class AbstractSketchTool(ABC):
    """草图绘制交互工具基类（抽象状态机）"""
    
    def __init__(self, canvas):
        self.canvas = canvas  # 绑定的 SketcherCanvas 实例

    @abstractmethod
    def mouse_press(self, event: QGraphicsSceneMouseEvent):
        pass

    @abstractmethod
    def mouse_move(self, event: QGraphicsSceneMouseEvent):
        pass

    @abstractmethod
    def mouse_release(self, event: QGraphicsSceneMouseEvent):
        pass

    def cancel(self):
        """按下 Esc 键或切换工具时的重置逻辑"""
        pass

    def _find_snap_point(self, pos_x: float, pos_y: float, threshold: float = 10.0) -> Optional[SketchPoint]:
        """寻找距离当前鼠标位置最近的已有节点（磁性吸附逻辑）"""
        closest_point = None
        min_dist = threshold

        for p in self.canvas.points.values():
            dist = math.hypot(p.x - pos_x, p.y - pos_y)
            if dist < min_dist:
                min_dist = dist
                closest_point = p

        return closest_point


class LineTool(AbstractSketchTool):
    """连续画线工具"""

    def __init__(self, canvas):
        super().__init__(canvas)
        self.start_point: Optional[SketchPoint] = None

    def mouse_press(self, event: QGraphicsSceneMouseEvent):
        if event.button() != Qt.MouseButton.LeftButton:
            return

        x, y = event.scenePos().x(), event.scenePos().y()

        # 优先使用磁性吸附已有节点，未吸附则新建点
        snapped_p = self._find_snap_point(x, y)
        current_p = snapped_p if snapped_p else SketchPoint(x, y)

        if not snapped_p:
            self.canvas.points[current_p.id] = current_p
            self.canvas._render_point(current_p)

        if self.start_point is None:
            # 确定起点
            self.start_point = current_p
        else:
            # 确定终点，连接成线
            if current_p.id != self.start_point.id:
                line = SketchLine(self.start_point.id, current_p.id)
                self.canvas.lines[line.id] = line
                self.canvas._render_line(line)

                # 如果两个端点靠得极近，自动添加重合约束 (Coincident)
                if snapped_p:
                    c = Constraint(ConstraintType.COINCIDENT, [self.start_point.id, snapped_p.id])
                    self.canvas.solver.add_constraint(c)

            # 连续画线：当前终点作为下一条线的起点
            self.start_point = current_p

    def mouse_move(self, event: QGraphicsSceneMouseEvent):
        x, y = event.scenePos().x(), event.scenePos().y()

        # 吸附预览提示
        snapped_p = self._find_snap_point(x, y)
        target_x, target_y = (snapped_p.x, snapped_p.y) if snapped_p else (x, y)

        # 绘制实时移动虚线
        if self.start_point:
            if not self.canvas.preview_line_item:
                self.canvas.preview_line_item = self.canvas.addLine(
                    self.start_point.x, self.start_point.y, target_x, target_y, self.canvas.pen_preview
                )
            else:
                self.canvas.preview_line_item.setLine(
                    self.start_point.x, self.start_point.y, target_x, target_y
                )

    def mouse_release(self, event: QGraphicsSceneMouseEvent):
        pass

    def cancel(self):
        if self.canvas.preview_line_item:
            self.canvas.removeItem(self.canvas.preview_line_item)
            self.canvas.preview_line_item = None
        self.start_point = None


class CircleTool(AbstractSketchTool):
    """画圆工具（圆心 + 边界点）"""

    def __init__(self, canvas):
        super().__init__(canvas)
        self.center_point: Optional[SketchPoint] = None

    def mouse_press(self, event: QGraphicsSceneMouseEvent):
        if event.button() != Qt.MouseButton.LeftButton:
            return

        x, y = event.scenePos().x(), event.scenePos().y()
        snapped_p = self._find_snap_point(x, y)
        current_p = snapped_p if snapped_p else SketchPoint(x, y)

        if not self.center_point:
            # 第一击：确定圆心
            if not snapped_p:
                self.canvas.points[current_p.id] = current_p
                self.canvas._render_point(current_p)
            self.center_point = current_p
        else:
            # 第二击：根据距离确定半径并建圆
            radius = math.hypot(x - self.center_point.x, y - self.center_point.y)
            if radius > 1e-3:
                circle = SketchCircle(self.center_point.id, radius)
                self.canvas.circles[circle.id] = circle
                self.canvas._render_circle(circle)

            self.cancel()

    def mouse_move(self, event: QGraphicsSceneMouseEvent):
        if self.center_point:
            x, y = event.scenePos().x(), event.scenePos().y()
            radius = math.hypot(x - self.center_point.x, y - self.center_point.y)

            # 预览圆弧虚线
            if not hasattr(self.canvas, 'preview_circle_item') or not self.canvas.preview_circle_item:
                self.canvas.preview_circle_item = self.canvas.addEllipse(
                    self.center_point.x - radius, self.center_point.y - radius,
                    2 * radius, 2 * radius, self.canvas.pen_preview
                )
            else:
                self.canvas.preview_circle_item.setRect(
                    self.center_point.x - radius, self.center_point.y - radius,
                    2 * radius, 2 * radius
                )

    def mouse_release(self, event: QGraphicsSceneMouseEvent):
        pass

    def cancel(self):
        if hasattr(self.canvas, 'preview_circle_item') and self.canvas.preview_circle_item:
            self.canvas.removeItem(self.canvas.preview_circle_item)
            self.canvas.preview_circle_item = None
        self.center_point = None


class ConstraintTool(AbstractSketchTool):
    """约束施加工具（如选中线段并标记 Horizontal / Vertical）"""

    def __init__(self, canvas, constraint_type: ConstraintType):
        super().__init__(canvas)
        self.constraint_type = constraint_type

    def mouse_press(self, event: QGraphicsSceneMouseEvent):
        if event.button() != Qt.MouseButton.LeftButton:
            return

        x, y = event.scenePos().x(), event.scenePos().y()

        # 查找点击位置附近的线段
        for line in self.canvas.lines.values():
            p1 = self.canvas.points[line.start_point_id]
            p2 = self.canvas.points[line.end_point_id]

            # 点到线段距离算法判断选中
            dist = self._point_to_line_dist(x, y, p1.x, p1.y, p2.x, p2.y)
            if dist < 6.0:  # 容差范围
                c = Constraint(self.constraint_type, [p1.id, p2.id])
                self.canvas.solver.add_constraint(c)
                
                # 求解并更新画布
                self.canvas.solver.solve(self.canvas.points)
                self.canvas.update_canvas_ui()
                break

    def mouse_move(self, event: QGraphicsSceneMouseEvent):
        pass

    def mouse_release(self, event: QGraphicsSceneMouseEvent):
        pass

    @staticmethod
    def _point_to_line_dist(px, py, x1, y1, x2, y2) -> float:
        """计算点到线段的距离"""
        l2 = (x2 - x1)**2 + (y2 - y1)**2
        if l2 == 0:
            return math.hypot(px - x1, py - y1)
        t = max(0, min(1, ((px - x1)*(x2 - x1) + (py - y1)*(y2 - y1)) / l2))
        proj_x = x1 + t * (x2 - x1)
        proj_y = y1 + t * (y2 - y1)
        return math.hypot(px - proj_x, py - proj_y)
