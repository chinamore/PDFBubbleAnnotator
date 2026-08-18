"""Minimal regression tests for the isolated Sketcher core."""
from src.sketcher.models import SketchPoint, geometry_from_dict
from src.sketcher.solver import SketchSolver, Constraint, ConstraintType

def test_geometry_roundtrip():
    p=SketchPoint(12.5,8.0)
    restored=geometry_from_dict(p.to_dict())
    assert restored.x==p.x and restored.y==p.y

def test_horizontal_constraint():
    a=SketchPoint(0,0);b=SketchPoint(20,7)
    solver=SketchSolver();solver.add_constraint(Constraint(ConstraintType.HORIZONTAL,[a.id,b.id]))
    points,_=solver.solve({a.id:a,b.id:b})
    assert abs(points[a.id].y-points[b.id].y)<1e-3
