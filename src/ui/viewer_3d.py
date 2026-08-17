
import pyvista as pv
from pyvistaqt import QtInteractor
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QPushButton

class Model3DViewerWidget(QWidget):
    """
    3D 模型与点云渲染视口 (基于 PyVista / VTK)
    支持 STL/STEP 加载、3D 标号放置与颜色热力图显示
    """
    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)

        # 创建 PyVista Qt 交互控件
        self.plotter = QtInteractor(self)
        layout.addWidget(self.plotter.interactor)

        # 样式设置
        self.plotter.set_background("#1E1E1E")
        self.plotter.add_axes()
        
        self.current_mesh = None

    def load_mesh(self, file_path: str):
        """加载 3D 模型 (STL, OBJ, PLY 等)"""
        self.plotter.clear()
        self.current_mesh = pv.read(file_path)
        
        # 添加网格渲染，设置 FreeCAD 风格的灰色材质与边框
        self.plotter.add_mesh(
            self.current_mesh, 
            color="#A0A0A0", 
            show_edges=True, 
            edge_color="#303030",
            smooth_shading=True
        )
        self.plotter.reset_camera()

    def add_3d_bubble(self, position: tuple[float, float, float], label: str):
        """在 3D 空间对应的几何特征位置添加气泡序号标签"""
        # 绘制 3D 标签点
        self.plotter.add_point_labels(
            [position], 
            [label], 
            point_color="red", 
            point_size=12, 
            font_size=16,
            always_visible=True
        )

    def show_comparison_heatmap(self, scanned_mesh, dev_scalars):
        """显示 3D 偏差对比热力图 (类似 Geomagic Control X 3D Compare)"""
        self.plotter.clear()
        self.plotter.add_mesh(
            scanned_mesh, 
            scalars=dev_scalars, 
            cmap="jet", 
            clim=[-0.5, 0.5], # 偏差范围 mm
            scalar_bar_args={"title": "Deviation (mm)"}
        )
