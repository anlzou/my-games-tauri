/**
 * =====================================================================
 * 旋转立方体（cube.js）
 * =====================================================================
 * 展示一个六面不同颜色的彩色立方体，带有发光边缘线框和星空背景。
 * 
 * 功能特性：
 *   - 六个面分别使用红、绿、蓝、黄、品、青六种颜色
 *   - 每个面带有自发光效果（emissive），增强色彩鲜艳度
 *   - 边缘叠加青色半透明线框，突出几何轮廓
 *   - 背景分布 2000 个随机星星粒子，营造深邃太空感
 *   - 立方体绕 X/Y 轴持续旋转，星星缓慢自转
 * =====================================================================
 */

/**
 * 初始化旋转立方体模型
 * 调用 initThreeScene 建立场景后，创建立方体 Mesh、线框和星空粒子，
 * 并启动动画循环驱动旋转。
 */
function initCube() {
    // --- 1. 初始化 Three.js 基础场景 ---
    const result = initThreeScene('three-container');
    if (!result) return; // 容器不存在时静默退出
    const { scene, camera, renderer } = result;

    // --- 2. 创建彩色立方体 ---
    // 使用 BoxGeometry(宽, 高, 深)，边长均为 2
    const geometry = new THREE.BoxGeometry(2, 2, 2);

    // 六种鲜艳的颜色，分别对应立方体的六个面
    const colors = [
        0xff4444, // 右 - 红
        0x44ff44, // 左 - 绿
        0x4444ff, // 上 - 蓝
        0xffff44, // 下 - 黄
        0xff44ff, // 前 - 品红
        0x44ffff, // 后 - 青色
    ];

    // 为每个面单独创建 MeshPhongMaterial，开启自发光增强视觉效果
    const materials = colors.map(color => new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,          // 自发光颜色与主色一致
        emissiveIntensity: 0.15,  // 自发光强度
        shininess: 60,            // 高光锐利度
    }));

    // 组合几何体与材质数组 → Mesh 对象
    const cube = new THREE.Mesh(geometry, materials);

    // --- 3. 添加发光线框 ---
    // 提取几何体的边缘，用青色半透明线框包裹立方体
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.4,
        })
    );
    cube.add(line); // 将线框作为立方体的子元素，随立方体一起旋转

    scene.add(cube);

    // --- 4. 添加星空背景粒子系统 ---
    // 使用 BufferGeometry 批量创建 2000 个随机位置的粒子
    const starsCount = 2000;
    const starsPositions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i++) {
        starsPositions[i] = (Math.random() - 0.5) * 200; // 范围 [-100, 100]
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));

    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.15,
        transparent: true,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // --- 5. 调整相机位置（比默认稍近，突出立方体） ---
    camera.position.z = 4.5;

        // --- 6. 创建轨道控制器（拖拽旋转 / 滚轮缩放 / 触摸滑动） ---
    const controls = createOrbitControls({ camera, domElement: renderer.domElement });

    // --- 7. 启动动画循环 ---
    // 每帧：立方体绕 X 轴转 0.01 rad，绕 Y 轴转 0.015 rad；星空缓慢自转
    startAnimation(() => {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.015;
        stars.rotation.y += 0.0002;
    });
}

