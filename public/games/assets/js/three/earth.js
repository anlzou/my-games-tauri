/**
 * =====================================================================
 * 旋转地球（earth.js）
 * =====================================================================
 * 展示一个带有 Canvas 生成纹理的 3D 地球模型。
 * 
 * 功能特性：
 *   - 地球纹理完全通过 Canvas 2D 实时生成（不依赖外部图片）
 *   - 模拟海洋渐变底色 + 多边形近似大陆（七大洲轮廓）
 *   - 大陆内部随机纹理细节，增强真实感
 *   - 半透明云层叠加在纹理上
 *   - 大气辉光层：使用 BackSide 渲染的半透明球壳
 *   - 星空背景：2000 个带有随机颜色和亮度的星星
 *   - 地球自转 + 大气层差速旋转
 * =====================================================================
 */

/**
 * 初始化旋转地球模型
 * 通过 Canvas API 程序化生成地球纹理，创建地球本体、大气层和星空，
 * 并驱动自转动画。
 */
function initEarth() {
    // --- 1. 初始化 Three.js 基础场景 ---
    const result = initThreeScene('three-container');
    if (!result) return;
    const { scene, camera, renderer } = result;

    // =====================================================================
    // 2. 通过 Canvas 2D 生成地球纹理（程序化纹理）
    // =====================================================================
    function createEarthTexture() {
        const canvas = document.createElement('canvas');
        canvas.width  = 1024; // 纹理宽度
        canvas.height = 512;  // 纹理高度（2:1 经纬图比例）
        const ctx = canvas.getContext('2d');

        // --- 2a. 绘制海洋底色 ---
        // 使用垂直渐变模拟深海到浅海的变化
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0,   '#1a3a5c'); // 两极深蓝
        gradient.addColorStop(0.3, '#1a5276');
        gradient.addColorStop(0.5, '#1c6ea4'); // 赤道亮蓝
        gradient.addColorStop(0.7, '#1a5276');
        gradient.addColorStop(1,   '#1a3a5c');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 512);

        // --- 2b. 绘制大陆（多边形近似） ---
        /**
         * 绘制一个大陆多边形，填充绿色并添加边缘阴影和内部纹理细节
         * @param {number[][]} points - 多边形顶点坐标数组 [[x,y], ...]
         * @param {string} color - 填充色
         */
        function drawContinent(points, color) {
            // 绘制主体多边形
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0], points[i][1]);
            }
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();

            // 边缘描边（深色阴影增加立体感）
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 内部随机纹理细节（地形斑点）
            for (let i = 0; i < 30; i++) {
                const x = points[0][0] + (Math.random() - 0.5) * 100;
                const y = points[0][1] + (Math.random() - 0.5) * 100;
                if (ctx.isPointInPath(x, y)) {
                    const r = 60 + Math.random() * 40;
                    const g = 120 + Math.random() * 40;
                    const b = 40 + Math.random() * 30;
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
                    ctx.beginPath();
                    ctx.arc(x, y, 3 + Math.random() * 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // 不同深浅的绿色表示不同地形
        const GREEN_DEEP   = '#2d7d46';
        const GREEN_MID    = '#3a8c54';
        const GREEN_LIGHT  = '#4a9c64';

        // 北美洲
        drawContinent([
            [150, 60], [200, 50], [250, 70], [280, 100], [270, 140],
            [240, 160], [200, 150], [170, 130], [150, 100], [140, 80],
        ], GREEN_DEEP);

        // 南美洲
        drawContinent([
            [240, 200], [260, 190], [280, 210], [285, 250], [280, 290],
            [270, 320], [255, 340], [240, 330], [235, 300], [230, 260],
            [232, 230],
        ], GREEN_MID);

        // 欧洲
        drawContinent([
            [480, 70], [500, 65], [520, 70], [530, 85], [525, 100],
            [510, 110], [490, 115], [475, 105], [470, 90],
        ], GREEN_LIGHT);

        // 非洲
        drawContinent([
            [490, 125], [510, 120], [530, 130], [540, 155], [535, 190],
            [525, 220], [510, 235], [495, 230], [485, 210], [480, 180],
            [478, 155], [482, 138],
        ], GREEN_MID);

        // 亚洲（主体）
        drawContinent([
            [540, 65], [570, 55], [610, 50], [660, 55], [700, 65],
            [730, 80], [740, 100], [730, 120], [710, 130], [680, 135],
            [650, 130], [620, 120], [600, 110], [580, 105], [560, 100],
            [540, 95], [535, 80],
        ], GREEN_DEEP);

        // 亚洲东部（东亚延伸）
        drawContinent([
            [740, 65], [770, 60], [790, 70], [795, 85], [785, 100],
            [770, 110], [750, 115], [735, 105], [730, 85],
        ], GREEN_LIGHT);

        // 东南亚
        drawContinent([
            [680, 145], [695, 140], [705, 150], [700, 170],
            [690, 180], [678, 175], [672, 160],
        ], GREEN_MID);

        // 澳大利亚
        drawContinent([
            [780, 250], [800, 245], [820, 255], [825, 275],
            [815, 290], [795, 295], [778, 285], [775, 265],
        ], GREEN_LIGHT);

        // 格陵兰（冰白色）
        drawContinent([
            [320, 30], [340, 25], [360, 30], [370, 45],
            [365, 60], [345, 65], [325, 60], [318, 45],
        ], 'rgba(200,220,230,0.8)');

        // --- 2c. 添加半透明云层 ---
        for (let i = 0; i < 40; i++) {
            const x    = Math.random() * 1024;
            const y    = Math.random() * 512;
            const size = 20 + Math.random() * 60;
            const alpha = 0.05 + Math.random() * 0.1;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.ellipse(x, y, size, size * 0.4, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }

        // 返回 Three.js 可直接使用的 Canvas 纹理
        return new THREE.CanvasTexture(canvas);
    }

    // --- 3. 创建地球球体 ---
    const earthTexture = createEarthTexture();
    const sphereGeometry = new THREE.SphereGeometry(1.5, 64, 64);
    const sphereMaterial = new THREE.MeshPhongMaterial({
        map: earthTexture,
        shininess: 25,
        specular: new THREE.Color(0x333333),
    });
    const earth = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(earth);

    // --- 4. 大气层辉光 ---
    // 使用 BackSide 渲染（从内部看），产生大气边缘发光效果
    const glowGeometry = new THREE.SphereGeometry(1.55, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glow);

    // --- 5. 星空背景（带颜色变化的星星） ---
    const STARS_COUNT = 2000;
    const starPositions = new Float32Array(STARS_COUNT * 3);
    const starColors    = new Float32Array(STARS_COUNT * 3);

    for (let i = 0; i < STARS_COUNT; i++) {
        // 随机分布在 300 单位范围的立方空间内
        starPositions[i * 3]     = (Math.random() - 0.5) * 300;
        starPositions[i * 3 + 1] = (Math.random() - 0.5) * 300;
        starPositions[i * 3 + 2] = (Math.random() - 0.5) * 300;

        const brightness = 0.5 + Math.random() * 0.5; // 亮度 0.5~1.0
        const tint = Math.random();

        if (tint > 0.9) {
            // 10% 暖色星（偏橙黄）
            starColors[i * 3]     = brightness;
            starColors[i * 3 + 1] = brightness * 0.8;
            starColors[i * 3 + 2] = brightness * 0.6;
        } else if (tint > 0.8) {
            // 10% 冷色星（偏蓝）
            starColors[i * 3]     = brightness * 0.7;
            starColors[i * 3 + 1] = brightness * 0.8;
            starColors[i * 3 + 2] = brightness;
        } else {
            // 80% 白色星
            starColors[i * 3]     = brightness;
            starColors[i * 3 + 1] = brightness;
            starColors[i * 3 + 2] = brightness;
        }
    }

    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeometry.setAttribute('color',    new THREE.BufferAttribute(starColors, 3));
    const starsMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

        // --- 6. 相机位置（比默认稍近） ---
    camera.position.z = 4;

    // --- 7. 创建轨道控制器（拖拽旋转 / 滚轮缩放 / 触摸滑动） ---
    const controls = createOrbitControls({ camera, domElement: renderer.domElement });

    // --- 8. 启动动画循环 ---
    // 地球自转、大气层差速、星空缓慢旋转
    startAnimation(() => {
        earth.rotation.y += 0.005;  // 地球自西向东自转
        glow.rotation.y  += 0.003;  // 大气层以不同速度旋转
        stars.rotation.y += 0.0001; // 星空极缓慢旋转
    });
}
