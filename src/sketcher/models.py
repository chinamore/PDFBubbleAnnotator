import uuid
from dataclasses import dataclass, field
from typing import Dict, Any, List

@dataclass
class SketchPoint:
    """草图点图元"""
    x: float
    y: float
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    is_construction: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "x": self.x,
            "y": self.y,
            "is_construction": self.is_construction
        }

    @classmethod
    from_dict(cls, data: Dict[str, Any]) -> 'SketchPoint':
        return cls(
            id=data["id"],
            x=data["x"],
            y=data["y"],
            is_construction=data.get("is_construction", False)
        )

@dataclass
class SketchLine:
    """草图线段图元（由两个点的 ID 组成）"""
    start_point_id: str
    end_point_id: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    is_construction: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "start_point_id": self.start_point_id,
            "end_point_id": self.end_point_id,
            "is_construction": self.is_construction
        }

    @classmethod
    from_dict(cls, data: Dict[str, Any]) -> 'SketchLine':
        return cls(
            id=data["id"],
            start_point_id=data["start_point_id"],
            end_point_id=data["end_point_id"],
            is_construction=data.get("is_construction", False)
        )

@dataclass
class SketchCircle:
    """草图圆图元（由圆心点 ID 与半径组成）"""
    center_point_id: str
    radius: float
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    is_construction: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "center_point_id": self.center_point_id,
            "radius": self.radius,
            "is_construction": self.is_construction
        }

    @classmethod
    from_dict(cls, data: Dict[str, Any]) -> 'SketchCircle':
        return cls(
            id=data["id"],
            center_point_id=data["center_point_id"],
            radius=data["radius"],
            is_construction=data.get("is_construction", False)
        )
