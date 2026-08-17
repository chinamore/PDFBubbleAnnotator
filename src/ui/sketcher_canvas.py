
import math
from typing import Dict, Optional
from PyQt6.QtWidgets import QGraphicsScene, QGraphicsEllipseItem, QGraphicsLineItem, QGraphicsTextItem, QGraphicsItem
from PyQt6.QtCore import Qt, QPointF
from PyQt6.QtGui import QPen, QBrush, QColor, QFont

from sketcher.models import SketchPoint, SketchLine, SketchCircle
from sketcher.solver import SketchSolver, Constraint, ConstraintType

class SketcherCanvas(QGraphicsScene):
    """
    透明草图绘制画布 (QGraphicsScene)
    作为 Overlay 覆盖在 PDF 视图之上，负责矢量图元渲染与鼠标事件向 State Tools 分发
    """
    def __init__(self, parent=None):
        super().__init__(parent)
        
        # 1. 矢量图元数据存储
        self.points: Dict[str, SketchPoint] = {}
        self.lines: Dict[str, SketchLine] = {}
        self.circles: Dict[str, SketchCircle] = {}
        self.solver = SketchSolver()

        # 2. 图元数据与 Scene 上的 QGraphicsItem 映射关系
        self.point_items: Dict[str, QGraphicsEllipseItem] = {}
        self.line_items: Dict[str, QGraphicsLineItem] = {}
        self.circle_items: Dict[str, QGraphicsEllipseItem] = {}
        self.constraint_items: list[QGraphicsTextItem] = []

        # 3. 交互状态机对象 (由外部 PDFViewer 或工具栏设置)
        self.active_tool = None

        # 4. 预览图元临时 Handle
        self.preview_line_item: Optional[QGraphicsLineItem] = None
        self.preview_circle_item: Optional[QGraphicsEllipseItem] = None

        # 5. 渲染样式 Pen 定义
        self.pen_normal = QPen(QColor("#00FF00"), 2)     # 草图实体线（绿色）
        self.pen_construction = QPen(QColor("#0088FF"), 1, Qt.PenStyle.DashLine) # 辅助构造线（蓝色虚线）
        self.pen_preview = QPen(QColor("#AAAAAA"), 1, Qt.PenStyle.DotLine)        # 交互预览线（灰色点线）

    # ==========================================
    # 鼠标事件响应：分发至 active_tool (State Machine)
    # ==========================================

    def mousePressEvent(self, event):
        if self.active_tool:
            self.active_tool.mouse_press(event)
        super().mousePressEvent(event)

    def mouseMoveEvent(self, event):
        if self.active_tool:
            self.active_tool.mouse_move(event)
        super().mouseMoveEvent(event)

    def mouseReleaseEvent(self, event):
        if self.active_tool:
            self.active_tool.mouse_release(event)
        super().mouseReleaseEvent(event)

    # ==========================================
    # 图元渲染私有方法
    # ==========================================

    def _render_point(self, p: SketchPoint):
        """在 Scene 中绘制节点"""
        r = 4.0
        item = self.addEllipse(p.x - r, p.y - r, 2 * r, 2 * r, QPen(Qt.GlobalColor.red), QBrush(Qt.GlobalColor.red))
        item.setFlag(QGraphicsItem.GraphicsItemFlag.ItemIsSelectable)
        self.point_items[p.id] = item

    def _render_line(self, line: SketchLine):
        """在 Scene 中绘制线段"""
        p1 = self.points[line.start_point_id]
        p2 = self.points[line.end_point_id]
        pen = self.pen_construction if line.is_construction else self.pen_normal
        item = self.addLine(p1.x, p1.y, p2.x, p2.y, pen)
        self.line_items[line.id] = item

    def _render_circle(self, circle: SketchCircle):
        """在 Scene 中绘制圆"""
        center = self.points[circle.center_point_id]
        r = circle.radius
        pen = self.pen_construction if circle.is_construction else self.pen_normal
        item = self.addEllipse(center.x - r, center.y - r, 2 * r, 2 * r, pen)
        self.circle_items[circle.id] = item

    # ==========================================
    # 视图刷新与约束标记渲染
    # ==========================================

    def update_canvas_ui(self):
        """根据求解器或数据模型的最新更新，刷新界面所有 Item 位置与约束图标"""
        # 更新节点位置
        for pid, item in self.point_items.items():
            p = self.points[pid]
            r = 4.0
            item.setRect(p.x - r, p.y - r, 2 * r, 2 * r)

        # 更新线段位置
        for lid, item in self.line_items.items():
            line = self.lines[lid]
            p1 = self.points[line.start_point_id]
            p2 = self.points[line.end_point_id]
            item.setLine(p1.x, p1.y, p2.x, p2.y)

        # 更新圆的位置与半径
        for cid, item in self.circle_items.items():
            circle = self.circles[cid]
            center = self.points[circle.center_point_id]
            r = circle.radius
            item.setRect(center.x - r, center.y - r, 2 * r, 2 * r)

        # 清除旧的约束标记图标，重新渲染 (H / V 标记)
        for c_item in self.constraint_items:
            self.removeItem(c_item)
        self.constraint_items.clear()

        for c in self.solver.constraints:
            if c.type in (ConstraintType.HORIZONTAL, ConstraintType.VERTICAL):
                p1 = self.points[c.point_ids[0]]
                p2 = self.points[c.point_ids[1]]
                mid_x = (p1.x + p2.x) / 2
                mid_y = (p1.y + p2.y) / 2

                text_item = QGraphicsTextItem("H" if c.type == ConstraintType.HORIZONTAL else "V")
                text_item.setDefaultTextColor(QColor("#FFCC00"))
                text_item.setFont(QFont("Arial", 9, QFont.Weight.Bold))
                text_item.setPos(mid_x - 5, mid_y - 10)
                self.addItem(text_item)
                self.constraint_items.append(text_item)
