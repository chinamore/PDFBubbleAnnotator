from PyQt6.QtWidgets import QGraphicsScene, QGraphicsEllipseItem, QGraphicsLineItem, QGraphicsTextItem, QGraphicsItem
from PyQt6.QtCore import Qt, QPointF, QLineF
from PyQt6.QtGui import QPen, QBrush, QColor, QFont

from sketcher.models import SketchPoint, SketchLine
from sketcher.solver import SketchSolver, Constraint, ConstraintType

class SketcherCanvas(QGraphicsScene):
    def __init__(self, parent=None):
        super().__init__(parent)
        
        # 数据存储
        self.points: dict[str, SketchPoint] = {}
        self.lines: dict[str, SketchLine] = {}
        self.solver = SketchSolver()

        # 图元与场景 UI Item 的映射关系
        self.point_items: dict[str, QGraphicsEllipseItem] = {}
        self.line_items: dict[str, QGraphicsLineItem] = {}
        self.constraint_items: list[QGraphicsTextItem] = []

        # 交互状态控制
        self.current_tool = "LINE"  # "LINE" | "SELECT"
        self.temp_start_point: SketchPoint = None
        self.preview_line_item: QGraphicsLineItem = None
        self.dragging_point_id: str = None

        # 基础样式 Pen
        self.pen_normal = QPen(QColor("#00FF00"), 2)     # 实线（草图线段）
        self.pen_construction = QPen(QColor("#0088FF"), 1, Qt.PenStyle.DashLine) # 构造线
        self.pen_preview = QPen(QColor("#AAAAAA"), 1, Qt.PenStyle.DotLine)

    def mousePressEvent(self, event):
        pos = event.scenePos()
        x, y = pos.x(), pos.y()

        if event.button() == Qt.MouseButton.LeftButton:
            if self.current_tool == "LINE":
                if self.temp_start_point is None:
                    # 创建线段起点
                    self.temp_start_point = SketchPoint(x, y)
                    self.points[self.temp_start_point.id] = self.temp_start_point
                    self._render_point(self.temp_start_point)

                    # 开启预览虚线
                    self.preview_line_item = self.addLine(x, y, x, y, self.pen_preview)
                else:
                    # 创建线段终点，生成真实 Line
                    end_point = SketchPoint(x, y)
                    self.points[end_point.id] = end_point
                    self._render_point(end_point)

                    line = SketchLine(self.temp_start_point.id, end_point.id)
                    self.lines[line.id] = line
                    self._render_line(line)

                    # 清理临时预览
                    if self.preview_line_item:
                        self.removeItem(self.preview_line_item)
                        self.preview_line_item = None
                    self.temp_start_point = None

            elif self.current_tool == "SELECT":
                # 检查是否选中端点进行拖拽
                for pid, p in self.points.items():
                    if abs(p.x - x) < 8 and abs(p.y - y) < 8:
                        self.dragging_point_id = pid
                        break

        super().mousePressEvent(event)

    def mouseMoveEvent(self, event):
        pos = event.scenePos()
        x, y = pos.x(), pos.y()

        # 1. 绘制预览线段
        if self.preview_line_item and self.temp_start_point:
            self.preview_line_item.setLine(self.temp_start_point.x, self.temp_start_point.y, x, y)

        # 2. 拖拽节点并触发求解器更新
        if self.dragging_point_id and self.current_tool == "SELECT":
            self.points[self.dragging_point_id].x = x
            self.points[self.dragging_point_id].y = y
            
            # 运行约束求解器
            self.solver.solve(self.points, fixed_point_id=self.dragging_point_id)
            self.update_canvas_ui()

        super().mouseMoveEvent(event)

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.dragging_point_id = None
        super().mouseReleaseEvent(event)

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

    def update_canvas_ui(self):
        """根据最新数据，重新更新屏幕上的 Item 位置与约束图标"""
        # 更新点位置
        for pid, item in self.point_items.items():
            p = self.points[pid]
            r = 4.0
            item.setRect(p.x - r, p.y - r, 2 * r, 2 * r)

        # 更新线位置
        for lid, item in self.line_items.items():
            line = self.lines[lid]
            p1 = self.points[line.start_point_id]
            p2 = self.points[line.end_point_id]
            item.setLine(p1.x, p1.y, p2.x, p2.y)

        # 清除并重构约束图标 (H / V 标记)
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
