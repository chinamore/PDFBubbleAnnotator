import { Web3DViewer } from './viewer_3d.js';

export class AppController {
    constructor() {
        this.pdfCanvas = document.getElementById('pdf-canvas');
        this.container3D = document.getElementById('viewer-3d-container');
        this.btn2D = document.getElementById('btn-mode-2d');
        this.btn3D = document.getElementById('btn-mode-3d');
        this.tools3D = document.getElementById('3d-tools');
        this.stlInput = document.getElementById('stl-file-input');

        this.currentMode = '2D';
        this.viewer3d = null;

        this.initFileListeners();
    }

    // 切换至 2D PDF 图纸标注主界面
    switchTo2DMode() {
        this.currentMode = '2D';

        // 显示 2D Canvas，隐藏 3D 容器
        this.container3D.classList.add('hidden');
        this.pdfCanvas.classList.remove('hidden');

        this.btn2D.classList.add('active');
        this.btn3D.classList.remove('active');
        this.tools3D.style.display = 'none';
    }

    // 切换至 3D 模型主界面 (替换原 PDF 显示区域)
    switchTo3DMode() {
        this.currentMode = '3D';

        // 隐藏 2D Canvas，将 3D 容器置于主显示区域
        this.pdfCanvas.classList.add('hidden');
        this.container3D.classList.remove('hidden');

        this.btn3D.classList.add('active');
        this.btn2D.classList.remove('active');
        this.tools3D.style.display = 'inline-flex';

        // 延迟初始化或刷新 3D 视口，保证 DOM 容器已拉伸渲染完成
        if (!this.viewer3d) {
            this.viewer3d = new Web3DViewer('viewer-3d-container');
        }

        setTimeout(() => {
            this.viewer3d.onWindowResize();
        }, 50);
    }

    // 本地 STL 文件选择与解析读取
    initFileListeners() {
        if (!this.stlInput) return;

        this.stlInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                const arrayBuffer = evt.target.result;
                if (this.viewer3d) {
                    this.viewer3d.loadSTL(arrayBuffer);
                }
            };
            reader.readAsArrayBuffer(file);
        });

        // 监听窗口大小变化，保持 3D 视口在主区域始终自适应居中
        window.addEventListener('resize', () => {
            if (this.currentMode === '3D' && this.viewer3d) {
                this.viewer3d.onWindowResize();
            }
        });
    }
}

// 挂载全局 Controller 实例
window.appController = new AppController();
