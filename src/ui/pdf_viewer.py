
import fitz  # PyMuPDF
from typing import Optional
from PyQt6.QtWidgets import (
    QGraphicsView, QGraphicsScene, QGraphicsPixmapItem, 
    QVBoxLayout, QWidget, QFrame
)
from PyQt6.QtCore import Qt, QRectF
from PyQt6.QtGui import QImage, QPixmap, QWheelEvent, QTransform

from utils.coordinate_transform import CoordinateTransformer
from ui.sketcher_canvas import SketcherCanvas
from sketcher.tools import LineTool, CircleTool, ConstraintTool
from sketcher.solver import ConstraintType

class PDFViewerWidget(QGraphicsView):
    """
    结合 PDF 底图渲染与 FreeCAD 2D Sketcher 透明叠加图层的核心视图控件
    """

    def __init__(self, parent=None):
        super().__init__(parent)

        # 1. 初始化 PDF 与坐标转换器
        self.doc: Optional[fitz.Document] = None
        self.current_page_num: int = 0
        self.transformer = CoordinateTransformer()

        # 2. 创建 Sketcher 草图 Scene (作为Overlay)
        self.sketch_scene = SketcherCanvas(parent=self)
        self.setScene(self.sketch_scene)

        # 3. PDF 底图渲染 Item
        self.pdf_pixmap_item = QGraphicsPixmapItem()
        # 确保 PDF 底图处于最底层 (Z-Value = -1)，草图矢量图层在上方
        self.pdf_pixmap_item.setZValue(-1)
        self.sketch_scene.addItem(self.pdf_pixmap_item)

        # 4. 视图基础属性设置
        self.setRenderHints(self.renderHints())
        self.setDragMode(QGraphicsView.DragMode.NoDrag)
        self.setTransformationAnchor(QGraphicsView.ViewportAnchor.AnchorUnderMouse)
        self.setResizeAnchor(QGraphicsView.ViewportAnchor.AnchorUnderMouse)
        self.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)
        self.setFrameStyle(QFrame.Shape.NoFrame)

        # 当前默认激活工具
        self.set_tool("SELECT")

    # ==========================================
    # PDF 文件加载与页面渲染
    # ==========================================

    def load_pdf(self, file_path: str):
        """加载 PDF 文件并渲染首页"""
        self.doc = fitz.open(file_path)
        self.current_page_num = 0
        self.render_page(self.current_page_num)

    def render_page(self, page_num: int):
        """渲染指定的 PDF 页面，并同步更新坐标系变换矩阵"""
        if not self.doc or page_num < 0 or page_num >= len(self.doc):
            return

        self.current_page_num = page_num
        page = self.doc.load_page(page_num)
        rect = page.rect  # 获取页面原始尺寸 (单位: pt)

        # 更新坐标转换器页面参数
        self.transformer.set_page_size(rect.width, rect.height)

        # 渲染高分辨率 PDF 页面图像 (支持 DPI 缩放)
        dpi_scale = 2.0  # 提升渲染清晰度
        mat = fitz.Matrix(dpi_scale, dpi_scale)
        pix = page.get_pixmap(matrix=mat, alpha=False)

        # 将 PyMuPDF Pixmap 转为 Qt QImage
        img = QImage(
            pix.samples, pix.width, pix.height, pix.stride, QImage.Format.Format_RGB888
        )
        pixmap = QPixmap.fromImage(img)

        # 设置底图 Pixmap 并缩放至匹配 Scene 逻辑尺寸 (1 pt = 1 Scene Point)
        self.pdf_pixmap_item.setPixmap(pixmap)
        self.pdf_pixmap_item.setScale(1.0 / dpi_scale)

        # 设置 Scene 场景边界与 PDF 尺寸对齐
        self.sketch_scene.setSceneRect(0, 0, rect.width, rect.height)

    # ==========================================
    # 草图工具模式切换
    # ==========================================

    def set_tool(self, tool_name: str, constraint_type: Optional[ConstraintType] = None):
        """
        切换 Sketcher 交互工具
        :param tool_name: "SELECT" | "LINE" | "CIRCLE" | "CONSTRAINT"
        :param constraint_type: 仅在 tool_name == "CONSTRAINT" 时有效
        """
        # 取消上一个工具的中间绘制状态
        if hasattr(self.sketch_scene, "active_tool") and self.sketch_scene.active_tool:
            self.sketch_scene.active_tool.cancel()

        if tool_name == "LINE":
            self.sketch_scene.active_tool = LineTool(self.sketch_scene)
            self.setCursor(Qt.CursorShape.CrossCursor)
        elif tool_name == "CIRCLE":
            self.sketch_scene.active_tool = CircleTool(self.sketch_scene)
            self.setCursor(Qt.CursorShape.CrossCursor)
        elif tool_name == "CONSTRAINT" and constraint_type:
            self.sketch_scene.active_tool = ConstraintTool(self.sketch_scene, constraint_type)
            self.setCursor(Qt.CursorShape.PointingHandCursor)
        else:  # "SELECT"
            self.sketch_scene.active_tool = None
            self.setCursor(Qt.CursorShape.ArrowCursor)

    # ==========================================
    # 视图缩放 (Zoom) 与事件转发
    # ==========================================

    def wheelEvent(self, event: QWheelEvent):
        """响应 Ctrl + 鼠标滚轮对 PDF 与草图图层进行同步物理缩放"""
        if event.modifiers() & Qt.KeyboardModifier.ControlModifier:
            zoom_in_factor = 1.15
            zoom_out_factor = 1 / zoom_in_factor

            if event.angleDelta().y() > 0:
                zoom_factor = zoom_in_factor
            else:
                zoom_factor = zoom_out_factor

            # 执行 Qt View 视图缩放
            self.scale(zoom_factor, zoom_factor)

            # 同步更新坐标转换器中的 Scale Factor
            current_scale = self.transform().m11()
            self.transformer.set_scale_factor(current_scale)
            event.accept()
        else:
            super().wheelEvent(event)

    def keyPressEvent(self, event):
        """按 Esc 键取消当前交互或重置为选择模式"""
        if event.key() == Qt.Key.Key_Escape:
            self.set_tool("SELECT")
            event.accept()
        else:
            super().keyPressEvent(event)
