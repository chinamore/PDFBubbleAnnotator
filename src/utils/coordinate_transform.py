
from typing import Tuple, Dict, Any
from PyQt6.QtGui import QTransform
from PyQt6.QtCore import QPointF, QRectF

class CoordinateTransformer:
    """
    坐标转换工具类
    统一处理三套坐标系：
    1. PDF 页面原始坐标系 (Points / Pt, 1 inch = 72 pt, Y 轴向下)
    2. Sketcher 物理坐标系 (Millimeters / mm, 原点可在自定义位置, Y 轴向上)
    3. PyQt QGraphicsScene 画布像素坐标系 (Pixels / px, Y 轴向下)
    """

    # 1 英寸 = 25.4 毫米 = 72 PDF 点 (Pt)
    PT_TO_MM = 25.4 / 72.0
    MM_TO_PT = 72.0 / 25.4

    def __init__(self, pdf_page_width_pt: float = 595.27, pdf_page_height_pt: float = 841.89, scale_factor: float = 1.0):
        """
        :param pdf_page_width_pt: PDF 页面原始宽度 (pt)
        :param pdf_page_height_pt: PDF 页面原始高度 (pt)
        :param scale_factor: 屏幕渲染缩放比例 (DPI 缩放或 View 缩放)
        """
        self.pdf_width_pt = pdf_page_width_pt
        self.pdf_height_pt = pdf_page_height_pt
        self.scale_factor = scale_factor
        self.rotation_angle = 0  # 0, 90, 180, 270

        # 草图物理原点在 PDF 页面中的偏移量 (单位: mm)
        self.origin_offset_x_mm = 0.0
        self.origin_offset_y_mm = 0.0

    def set_page_size(self, width_pt: float, height_pt: float):
        self.pdf_width_pt = width_pt
        self.pdf_height_pt = height_pt

    def set_rotation(self, angle: int):
        """设置 PDF 旋转角度 (0, 90, 180, 270)"""
        self.rotation_angle = angle % 360

    def set_scale_factor(self, scale: float):
        """设置 UI 视口缩放系数"""
        self.scale_factor = scale

    # ==========================================
    # 1. PDF 页面坐标 (Pt) <-> 画布像素坐标 (Scene Px)
    # ==========================================

    def pdf_to_scene(self, pdf_x: float, pdf_y: float) -> Tuple[float, float]:
        """将 PDF 原始坐标系转换为 QGraphicsScene 画布像素坐标"""
        scene_x = pdf_x * self.scale_factor
        scene_y = pdf_y * self.scale_factor
        return scene_x, scene_y

    def scene_to_pdf(self, scene_x: float, scene_y: float) -> Tuple[float, float]:
        """将 QGraphicsScene 画布像素坐标还原为 PDF 原始坐标"""
        if self.scale_factor == 0:
            return 0.0, 0.0
        pdf_x = scene_x / self.scale_factor
        pdf_y = scene_y / self.scale_factor
        return pdf_x, pdf_y

    # ==========================================
    # 2. PDF 页面坐标 (Pt) <-> 草图物理坐标 (Sketcher mm)
    # ==========================================

    def pdf_to_sketch(self, pdf_x: float, pdf_y: float) -> Tuple[float, float]:
        """
        PDF 坐标 (Y向下) -> Sketcher 物理坐标 (Y向上)
        """
        # 换算为毫米
        mm_x = pdf_x * self.PT_TO_MM
        mm_y = pdf_y * self.PT_TO_MM

        # Y 轴翻转，并将原点置于 PDF 左下角 (或包含偏移)
        sketch_x = mm_x - self.origin_offset_x_mm
        sketch_y = (self.pdf_height_pt * self.PT_TO_MM - mm_y) - self.origin_offset_y_mm

        return sketch_x, sketch_y

    def sketch_to_pdf(self, sketch_x: float, sketch_y: float) -> Tuple[float, float]:
        """
        Sketcher 物理坐标 (Y向上) -> PDF 坐标 (Y向下)
        """
        mm_x = sketch_x + self.origin_offset_x_mm
        mm_y = (self.pdf_height_pt * self.PT_TO_MM) - (sketch_y + self.origin_offset_y_mm)

        pdf_x = mm_x * self.MM_TO_PT
        pdf_y = mm_y * self.MM_TO_PT

        return pdf_x, pdf_y

    # ==========================================
    # 3. 画布像素坐标 (Scene Px) <-> 草图物理坐标 (Sketcher mm)
    # ==========================================

    def scene_to_sketch(self, scene_x: float, scene_y: float) -> Tuple[float, float]:
        """场景点直接转换为草图物理坐标 (用于鼠标点击事件解析)"""
        pdf_x, pdf_y = self.scene_to_pdf(scene_x, scene_y)
        return self.pdf_to_sketch(pdf_x, pdf_y)

    def sketch_to_scene(self, sketch_x: float, sketch_y: float) -> Tuple[float, float]:
        """草图物理坐标转化为场景点 (用于求解器更新后的界面渲染)"""
        pdf_x, pdf_y = self.sketch_to_pdf(sketch_x, sketch_y)
        return self.pdf_to_scene(pdf_x, pdf_y)

    # ==========================================
    # 4. QTransform 变换矩阵生成（供 QGraphicsItem 使用）
    # ==========================================

    def get_transform_matrix(self) -> QTransform:
        """生成支持旋转与缩放的 Qt 变换矩阵"""
        transform = QTransform()
        transform.scale(self.scale_factor, self.scale_factor)
        if self.rotation_angle != 0:
            transform.rotate(self.rotation_angle)
        return transform

    def to_dict(self) -> Dict[str, Any]:
        """配置序列化"""
        return {
            "pdf_width_pt": self.pdf_width_pt,
            "pdf_height_pt": self.pdf_height_pt,
            "scale_factor": self.scale_factor,
            "rotation_angle": self.rotation_angle,
            "origin_offset_x_mm": self.origin_offset_x_mm,
            "origin_offset_y_mm": self.origin_offset_y_mm
        }
