from typing import Tuple, Dict, Any

class CoordinateTransformer:
    """
    坐标转换工具类
    统一处理：
    1. PDF 页面原始坐标 (Pt, 1 inch = 72 pt)
    2. Sketcher 物理坐标 (mm, 原点可偏置, Y 轴向上)
    3. QGraphicsScene 坐标 (1 Scene Unit = 1 Pt, Y 轴向下)
    """

    PT_TO_MM = 25.4 / 72.0
    MM_TO_PT = 72.0 / 25.4

    def __init__(self, pdf_page_width_pt: float = 595.27, pdf_page_height_pt: float = 841.89):
        self.pdf_width_pt = pdf_page_width_pt
        self.pdf_height_pt = pdf_page_height_pt
        self.origin_offset_x_mm = 0.0
        self.origin_offset_y_mm = 0.0

    def set_page_size(self, width_pt: float, height_pt: float):
        self.pdf_width_pt = width_pt
        self.pdf_height_pt = height_pt

    def scene_to_pdf(self, scene_x: float, scene_y: float) -> Tuple[float, float]:
        """QGraphicsScene 像素坐标 -> PDF 原始 Pt 坐标（1:1 物理对应）"""
        return scene_x, scene_y

    def pdf_to_scene(self, pdf_x: float, pdf_y: float) -> Tuple[float, float]:
        return pdf_x, pdf_y

    def pdf_to_sketch(self, pdf_x: float, pdf_y: float) -> Tuple[float, float]:
        """PDF 坐标 (Y向下) -> Sketcher 物理坐标 (Y向上)"""
        mm_x = pdf_x * self.PT_TO_MM
        mm_y = pdf_y * self.PT_TO_MM
        sketch_x = mm_x - self.origin_offset_x_mm
        sketch_y = (self.pdf_height_pt * self.PT_TO_MM - mm_y) - self.origin_offset_y_mm
        return sketch_x, sketch_y

    def sketch_to_pdf(self, sketch_x: float, sketch_y: float) -> Tuple[float, float]:
        """Sketcher 物理坐标 (Y向上) -> PDF 坐标 (Y向下)"""
        mm_x = sketch_x + self.origin_offset_x_mm
        mm_y = (self.pdf_height_pt * self.PT_TO_MM) - (sketch_y + self.origin_offset_y_mm)
        return mm_x * self.MM_TO_PT, mm_y * self.MM_TO_PT
