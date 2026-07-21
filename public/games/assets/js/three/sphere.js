/**
 * =====================================================================
 * 发光球体（sphere.js）
 * =====================================================================
 * 展示一个带有绚丽发光效果和粒子环的 3D 球体。
 * 
 * 功能特性：
 *   - 主球体：青色（#00d4ff）高光材质，带有自发光效果
 *   - 外发光层：半透明球壳包裹主球体，模拟能量场
 *   - 粒子环：500 个彩色粒子沿椭圆轨道环绕球体，使用 Additive 混合
 *   - 星空背景：1500 个随机分布的星星粒子
 *   - 呼吸动画：主球体周期性缩放（±3%），模拟脉动感
 * =====================================================================
 */

/**
 * 初始化发光球体模型
 * 包含主球体、外发光层、环绕粒子环、星空背景四个层次，
 * 每帧驱动旋转和呼吸脉动效果。
 */
function initSphere() {
    // --- 1. 初始化 Three.js 基础场景 ---
    const result = initThreeScene('three-container');
    if (!result) return;
    const { scene, camera, renderer } = result;

    // --- 2. 创建主球体 ---
    // 分段数较高（64×64），使表面更光滑
    const geometry = new THREE.SphereGeometry(1.5, 64, 64);
    const material = new THREE.MeshPhongMaterial({
        color: 0x00d4ff,          // 青色主色
        emissive: 0x00d4ff,       // 自发光颜色
        emissiveIntensity: 0.3,   // 自发光强度
        shininess: 100,           // 高光锐利度
        specular: 0xffffff,       // 高光颜色（白色）
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // --- 3. 外发光层 ---
    // 比主球体略大，半透明，模拟能量外溢的光晕效果
    const glowGeometry = new THREE.SphereGeometry(1.7, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.15,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glow);

    // --- 4. 环绕粒子环 ---
    // 500 个彩色粒子分布在压扁的椭圆轨道上
    const PARTICLE_COUNT = 500;
    const ringPositions = new Float32Array(PARTICLE_COUNT * 3);
    const ringColors    = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle  = (i / PARTICLE_COUNT) * Math.PI * 2;
        const radius = 2.5 + Math.random() * 0.5; // 半径 2.5~3.0

        // 椭圆分布：Y 轴压扁为 0.3 倍，Z 轴压扁为 0.5 倍 → 扁平环带
        ringPositions[i * 3]     = Math.cos(angle) * radius;
        ringPositions[i * 3 + 1] = Math.sin(angle) * radius * 0.3;
        ringPositions[i * 3 + 2] = Math.sin(angle) * radius * 0.5;

        // 颜色在青色到蓝紫色范围内变化（HSL 色相 0.55~0.70）
        const c = new THREE.Color().setHSL(0.55 + Math.random() * 0.15, 0.8, 0.5);
        ringColors[i * 3]     = c.r;
        ringColors[i * 3 + 1] = c.g;
        ringColors[i * 3 + 2] = c.b;
    }

    const ringGeometry = new THREE.BufferGeometry();
    ringGeometry.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
    ringGeometry.setAttribute('color',    new THREE.BufferAttribute(ringColors, 3));

    const ringMaterial = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,             // 使用每个粒子的独立颜色
        transparent: true,
        blending: THREE.AdditiveBlending, // 叠加混合，产生发光效果
    });
    const particles = new THREE.Points(ringGeometry, ringMaterial);
    scene.add(particles);

    // --- 5. 星空背景 ---
    const starsCount = 1500;
    const starsPositions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i++) {
        starsPositions[i] = (Math.random() - 0.5) * 200;
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));

    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
        transparent: true,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

        // --- 6. 相机位置 ---
    camera.position.z = 5;

    // --- 7. 创建轨道控制器（拖拽旋转 / 滚轮缩放 / 触摸滑动） ---
    const controls = createOrbitControls({ camera, domElement: renderer.domElement });

    // --- 8. 启动动画循环 ---
    let time = 0;
    startAnimation(() => {
        time += 0.01;

        // 主球体旋转
        sphere.rotation.x = time * 0.3;
        sphere.rotation.y = time * 0.5;

        // 外发光层反向/差速旋转，增加层次感
        glow.rotation.x = -time * 0.2;
        glow.rotation.y =  time * 0.3;

        // 粒子环持续旋转
        particles.rotation.y += 0.005;

        // 星空缓慢自转
        stars.rotation.y += 0.0001;

        // 呼吸脉动效果：以 1.5 rad/s 的频率缩放，振幅 ±3%
        const pulse = 1 + Math.sin(time * 1.5) * 0.03;
        sphere.scale.set(pulse, pulse, pulse);
    });
}
