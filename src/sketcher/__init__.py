"""FreeCAD-style 2D sketcher core for PDFBubbleAnnotator.

The sketcher is deliberately isolated from the existing bubble annotation model.
"""
from .models import SketchPoint, SketchLine, SketchCircle, SketchArc
from .constraints import Constraint, ConstraintType
from .solver import SketchSolver, SolveResult

__all__ = [
    "SketchPoint", "SketchLine", "SketchCircle", "SketchArc",
    "Constraint", "ConstraintType", "SketchSolver", "SolveResult",
]
