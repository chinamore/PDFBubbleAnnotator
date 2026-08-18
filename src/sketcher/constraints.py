"""Constraint definitions for the isolated Sketcher solver."""
from __future__ import annotations
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Any, Dict, List

class ConstraintType(str, Enum):
    COINCIDENT = "coincident"
    HORIZONTAL = "horizontal"
    VERTICAL = "vertical"
    PARALLEL = "parallel"
    PERPENDICULAR = "perpendicular"
    TANGENT = "tangent"
    DISTANCE = "distance"
    RADIUS = "radius"
    ANGLE = "angle"

@dataclass
class Constraint:
    type: ConstraintType
    geometry_ids: List[str]
    value: float | None = None
    id: str = ""

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["type"] = self.type.value
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Constraint":
        return cls(type=ConstraintType(data["type"]), geometry_ids=list(data.get("geometry_ids", [])),
                   value=data.get("value"), id=str(data.get("id", "")))
