import math
from enum import Enum
from typing import Dict, List, Tuple, Any
import numpy as np
from scipy.optimize import minimize

from .models import SketchPoint, SketchLine

class ConstraintType(Enum):
    HORIZONTAL = "HORIZONTAL"  # 水平约束（两点 Y 相同）
    VERTICAL = "VERTICAL"      # 垂直约束（两点 X 相同）
    COINCIDENT = "COINCIDENT"  # 重合约束（两点 X, Y 均相同）
    DISTANCE = "DISTANCE"      # 两点间距固定

class Constraint:
    """几何约束基类"""
    def __init__(self, type_: ConstraintType, point_ids: List[str], value: float = 0.0):
        self.type = type_
        self.point_ids = point_ids
        self.value = value  # 仅 DISTANCE 等带参数约束有效

    def error(self, points_map: Dict[str, Tuple[float, float]]) -> float:
        """计算当前参数下的约束残差平方"""
        if self.type == ConstraintType.HORIZONTAL:
            p1 = points_map[self.point_ids[0]]
            p2 = points_map[self.point_ids[1]]
            return (p1[1] - p2[1]) ** 2

        elif self.type == ConstraintType.VERTICAL:
            p1 = points_map[self.point_ids[0]]
            p2 = points_map[self.point_ids[1]]
            return (p1[0] - p2[0]) ** 2

        elif self.type == ConstraintType.COINCIDENT:
            p1 = points_map[self.point_ids[0]]
            p2 = points_map[self.point_ids[1]]
            return (p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2

        elif self.type == ConstraintType.DISTANCE:
            p1 = points_map[self.point_ids[0]]
            p2 = points_map[self.point_ids[1]]
            current_dist = math.hypot(p1[0] - p2[0], p1[1] - p2[1])
            return (current_dist - self.value) ** 2

        return 0.0

class SketchSolver:
    """草图约束求解器"""
    def __init__(self):
        self.constraints: List[Constraint] = []

    def add_constraint(self, constraint: Constraint):
        self.constraints.append(constraint)

    def solve(self, points: Dict[str, SketchPoint], fixed_point_id: str = None) -> Tuple[Dict[str, SketchPoint], int]:
        """
        执行约束求解
        :param points: 点字典 {point_id: SketchPoint}
        :param fixed_point_id: 正在被鼠标拖拽的点（防止其位置在求解中漂移）
        :return: (更新后的点字典, 剩余自由度 DOF)
        """
        if not self.constraints or not points:
            return points, len(points) * 2

        # 映射点 ID 到优化变量数组索引
        point_ids = list(points.keys())
        id_to_idx = {pid: i for i, pid in enumerate(point_ids)}
        
        # 初始点坐标向量 [x0, y0, x1, y1, ...]
        initial_vars = []
        for pid in point_ids:
            initial_vars.extend([points[pid].x, points[pid].y])
        
        initial_vars = np.array(initial_vars, dtype=float)

        def objective(vars_array):
            # 还原坐标映射
            current_map = {}
            for pid, i in id_to_idx.items():
                current_map[pid] = (vars_array[2 * i], vars_array[2 * i + 1])
            
            # 累加所有约束的残差
            total_error = sum(c.error(current_map) for c in self.constraints)
            
            # 如果指定了固定点/拖拽点，限制其偏离原始拖拽位置
            if fixed_point_id and fixed_point_id in points:
                f_idx = id_to_idx[fixed_point_id]
                orig_x, orig_y = points[fixed_point_id].x, points[fixed_point_id].y
                total_error += 1000.0 * ((vars_array[2 * f_idx] - orig_x)**2 + (vars_array[2 * f_idx + 1] - orig_y)**2)
                
            return total_error

        # 最小化求解残差
        res = minimize(objective, initial_vars, method='BFGS', options={'gtol': 1e-4, 'maxiter': 100})

        # 回写更新后的坐标
        if res.success or res.fun < 1e-2:
            new_vars = res.x
            for pid, i in id_to_idx.items():
                points[pid].x = float(new_vars[2 * i])
                points[pid].y = float(new_vars[2 * i + 1])

        # 粗略估算剩余自由度 (DOF = 变量总数 - 有效独立约束数)
        # 每个 2D 点 2 个自由度
        dof = max(0, len(points) * 2 - len(self.constraints))
        return points, dof