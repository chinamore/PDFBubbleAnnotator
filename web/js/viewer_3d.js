
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

export class Web3DViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        
        // 1. 初始化 Scene, Camera, Renderer
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1e1e1e);

        this.camera = new THREE.PerspectiveCamera(
            45, 
            this.container.clientWidth / this.container.clientHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(100, 100, 100);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);

        // 2. 控制器与光源
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 15);
        this.scene.add(dirLight);

        // 3. 射线拾取器 (用于鼠标点击 3D 模型表面加标注)
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.mesh = null;

        this.initEvents();
        this.animate();
    }

    // 加载 STL 3D 模型
    loadSTL(url) {
        const loader = new STLLoader();
        loader.load(url, (geometry) => {
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x909090, 
                roughness: 0.4, 
                metalness: 0.2 
            });
            this.mesh = new THREE.Mesh(geometry, material);
            
            // 居中模型
            geometry.center();
            this.scene.add(this.mesh);
        });
    }

    // 点击 3D 模型拾取表面坐标，添加 3D 气泡序号
    initEvents() {
        this.container.addEventListener('click', (event) => {
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            if (this.mesh) {
                const intersects = this.raycaster.intersectObject(this.mesh);
                if (intersects.length > 0) {
                    const hitPoint = intersects[0].point;
                    this.add3DBubbleMarker(hitPoint, "1"); // 绑定气泡序号 #1
                }
            }
        });
    }

    // 在 3D 空间绘制气泡 Marker
    add3DBubbleMarker(point, labelText) {
        const sphereGeo = new THREE.SphereGeometry(2, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const marker = new THREE.Mesh(sphereGeo, sphereMat);
        marker.position.copy(point);
        this.scene.add(marker);

        console.log(`[3D Annotation] Added Bubble ${labelText} at`, point);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
