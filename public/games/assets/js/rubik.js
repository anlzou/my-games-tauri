/**
 * =====================================================================
 * 3D 魔方游戏（rubik.js）
 * =====================================================================
 * 使用 Three.js 实现一个可交互的 3D 魔方游戏。
 * 
 * 功能特性：
 *   - 支持 2×2 / 3×3 / 4×4 / 5×5 多阶切换
 *   - 点击面块 + 拖拽旋转该层
 *   - 拖拽空白处旋转视角（轨道控制）
 *   - 打乱 / 重置功能
 *   - 计时器与步数统计
 *   - 悬浮按钮弹出设置弹窗
 *   - 动画速度可调
 * =====================================================================
 */

// ==================== 全局状态 ====================
let rubikScene = null;
let rubikCamera = null;
let rubikRenderer = null;
let rubikAnimationId = null;
let rubikControls = null;

/** 魔方当前配置 */
const rubikState = {
    order: 3,           // 阶数 2-5
    speed: 1,           // 动画速度系数
    moves: 0,           // 步数
    seconds: 0,         // 计时秒数
    timerInterval: null,
    isAnimating: false, // 是否正在播放旋转动画
    animQueue: [],      // 动画队列
};

/** 存储所有小块的 Mesh 对象 */
let rubikCubies = [];
/** 当前 Hover 选中的块 */
let rubikHoveredCubie = null;
/** 拖拽旋转变量的状态 */
let rubikDragState = null;

// ==================== 颜色配置 ====================
const FACE_COLORS = {
    right:  0xff4444,  // 右 - 红
    left:   0x44ff44,  // 左 - 绿
    up:     0xffffff,  // 上 - 白
    down:   0xffff44,  // 下 - 黄
    front:  0x4444ff,  // 前 - 蓝
    back:   0xff8800,  // 后 - 橙
};

const FACE_NAMES = ['right', 'left', 'up', 'down', 'front', 'back'];

// ==================== 场景初始化 ====================
function rubikInitScene() {
    const container = document.getElementById('rubik-container');
    if (!container) return false;

    // 清空容器
    container.innerHTML = '';

    // 创建场景
    rubikScene = new THREE.Scene();

    // 获取容器尺寸
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 创建相机
    rubikCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    rubikCamera.position.set(5, 3, 5);
    rubikCamera.lookAt(0, 0, 0);

    // 创建渲染器
    rubikRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rubikRenderer.setSize(width, height);
    rubikRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rubikRenderer.setClearColor(0x0f0c29, 0);
    container.appendChild(rubikRenderer.domElement);

    // 添加光照
    const ambient = new THREE.AmbientLight(0x404040, 0.6);
    rubikScene.add(ambient);

    const dir1 = new THREE.DirectionalLight(0xffffff, 1);
    dir1.position.set(5, 10, 7);
    rubikScene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x00d4ff, 0.4);
    dir2.position.set(-5, -3, 5);
    rubikScene.add(dir2);

    // 轨道控制器
    rubikControls = new RubikOrbitControls(rubikCamera, container);

    // 自适应
    window.addEventListener('resize', rubikOnResize);

    return true;
}

function rubikOnResize() {
    if (!rubikRenderer || !rubikCamera) return;
    const container = rubikRenderer.domElement.parentElement;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    rubikCamera.aspect = w / h;
    rubikCamera.updateProjectionMatrix();
    rubikRenderer.setSize(w, h);
}

// ==================== 构建魔方 ====================
function rubikBuildCube(order) {
    // 清除旧的块
    if (rubikScene) {
        rubikCubies.forEach(c => {
            rubikScene.remove(c.mesh);
            // 清理几何和材质
            c.mesh.geometry.dispose();
            if (Array.isArray(c.mesh.material)) {
                c.mesh.material.forEach(m => m.dispose());
            } else {
                c.mesh.material.dispose();
            }
        });
    }

    rubikCubies = [];
    const gap = 0.05;        // 块之间的间隙
    const size = 1 - gap;    // 单个块的大小
    const offset = (order - 1) / 2;  // 中心偏移

    // 预定义6个面的法线方向
    const faceNormals = [
        { axis: 'x', val: 1,  name: 'right' },
        { axis: 'x', val: -1, name: 'left' },
        { axis: 'y', val: 1,  name: 'up' },
        { axis: 'y', val: -1, name: 'down' },
        { axis: 'z', val: 1,  name: 'front' },
        { axis: 'z', val: -1, name: 'back' },
    ];

    // 确定每个面的颜色应该赋给哪个方向的材质索引
    // BoxGeometry 材质数组顺序: +x, -x, +y, -y, +z, -z
    const matOrder = ['right', 'left', 'up', 'down', 'front', 'back'];

    for (let x = 0; x < order; x++) {
        for (let y = 0; y < order; y++) {
            for (let z = 0; z < order; z++) {
                // 只创建外层块（至少有一面在外表面）
                const isOuter = x === 0 || x === order - 1 || y === 0 || y === order - 1 || z === 0 || z === order - 1;
                if (!isOuter) continue;

                const pos = new THREE.Vector3(
                    x - offset,
                    y - offset,
                    z - offset
                );

                // 判断每个面是否在外表面
                const materials = matOrder.map((faceName, idx) => {
                    const normal = faceNormals[idx];
                    let isOnSurface = false;
                    if (normal.axis === 'x') {
                        isOnSurface = pos.x === normal.val * offset;
                    } else if (normal.axis === 'y') {
                        isOnSurface = pos.y === normal.val * offset;
                    } else if (normal.axis === 'z') {
                        isOnSurface = pos.z === normal.val * offset;
                    }

                    if (isOnSurface) {
                        return new THREE.MeshPhongMaterial({
                            color: FACE_COLORS[faceName],
                            shininess: 40,
                        });
                    } else {
                        // 内部面用深色
                        return new THREE.MeshPhongMaterial({
                            color: 0x1a1a2e,
                            shininess: 10,
                        });
                    }
                });

                const geometry = new THREE.BoxGeometry(size, size, size);
                const mesh = new THREE.Mesh(geometry, materials);
                mesh.position.copy(pos);

                // 添加边框（黑色线框）
                const edges = new THREE.EdgesGeometry(geometry);
                const line = new THREE.LineSegments(
                    edges,
                    new THREE.LineBasicMaterial({
                        color: 0x000000,
                        transparent: true,
                        opacity: 0.3,
                    })
                );
                mesh.add(line);

                rubikScene.add(mesh);

                rubikCubies.push({
                    mesh: mesh,
                    initPos: pos.clone(),
                    pos: pos.clone(),
                });
            }
        }
    }

    // 调整相机距离根据阶数
    const camDist = 3 + order * 0.8;
    rubikCamera.position.set(camDist * 0.7, camDist * 0.5, camDist * 0.7);
    rubikCamera.lookAt(0, 0, 0);
    if (rubikControls) {
        rubikControls.reset(camDist);
    }
}

// ==================== 轨道控制器（轻量版） ====================
function RubikOrbitControls(camera, domElement) {
    let isDragging = false;
    let isOnCubie = false;
    let prev = { x: 0, y: 0 };
    const target = new THREE.Vector3(0, 0, 0);
    let radius = camera.position.distanceTo(target);
    let theta = Math.atan2(camera.position.x, camera.position.z);
    let phi = Math.acos(Math.max(-1, Math.min(1, camera.position.y / radius)));

    function updateCamera() {
        const sinPhi = Math.sin(phi);
        camera.position.x = sinPhi * radius * Math.sin(theta);
        camera.position.y = Math.cos(phi) * radius;
        camera.position.z = sinPhi * radius * Math.cos(theta);
        camera.lookAt(target);
    }

    function onMouseDown(e) {
        const pos = getMouseNDC(e);
        // 检测是否点击到小块
        const hit = raycastCubies(pos);
        if (hit && !rubikState.isAnimating) {
            isOnCubie = true;
            rubikStartDrag(hit, e);
        } else {
            isOnCubie = false;
            isDragging = true;
        }
        prev = { x: e.clientX, y: e.clientY };
    }

    function onMouseMove(e) {
        if (isOnCubie && rubikDragState) {
            rubikUpdateDrag(e);
            return;
        }
        if (!isDragging) {
            // 悬停检测
            const pos = getMouseNDC(e);
            const hit = raycastCubies(pos);
            if (hit && !rubikState.isAnimating) {
                domElement.style.cursor = 'pointer';
                if (rubikHoveredCubie && rubikHoveredCubie !== hit) {
                    rubikUnhoverCubie(rubikHoveredCubie);
                }
                rubikHoveredCubie = hit;
                rubikHoverCubie(hit);
            } else {
                domElement.style.cursor = 'grab';
                if (rubikHoveredCubie) {
                    rubikUnhoverCubie(rubikHoveredCubie);
                    rubikHoveredCubie = null;
                }
            }
            return;
        }
        theta -= (e.clientX - prev.x) * 0.005;
        phi -= (e.clientY - prev.y) * 0.005;
        phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
        prev = { x: e.clientX, y: e.clientY };
        updateCamera();
    }

    function onMouseUp(e) {
        if (isOnCubie && rubikDragState) {
            rubikEndDrag(e);
            isOnCubie = false;
            return;
        }
        isDragging = false;
    }

    function onWheel(e) {
        radius = Math.max(2, Math.min(20, radius * (e.deltaY > 0 ? 1.1 : 0.9)));
        updateCamera();
    }

    // 触摸支持
    let touchDragging = false;
    let touchOnCubie = false;
    let lastTouch = { x: 0, y: 0 };
    let lastDist = 0;

    function onTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const pos = getMouseNDC({ clientX: touch.clientX, clientY: touch.clientY });
            const hit = raycastCubies(pos);
            if (hit && !rubikState.isAnimating) {
                touchOnCubie = true;
                rubikStartDrag(hit, { clientX: touch.clientX, clientY: touch.clientY });
            } else {
                touchOnCubie = false;
                touchDragging = true;
            }
            lastTouch = { x: touch.clientX, y: touch.clientY };
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastDist = Math.sqrt(dx * dx + dy * dy);
        }
    }

    function onTouchMove(e) {
        if (e.cancelable) {
            e.preventDefault();
        }
        if (touchOnCubie && rubikDragState) {
            rubikUpdateDrag({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
            return;
        }
        if (e.touches.length === 1 && touchDragging) {
            const touch = e.touches[0];
            theta -= (touch.clientX - lastTouch.x) * 0.005;
            phi -= (touch.clientY - lastTouch.y) * 0.005;
            phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
            lastTouch = { x: touch.clientX, y: touch.clientY };
            updateCamera();
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            radius = Math.max(2, Math.min(20, radius * (lastDist / dist)));
            lastDist = dist;
            updateCamera();
        }
    }

    function onTouchEnd(e) {
        if (touchOnCubie && rubikDragState) {
            rubikEndDrag({ clientX: lastTouch.x, clientY: lastTouch.y });
            touchOnCubie = false;
            return;
        }
        touchDragging = false;
    }

    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('wheel', onWheel, { passive: true });
    domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    domElement.addEventListener('touchend', onTouchEnd);

    return {
        reset(dist) {
            radius = dist || 5;
            theta = Math.atan2(1, 1);
            phi = Math.acos(Math.max(-1, Math.min(1, 0.5)));
            updateCamera();
        },
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

// ==================== 射线检测 ====================
let rubikRaycaster = new THREE.Raycaster();
let rubikMouse = new THREE.Vector2();

function getMouseNDC(e) {
    const container = rubikRenderer.domElement;
    const rect = container.getBoundingClientRect();
    return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
}

function raycastCubies(ndc) {
    rubikMouse.copy(ndc);
    rubikRaycaster.setFromCamera(rubikMouse, rubikCamera);

    const meshes = rubikCubies.map(c => c.mesh);
    const intersects = rubikRaycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        return rubikCubies.find(c => c.mesh === hitMesh) || null;
    }
    return null;
}

// ==================== Hover 效果 ====================
function rubikHoverCubie(cubie) {
    if (!cubie) return;
    const mats = cubie.mesh.material;
    if (Array.isArray(mats)) {
        mats.forEach(m => {
            if (m.emissive) {
                m.emissive.setHex(0x222222);
                m.emissiveIntensity = 0.3;
            }
        });
    }
}

function rubikUnhoverCubie(cubie) {
    if (!cubie) return;
    const mats = cubie.mesh.material;
    if (Array.isArray(mats)) {
        mats.forEach(m => {
            if (m.emissive) {
                m.emissive.setHex(0x000000);
                m.emissiveIntensity = 0;
            }
        });
    }
}

// ==================== 拖拽旋转层 ====================
/**
 * 根据点击的块和鼠标移动方向，确定要旋转的层和方向
 */
function rubikStartDrag(cubie, e) {
    const ndc = getMouseNDC(e);
    rubikRaycaster.setFromCamera(ndc, rubikCamera);

    const intersects = rubikRaycaster.intersectObject(cubie.mesh);
    if (intersects.length === 0) return;

    const faceNormal = intersects[0].face.normal.clone();
    faceNormal.transformDirection(cubie.mesh.matrixWorld);
    const axis = faceNormal.round();

    // 确定旋转轴（与该面垂直的轴）
    const rotAxis = new THREE.Vector3();
    if (Math.abs(axis.x) > 0.5) rotAxis.set(1, 0, 0);
    else if (Math.abs(axis.y) > 0.5) rotAxis.set(0, 1, 0);
    else rotAxis.set(0, 0, 1);

    // 层位置
    const layerCoord = Math.round(cubie.pos.dot(rotAxis));

    // 构建两个垂直于 rotAxis 的正交向量作为旋转平面基
    const arb = (Math.abs(rotAxis.y) < 0.9) ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const planeU = new THREE.Vector3().crossVectors(rotAxis, arb).normalize();
    const planeV = new THREE.Vector3().crossVectors(rotAxis, planeU).normalize();

    // 点击点在世界空间的位置
    const hitPoint = intersects[0].point.clone();

    rubikDragState = {
        cubie: cubie,
        axis: rotAxis,
        layerCoord: layerCoord,
        startMouse: { x: e.clientX, y: e.clientY },
        prevMouse: { x: e.clientX, y: e.clientY },
        totalAngle: 0,
        planeU: planeU,
        planeV: planeV,
        hitPoint: hitPoint,
    };
}

function rubikUpdateDrag(e) {
    if (!rubikDragState) return;

    const state = rubikDragState;
    const dx = e.clientX - state.prevMouse.x;
    const dy = e.clientY - state.prevMouse.y;

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    // === 将屏幕拖拽映射为绕轴旋转 ===
    // 核心原理：
    // 1. 将屏幕位移转换为世界空间位移
    // 2. 投影到旋转轴垂直平面
    // 3. 用叉积判断旋转方向
    const sensitivity = 0.006;
    const axis = state.axis;

    // 相机方向
    const camDir = new THREE.Vector3();
    rubikCamera.getWorldDirection(camDir);
    const camRight = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();
    const camUp = new THREE.Vector3().crossVectors(camRight, camDir).normalize();

    // 屏幕位移 -> 世界位移
    const worldMove = camRight.clone().multiplyScalar(dx).add(camUp.clone().multiplyScalar(-dy));

    // 去掉平行于旋转轴的分量
    const perpMove = worldMove.clone().sub(worldMove.clone().projectOnVector(axis));

    if (perpMove.length() < 0.001) return;

    // 使用叉积确定方向：perpMove × axis 的方向
    // 如果这个叉积与视线方向一致，表示正方向旋转
    const cross = new THREE.Vector3().crossVectors(perpMove, axis);
    const sign = camDir.dot(cross) > 0 ? 1 : -1;

    // 角度 = 位移长度 × 符号 × 灵敏度
    const angle = perpMove.length() * sign * sensitivity;

    state.totalAngle += angle;
    state.prevMouse = { x: e.clientX, y: e.clientY };

    // 获取该层的所有块
    const layerCubies = rubikCubies.filter(c => {
        const coord = Math.round(c.pos.dot(state.axis));
        return coord === state.layerCoord;
    });

    if (layerCubies.length === 0) return;

    const quat = new THREE.Quaternion().setFromAxisAngle(axis, angle);

    layerCubies.forEach(c => {
        const offset = c.mesh.position.clone().sub(axis.clone().multiplyScalar(state.layerCoord));
        offset.applyQuaternion(quat);
        c.mesh.position.copy(offset.add(axis.clone().multiplyScalar(state.layerCoord)));
        c.mesh.quaternion.premultiply(quat);
        c.pos.copy(c.mesh.position);
    });
}

function rubikEndDrag(e) {
    if (!rubikDragState) return;

    const state = rubikDragState;
    const totalAngle = state.totalAngle;
    const axis = state.axis;
    const layerCoord = state.layerCoord;

    const layerCubies = rubikCubies.filter(c => {
        const coord = Math.round(c.pos.dot(axis));
        return coord === layerCoord;
    });

    if (layerCubies.length === 0) {
        rubikDragState = null;
        return;
    }

    // 将角度四舍五入到最近的 90 度倍数
    const snappedAngle = Math.round(totalAngle / (Math.PI / 2)) * (Math.PI / 2);

    if (Math.abs(snappedAngle) > 0.01) {
        rubikState.isAnimating = true;
        rubikAnimateLayerRotation(layerCubies, axis, layerCoord, snappedAngle, () => {
            rubikState.isAnimating = false;
            rubikState.moves++;
            document.getElementById('rubik-moves').textContent = rubikState.moves;
        });
    }

    rubikDragState = null;
}

// ==================== 层旋转动画 ====================
function rubikAnimateLayerRotation(cubies, axis, layerCoord, targetAngle, callback) {
    const duration = 200 / rubikState.speed; // 毫秒
    const startTime = performance.now();
    const startQuats = cubies.map(c => c.mesh.quaternion.clone());
    const startPositions = cubies.map(c => c.mesh.position.clone());

    const totalQuat = new THREE.Quaternion().setFromAxisAngle(axis, targetAngle);

    function animate() {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        // ease-out 缓动（有惯性感）
        const ease = 1 - Math.pow(1 - t, 3);

        const currentQuat = new THREE.Quaternion().slerp(totalQuat, ease);

        cubies.forEach((c, i) => {
            if (!c.mesh) return;
            // 旋转位置：先平移到轴心，旋转，再平移回去
            const localPos = startPositions[i].clone().sub(axis.clone().multiplyScalar(layerCoord));
            localPos.applyQuaternion(currentQuat);
            c.mesh.position.copy(localPos.add(axis.clone().multiplyScalar(layerCoord)));

            // 旋转朝向
            c.mesh.quaternion.copy(startQuats[i]);
            c.mesh.quaternion.premultiply(currentQuat);
        });

        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            // 最终精确对齐
            cubies.forEach((c, i) => {
                if (!c.mesh) return;
                const localPos = startPositions[i].clone().sub(axis.clone().multiplyScalar(layerCoord));
                localPos.applyQuaternion(totalQuat);
                c.mesh.position.copy(localPos.add(axis.clone().multiplyScalar(layerCoord)));
                c.mesh.quaternion.copy(startQuats[i]);
                c.mesh.quaternion.premultiply(totalQuat);

                // 位置精确对齐到整数坐标
                c.mesh.position.x = Math.round(c.mesh.position.x);
                c.mesh.position.y = Math.round(c.mesh.position.y);
                c.mesh.position.z = Math.round(c.mesh.position.z);
                c.pos.copy(c.mesh.position);

                // 四元数对齐到90度
                rubikSnapQuaternion(c.mesh);
            });

            if (callback) callback();
        }
    }

    animate();
}

/**
 * 将四元数对齐到最近的90度旋转，消除累积误差
 */
function rubikSnapQuaternion(mesh) {
    const euler = new THREE.Euler().setFromQuaternion(mesh.quaternion, 'XYZ');
    const snap = Math.PI / 2;
    const sx = Math.round(euler.x / snap) * snap;
    const sy = Math.round(euler.y / snap) * snap;
    const sz = Math.round(euler.z / snap) * snap;

    // 直接用 XYZ 顺序 snap，这对标准魔方足够
    euler.set(sx, sy, sz, 'XYZ');
    mesh.quaternion.setFromEuler(euler);
    mesh.quaternion.normalize();
}

// ==================== 打乱算法 ====================
function rubikScramble() {
    if (rubikState.isAnimating) return;

    const order = rubikState.order;
    const moves = 10 + order * 5; // 根据阶数决定打乱步数
    const axes = [
        { axis: new THREE.Vector3(1, 0, 0), layerCount: order },
        { axis: new THREE.Vector3(0, 1, 0), layerCount: order },
        { axis: new THREE.Vector3(0, 0, 1), layerCount: order },
    ];

    let moveIndex = 0;
    let lastAxis = '';

    function doNextScrambleMove() {
        if (moveIndex >= moves) {
            // 重置计时器
            rubikResetTimer();
            rubikState.moves = 0;
            document.getElementById('rubik-moves').textContent = '0';
            return;
        }

        // 选择一个随机轴（不同于上一次）
        let axIdx;
        do {
            axIdx = Math.floor(Math.random() * 3);
        } while (axes[axIdx].axis.toArray().join(',') === lastAxis);

        const axInfo = axes[axIdx];
        const axis = axInfo.axis;
        lastAxis = axis.toArray().join(',');

        // 选择随机层
        const layerIdx = Math.floor(Math.random() * order);
        const layerCoord = layerIdx - (order - 1) / 2;

        // 随机方向
        const angle = (Math.random() > 0.5 ? 1 : -1) * Math.PI / 2;

        const layerCubies = rubikCubies.filter(c => {
            const coord = Math.round(c.pos.dot(axis));
            return coord === layerCoord;
        });

        if (layerCubies.length === 0) {
            moveIndex++;
            doNextScrambleMove();
            return;
        }

        rubikState.isAnimating = true;
        rubikAnimateLayerRotation(layerCubies, axis, layerCoord, angle, () => {
            rubikState.isAnimating = false;
            moveIndex++;
            // 延迟一点点再执行下一步
            setTimeout(doNextScrambleMove, 30);
        });
    }

    doNextScrambleMove();
}

// ==================== 重置 ====================
function rubikReset() {
    if (rubikState.isAnimating) return;

    // 停止计时
    rubikStopTimer();
    rubikState.seconds = 0;
    rubikState.moves = 0;
    document.getElementById('rubik-timer').textContent = '00:00';
    document.getElementById('rubik-moves').textContent = '0';

    // 重新构建魔方
    rubikBuildCube(rubikState.order);

    // 重置相机
    const camDist = 3 + rubikState.order * 0.8;
    if (rubikControls) {
        rubikControls.reset(camDist);
    }
}

// ==================== 计时器 ====================
function rubikStartTimer() {
    rubikStopTimer();
    rubikState.seconds = 0;
    rubikState.timerInterval = setInterval(() => {
        rubikState.seconds++;
        const mins = Math.floor(rubikState.seconds / 60).toString().padStart(2, '0');
        const secs = (rubikState.seconds % 60).toString().padStart(2, '0');
        document.getElementById('rubik-timer').textContent = `${mins}:${secs}`;
    }, 1000);
}

function rubikStopTimer() {
    if (rubikState.timerInterval) {
        clearInterval(rubikState.timerInterval);
        rubikState.timerInterval = null;
    }
}

function rubikResetTimer() {
    rubikStopTimer();
    rubikState.seconds = 0;
    document.getElementById('rubik-timer').textContent = '00:00';
    rubikStartTimer();
}

// ==================== 设置弹窗 ====================
let rubikPendingOrder = 3;
let rubikPendingSpeed = 1;

function rubikOpenSettings() {
    rubikPendingOrder = rubikState.order;
    rubikPendingSpeed = rubikState.speed;

    // 更新 UI 选中状态
    document.querySelectorAll('.rubik-order-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.order) === rubikPendingOrder);
    });
    document.querySelectorAll('.rubik-speed-btn').forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.speed) === rubikPendingSpeed);
    });

    document.getElementById('rubik-settings-overlay').classList.add('show');
}

function rubikCloseSettings(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('rubik-settings-overlay').classList.remove('show');
}

function rubikSelectOrder(order) {
    rubikPendingOrder = order;
    document.querySelectorAll('.rubik-order-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.order) === order);
    });
}

function rubikSelectSpeed(speed) {
    rubikPendingSpeed = speed;
    document.querySelectorAll('.rubik-speed-btn').forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.speed) === speed);
    });
}

function rubikApplySettings() {
    const orderChanged = rubikPendingOrder !== rubikState.order;
    const speedChanged = rubikPendingSpeed !== rubikState.speed;

    rubikState.speed = rubikPendingSpeed;

    if (orderChanged) {
        rubikState.order = rubikPendingOrder;
        document.getElementById('rubik-order-display').textContent = rubikState.order;
        document.getElementById('rubik-order-display2').textContent = rubikState.order;
        rubikBuildCube(rubikState.order);
        rubikResetTimer();
        rubikState.moves = 0;
        document.getElementById('rubik-moves').textContent = '0';
    }

    rubikCloseSettings();
}

// ==================== 动画循环 ====================
function rubikStartLoop() {
    function animate() {
        rubikAnimationId = requestAnimationFrame(animate);
        if (rubikRenderer && rubikScene && rubikCamera) {
            rubikRenderer.render(rubikScene, rubikCamera);
        }
    }
    animate();
}

function rubikStopLoop() {
    if (rubikAnimationId) {
        cancelAnimationFrame(rubikAnimationId);
        rubikAnimationId = null;
    }
}

// ==================== 初始化 ====================
function initRubik() {
    if (!rubikInitScene()) return;

    // 构建魔方
    rubikBuildCube(rubikState.order);

    // 更新显示
    document.getElementById('rubik-order-display').textContent = rubikState.order;
    document.getElementById('rubik-order-display2').textContent = rubikState.order;

    // 启动渲染循环
    rubikStartLoop();

    // 开始计时
    rubikStartTimer();
}

// ==================== 页面卸载清理 ====================
window.addEventListener('beforeunload', function() {
    rubikStopLoop();
    rubikStopTimer();
    if (rubikControls) rubikControls.dispose();
    if (rubikRenderer) {
        rubikRenderer.dispose();
        rubikRenderer = null;
    }
});

// ==================== 页面加载后初始化 ====================
if (document.readyState === 'complete') {
    initRubik();
} else {
    window.addEventListener('load', initRubik);
}
