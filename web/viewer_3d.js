import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

export class Web3DViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        // 1. 初始化 3D 场景与相机
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1e1e1e); // 暗色工程背景

        this.camera = new THREE.PerspectiveCamera(
            45,
            this.container.clientWidth / (this.container.clientHeight || 1),
            0.1,
            2000
        );

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);

        // 2. 轨道控制器与基础灯光设置
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight1.position.set(100, 200, 100);
        this.scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        dirLight2.position.set(-100, -200, -100);
        this.scene.add(dirLight2);

        // 3. 拾取射线与变量
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.mesh = null;

        this.initEvents();
        this.animate();
    }

    // 从 URL 或本地二进制数据加载 STL 模型
    loadSTL(source) {
        const loader = new STLLoader();
        
        const processGeometry = (geometry) => {
            if (this.mesh) {
                this.scene.remove(this.mesh);
                this.mesh.geometry.dispose();
            }

            // 核心关键点 1：将 Mesh 几何体物理中心强制对齐原点 (0,0,0)
            geometry.center();

            const material = new THREE.MeshStandardMaterial({
                color: 0x909090,
                roughness: 0.3,
                metalness: 0.3,
                side: THREE.DoubleSide
            });

            this.mesh = new THREE.Mesh(geometry, material);
            this.scene.add(this.mesh);

            // 核心关键点 2：自动计算视角包围球，将相机聚焦到主画面正中央
            this.resetCameraView();
        };

        if (typeof source === 'string') {
            loader.load(source, processGeometry);
        } else if (source instanceof ArrayBuffer) {
            const geometry = loader.parse(source);
            processGeometry(geometry);
        }
    }

    // 自动重置并聚焦 Camera 到主视口居中位置
    resetCameraView() {
        if (!this.mesh) return;

        this.mesh.geometry.computeBoundingSphere();
        const sphere = this.mesh.geometry.boundingSphere;
        const radius = sphere.radius;

        // 计算当前主容器的 Fov 与视距
        const fov = this.camera.fov * (Math.PI / 180);
        const distance = Math.abs(radius / Math.sin(fov / 2)) * 1.35;

        // 设置相机视角方向与控制中心
        this.camera.position.set(distance, distance, distance);
        this.controls.target.set(0, 0, 0);
        this.camera.lookAt(0, 0, 0);

        this.onWindowResize();
        this.controls.update();
    }

    // 主视口容器尺寸变更重置（解决主区域伸缩导致模型畸变）
    onWindowResize() {
        if (!this.container || this.container.clientWidth === 0) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    // 点击 3D 模型表面的射线拾取与 3D 气泡 Marker 添加
    initEvents() {
        this.container.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return; // 仅响应左键点击

            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            if (this.mesh) {
                const intersects = this.raycaster.intersectObject(this.mesh);
                if (intersects.length > 0) {
                    const hitPoint = intersects[0].point;
                    this.add3DBubbleMarker(hitPoint);
                }
            }
        });
    }

    // 在 3D 空间绘制气泡标注点
    add3DBubbleMarker(point) {
        const markerGeo = new THREE.SphereGeometry(1.5, 16, 16);
        const markerMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.copy(point);
        this.scene.add(marker);

        // 与 PyWebView 通信返回点击坐标
        if (window.pywebview) {
            window.pywebview.api.on_3d_point_selected(point.x, point.y, point.z);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
