/**
 * =====================================================================
 * 扭结环（torus.js）
 * =====================================================================
 * 展示一个复杂的扭结环面（TorusKnot），搭配半透明线框和环绕粒子云。
 * 
 * 功能特性：
 *   - 主扭结：紫罗兰色（#c77dff）高光材质，分段数高（128）保证细节
 *   - 线框层：比主扭结略大，青色半透明线框显示几何结构
 *   - 粒子云：800 个彩色粒子球状随机分布，使用 Additive 混合发光
 *   - 多层次差速旋转，增强视觉深度和动感
 * =====================================================================
 */

/**
 * 初始化扭结环模型
 * 创建主扭结体、外层线框和球状粒子云，驱动差速旋转动画。
 */
function initTorus() {
    // --- 1. 初始化 Three.js 基础场景 ---
    const result = initThreeScene('three-container');
    if (!result) return;
            const { scene, camera, renderer } = result;

    // ========== 2. 创建主扭结体 ==========
    // TorusKnotGeometry(半径, 管径, 管分段数, 径向分段数)
    const knotGeometry = new THREE.TorusKnotGeometry(1.3, 0.4, 128, 16);
    const knotMaterial = new THREE.MeshPhongMaterial({
        color: 0xc77dff,        // 紫罗兰色
        emissive: 0x7b2cbf,     // 深紫自发光
        emissiveIntensity: 0.3,
        shininess: 80,
        specular: 0x00d4ff,     // 青色高光，与紫色形成对比
        wireframe: false,
    });
    const knot = new THREE.Mesh(knotGeometry, knotMaterial);
    scene.add(knot);

    // ========== 3. 外层线框 ==========
    // 略大一圈的扭结，仅显示线框，半透明
    const wireGeometry = new THREE.TorusKnotGeometry(1.35, 0.45, 32, 8);
    const wireMaterial = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        wireframe: true,
        transparent: true,
        opacity: 0.15,
    });
    const wireframeKnot = new THREE.Mesh(wireGeometry, wireMaterial);
    scene.add(wireframeKnot);

    // ========== 4. 流动粒子云 ==========
    // 800 个彩色粒子球状分布在半径 2.5~4.5 的范围内
    const PARTICLE_COUNT = 800;
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    const particleColors    = new Float32Array(PARTICLE_COUNT * 3);
    const particleSizes     = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // 球坐标随机分布
        const theta  = Math.random() * Math.PI * 2; // 水平角度
        const phi    = Math.random() * Math.PI * 2; // 垂直角度
        const radius = 2.5 + Math.random() * 2;     // 半径范围

        particlePositions[i * 3]     = Math.sin(theta) * Math.cos(phi) * radius;
        particlePositions[i * 3 + 1] = Math.sin(theta) * Math.sin(phi) * radius;
        particlePositions[i * 3 + 2] = Math.cos(theta) * radius;

        // 紫罗兰到粉色范围（HSL 色相 0.75~0.95）
        const c = new THREE.Color().setHSL(0.75 + Math.random() * 0.2, 0.8, 0.5);
        particleColors[i * 3]     = c.r;
        particleColors[i * 3 + 1] = c.g;
        particleColors[i * 3 + 2] = c.b;

        particleSizes[i] = 0.03 + Math.random() * 0.05;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color',    new THREE.BufferAttribute(particleColors, 3));
    particleGeometry.setAttribute('size',     new THREE.BufferAttribute(particleSizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending, // 叠加发光
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

        // --- 5. 相机位置 ---
    camera.position.z = 5;

    // --- 6. 创建轨道控制器（拖拽旋转 / 滚轮缩放 / 触摸滑动） ---
    const controls = createOrbitControls({ camera, domElement: renderer.domElement });

    // --- 7. 启动动画循环 ---
    // 差速旋转：主扭结、线框层、粒子云各自以不同速度和方向旋转
    let time = 0;
    startAnimation(() => {
        time += 0.01;

        // 主扭结绕 X 轴 0.5 rad/s、Y 轴 0.8 rad/s 旋转
        knot.rotation.x = time * 0.5;
        knot.rotation.y = time * 0.8;

        // 线框层同向但偏移 0.1 rad，产生错位效果
        wireframeKnot.rotation.x = time * 0.5 + 0.1;
        wireframeKnot.rotation.y = time * 0.8 + 0.1;

        // 粒子云缓慢自转
        particles.rotation.y += 0.002;
        particles.rotation.x += 0.001;
    });
}
