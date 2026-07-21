/**
 * =====================================================================
 * 3D 模型模块 - 通用功能模块（models.js）
 * =====================================================================
 * 本文件提供所有 3D 模型页面共享的基础框架：
 *   - Three.js 场景初始化（Scene/Camera/Renderer）
 *   - 光照系统配置（环境光 + 方向光）
 *   - 动画循环管理（startAnimation / stopAnimation）
 *   - 窗口自适应（Resize 响应）
 *   - 资源清理（cleanupThreeScene 防止内存泄漏）
 *   - 模型配置元数据（threeModels）
 *
 * 各具体模型（cube, sphere, torus, earth）通过调用本模块的函数来构建。
 * 使用方式：先 initThreeScene() → 添加物体 → startAnimation(callback)
 * =====================================================================
 */

// ==================== 3D 模型配置数据 ====================
// 所有模型的元数据，用于页面导航（侧边栏、选择器）和标题生成
const threeModels = [
    { id: 'cube',    name: '旋转立方体', desc: '经典彩色立方体',   icon: '📦', file: 'cube' },
    { id: 'sphere',  name: '发光球体',   desc: '带光效的球体',     icon: '🔮', file: 'sphere' },
    { id: 'torus',   name: '扭结环',     desc: '复杂扭结曲面',     icon: '🔄', file: 'torus' },
    { id: 'earth',   name: '旋转地球',   desc: '3D 地球模型',      icon: '🌍', file: 'earth' },
    { id: 'skinning', name: '骨骼动画',  desc: '蒙皮骨骼动画模型', icon: '🏃', file: 'skinning' },
    { id: 'gltf_avif', name: 'GLTF AVIF', desc: 'GLTF模型与AVIF纹理', icon: '🏠', file: 'gltf_avif' },
    { id: 'retargeting_readyplayer', name: '动画重定向', desc: 'Mixamo动画重定向到ReadyPlayer.me', icon: '🔄', file: 'retargeting_readyplayer' },
    { id: 'convex_hull', name: '凸包几何', desc: '随机点云凸包计算', icon: '💎', file: 'convex_hull' },
    { id: 'terrain', name: '程序化地形', desc: 'Simplex噪声生成地形', icon: '🏔️', file: 'terrain' },
];

/**
 * 从当前页面 URL 路径中提取 3D 模型 ID
 * 例如：/three/cube.html → 'cube'
 * @returns {string} 模型ID，匹配失败时默认返回 'cube'
 */
function getCurrentModelId() {
    const path = window.location.pathname;
    const match = path.match(/\/three\/(.+)\.html$/);
    return match ? match[1] : 'cube';
}

// ==================== Three.js 场景全局变量 ====================
/** @type {THREE.Scene|null}               3D 场景对象 */
let scene = null;
/** @type {THREE.PerspectiveCamera|null}   透视相机 */
let camera = null;
/** @type {THREE.WebGLRenderer|null}       WebGL 渲染器 */
let renderer = null;
/** @type {number|null}                    requestAnimationFrame 返回的 ID，用于暂停/恢复动画 */
let animationId = null;
/** @type {boolean}                        标识当前页面是否为 3D 模型详情页 */
let isModelPage = false;

/**
 * 初始化 Three.js 场景
 * --------------------
 * 执行以下操作：
 *   1. 创建 THREE.Scene（场景）
 *   2. 创建 THREE.PerspectiveCamera（透视相机），默认位置 z=5
 *   3. 创建 THREE.WebGLRenderer（渲染器），启用抗锯齿，限制像素比 ≤2
 *   4. 设置深紫色背景色（0x0f0c29），与页面主题一致
 *   5. 添加三盏光源（环境光 + 主方向光 + 补光）
 *   6. 注册窗口 resize 事件监听
 *
 * @param {string} containerId - 挂载渲染器画布的 DOM 元素 ID
 * @returns {object|null} 包含 scene / camera / renderer 的对象，失败返回 null
 */
function initThreeScene(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('[Three] 容器元素未找到:', containerId);
        return null;
    }

    // 清空容器，防止重复初始化
    container.innerHTML = '';

    // --- 1. 创建场景 ---
    scene = new THREE.Scene();

    // --- 2. 创建透视相机 ---
    const width  = container.clientWidth;
    const height = container.clientHeight || 500;
    camera = new THREE.PerspectiveCamera(
        75,            // 视野角度（度）
        width / height,// 宽高比
        0.1,           // 近裁剪面
        1000           // 远裁剪面
    );
    camera.position.z = 5; // 相机默认位置

    // --- 3. 创建 WebGL 渲染器 ---
    renderer = new THREE.WebGLRenderer({
        antialias: true, // 开启抗锯齿，边缘更平滑
        alpha: true,     // 透明背景，配合页面的 CSS 背景
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制像素比，平衡性能
    renderer.setClearColor(0x0f0c29, 1); // 深紫色背景，与主题色一致
    container.appendChild(renderer.domElement);

    // --- 4. 添加基础光照系统 ---

    // 环境光：提供均匀的底色照明，避免物体背光面完全黑暗
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // 主方向光（白色）：从右上方向左下方照射，产生清晰立体感
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    // 补方向光（青色）：从左下方向右上方照射，冷暖对比增强视觉效果
    const dirLight2 = new THREE.DirectionalLight(0x00d4ff, 0.5);
    dirLight2.position.set(-5, -3, 5);
    scene.add(dirLight2);

    // --- 5. 绑定窗口 resize 响应 ---
    window.addEventListener('resize', onResize);

    return { scene, camera, renderer };
}

/**
 * 窗口尺寸变化时的自适应回调
 * ---------------------------------
 * 当窗口大小改变时，同步更新相机的宽高比和渲染器尺寸，
 * 保证 3D 画面不会变形。
 */
function onResize() {
    if (!camera || !renderer) return;
    const container = renderer.domElement.parentElement;
    if (!container) return;

    const width  = container.clientWidth;
    const height = container.clientHeight || 500;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

/**
 * 启动动画循环
 * --------------
 * 使用 requestAnimationFrame 驱动渲染循环。
 * 每帧按以下顺序执行：
 *   1. 调用用户传入的 callback（用于更新物体的位置、旋转、缩放等）
 *   2. 调用 renderer.render() 渲染场景
 *
 * 调用前会先停止已有的动画循环，避免多个循环同时运行。
 *
 * @param {Function} [callback] - 每帧执行的动画更新回调函数
 */
function startAnimation(callback) {
    // 先停止可能正在运行的旧动画，防止冲突
    stopAnimation();

    const animate = () => {
        animationId = requestAnimationFrame(animate);

        // 执行用户自定义的更新逻辑（如旋转、粒子运动、呼吸效果等）
        if (typeof callback === 'function') {
            callback();
        }

        // 渲染当前帧
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    };

    animate();
}

/**
 * 停止动画循环
 * -------------
 * 取消当前的 requestAnimationFrame 请求，暂停渲染。
 * 页面切换或需要暂停动画时调用。
 */
function stopAnimation() {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

/**
 * 清理 Three.js 场景（防止内存泄漏）
 * -----------------------------------
 * 在页面卸载或切换模型时调用，执行以下清理操作：
 *   1. 停止动画循环
 *   2. 移除 window resize 事件监听
 *   3. 调用 renderer.dispose() 释放 GPU 资源
 *   4. 从 DOM 中移除渲染器的 canvas 元素
 *   5. 将 scene / camera / renderer 置为 null
 */
function cleanupThreeScene() {
    stopAnimation();
    window.removeEventListener('resize', onResize);

    if (renderer) {
        renderer.dispose(); // 释放 GPU 内存

        // 安全地从父容器中移除 canvas 元素
        const parentEl = renderer.domElement.parentElement;
        if (parentEl && renderer.domElement.parentNode === parentEl) {
            parentEl.removeChild(renderer.domElement);
        }

        renderer = null;
    }

    scene  = null;
    camera = null;
}

/**
 * 创建简易轨迹球控制器（无外部依赖）
 * -------------------------------------------------
 * 为指定相机和 DOM 元素添加鼠标拖拽旋转、滚轮缩放、触摸滑动功能。
 * 调用后返回控制器对象，包含 dispose() 方法用于清理事件监听。
 *
 * @param {object} opts - { camera: THREE.Camera, domElement: HTMLElement }
 * @returns {object} 控制器实例 { dispose }
 */
function createOrbitControls({ camera, domElement }) {
    let isDragging = false;
    let prev = { x: 0, y: 0 };
    const target = new THREE.Vector3(0, 0, 0);

    // 从相机位置计算球坐标
    const offset = new THREE.Vector3().copy(camera.position).sub(target);
    let radius = offset.length();
    let theta = Math.atan2(offset.x, offset.z);
    let phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));

    function updateCamera() {
        const sinPhi = Math.sin(phi);
        camera.position.x = sinPhi * radius * Math.sin(theta);
        camera.position.y = Math.cos(phi) * radius;
        camera.position.z = sinPhi * radius * Math.cos(theta);
        camera.lookAt(target);
    }

    // 鼠标事件
    function onMouseDown(e) {
        isDragging = true;
        prev = { x: e.clientX, y: e.clientY };
    }
    function onMouseMove(e) {
        if (!isDragging) return;
        theta -= (e.clientX - prev.x) * 0.005;
        phi -= (e.clientY - prev.y) * 0.005;
        phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
        prev = { x: e.clientX, y: e.clientY };
        updateCamera();
    }
    function onMouseUp() { isDragging = false; }
    function onWheel(e) {
        radius = Math.max(1, Math.min(20, radius * (e.deltaY > 0 ? 1.1 : 0.9)));
        updateCamera();
    }

    // 触摸事件
    let lastTouch = { x: 0, y: 0 };
    let lastDist = 0;
    function onTouchStart(e) {
        if (e.touches.length === 1) {
            isDragging = true;
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastDist = Math.sqrt(dx * dx + dy * dy);
        }
    }
    function onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging) {
            theta -= (e.touches[0].clientX - lastTouch.x) * 0.005;
            phi -= (e.touches[0].clientY - lastTouch.y) * 0.005;
            phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            updateCamera();
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            radius = Math.max(1, Math.min(20, radius * (lastDist / dist)));
            lastDist = dist;
            updateCamera();
        }
    }
    function onTouchEnd() { isDragging = false; }

    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('wheel', onWheel, { passive: true });
    domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    domElement.addEventListener('touchend', onTouchEnd);

    return {
        dispose() {
            domElement.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            domElement.removeEventListener('wheel', onWheel);
            domElement.removeEventListener('touchstart', onTouchStart);
            domElement.removeEventListener('touchmove', onTouchMove);
            domElement.removeEventListener('touchend', onTouchEnd);
        }
    };
}

/**
 * 初始化 3D 模型页面导航选择器
 * ---------------------------------
 * 根据 threeModels 配置数据，在 #model-selector 中动态生成模型切换按钮。
 * 当前页面对应的模型按钮自动添加 active 样式。
 * 同时也更新页面标题和 document.body 的 data-model-id 属性。
 *
 * 将原来在 4 个 HTML 文件中重复的模型选择器按钮创建代码整合至此。
 */
function initModelSelector() {
    const selector = document.getElementById('model-selector');
    if (!selector) return;

    // 获取当前模型 ID（优先从 body 的 data-model-id 读取，其次从 URL 获取）
    const currentId = document.body.dataset.modelId || getCurrentModelId();

    // 清空选择器容器
    selector.innerHTML = '';

    // 为配置中的每个模型生成导航链接
    threeModels.forEach(model => {
        const link = document.createElement('a');
        link.href = `./${model.id}.html`;
        link.className = 'three-model-btn' + (model.id === currentId ? ' active' : '');
        link.textContent = `${model.icon} ${model.name}`;
        selector.appendChild(link);
    });

    // 设置页面标题
    const currentModel = threeModels.find(m => m.id === currentId);
    if (currentModel) {
        document.title = `${currentModel.name} - 3D模型`;
    }
}
