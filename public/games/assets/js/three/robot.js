/**
 * =====================================================================
 * 机器人模型交互页面（robot.js）
 * =====================================================================
 * 加载 Mixamo FBX 机器人模型，提供按钮指令操控其完成各种交互动作。
 *
 * 功能特性：
 *   - 加载 Mixamo FBX 模型（自带骨骼动画）
 *   - 动画控制：播放/暂停、加速、减速、倒放
 *   - 姿态控制：T-Pose、大鹏展翅
 *   - 重置动画
 *   - 自动呼吸浮动效果
 *   - 地面反射（TSL reflector）
 *   - 简易轨迹球控制器
 *   - 状态信息提示
 *
 * 使用方式：
 *   const viewer = initRobot('three-container', {
 *       model: '../assets/models/fbx/mixamo.fbx'
 *   });
 * =====================================================================
 */

/**
 * 初始化机器人交互展示
 * --------------------
 * @param {string} containerId - 容器 DOM 元素 ID
 * @param {object} paths - 模型路径配置 { model: string }
 * @param {object} [options] - 可选配置项
 * @returns {object|null} { getSceneRefs, performAction, dispose }
 */
function initRobot(containerId, paths, options) {
    var container = document.getElementById(containerId);
    if (!container) {
        console.warn('[Robot] 容器元素未找到:', containerId);
        return null;
    }
    container.innerHTML = '';

    // ===== 合并选项 =====
    var opts = Object.assign({
        scale: 0.01,
        camPosX: 0,
        camPosY: 1.2,
        camPosZ: 2.5,
        fov: 35,
        floorOpacity: 0.15,
        lightIntensity: 12,
        bgColorTop: 0x0a0a1a,
        bgColorMid: 0x1a0a2e,
        bgColorAccent: 0x004466,
        ambientColor: 0x2a1a4e,
        backLightColor: 0x88ccff,
        keyLightColor: 0xffeedd,
        keyLightIntensity: 6,
        floatAmplitude: 0.008,
        floatSpeed: 0.6,
    }, options);

    // ===== 获取依赖 =====
    var deps = window.__ROBOT_DEPS__ || {};
    var T = deps.THREE || window.THREE;
    var FBXLoaderClass = deps.FBXLoader;
    var tsl = window.__TSL__ || {};

    if (!T) {
        console.error('[Robot] Three.js 未加载');
        return null;
    }

    // ===== 时钟 =====
    var clock = new T.Clock();

    // ===== 1. 场景 =====
    var scene = new T.Scene();

    // TSL 渐变背景
    if (tsl.screenUV && tsl.color && tsl.vec2) {
        try {
            var horizontalEffect = tsl.screenUV.x.mix(tsl.color(opts.bgColorTop), tsl.color(opts.bgColorMid));
            var lightEffect = tsl.screenUV.distance(tsl.vec2(0.5, 1.0)).oneMinus().mul(tsl.color(opts.bgColorAccent));
            scene.backgroundNode = horizontalEffect.add(lightEffect);
        } catch (e) {
            scene.background = new T.Color(opts.bgColorMid);
        }
    } else {
        scene.background = new T.Color(opts.bgColorMid);
    }

    // ===== 2. 相机 =====
    var camera = new T.PerspectiveCamera(
        opts.fov,
        container.clientWidth / container.clientHeight,
        0.1,
        20
    );
    camera.position.set(opts.camPosX, opts.camPosY, opts.camPosZ);

    // ===== 3. 光照 =====
    var hemiLight = new T.HemisphereLight(opts.ambientColor, opts.bgColorAccent, opts.lightIntensity);
    scene.add(hemiLight);

    var backLight = new T.DirectionalLight(opts.backLightColor, opts.lightIntensity * 0.8);
    backLight.position.set(0, 3, -4);
    scene.add(backLight);

    var keyLight = new T.DirectionalLight(opts.keyLightColor, opts.keyLightIntensity);
    keyLight.position.set(4, 5, 3);
    scene.add(keyLight);

    var fillLight = new T.DirectionalLight(0x4488ff, 2);
    fillLight.position.set(-2, -1, 2);
    scene.add(fillLight);

    // ===== 4. 地面反射 =====
    if (tsl.reflector && tsl.positionWorld && tsl.vec4) {
        try {
            var reflectionTarget = tsl.reflector();
            reflectionTarget.target.rotateX(-Math.PI / 2);
            scene.add(reflectionTarget.target);

            var reflectionMask = tsl.positionWorld.xz.distance(0).mul(0.15).clamp().oneMinus();

            var floorMaterial = new T.NodeMaterial();
            floorMaterial.colorNode = tsl.vec4(reflectionTarget.rgb, reflectionMask);
            floorMaterial.opacity = opts.floorOpacity;
            floorMaterial.transparent = true;

            var floor = new T.Mesh(new T.BoxGeometry(20, 0.001, 20), floorMaterial);
            floor.receiveShadow = true;
            floor.position.set(0, -0.01, 0);
            scene.add(floor);
        } catch (e) { /* ignore */ }
    }

    // ===== 5. 模型与动画状态 =====
    var model = null;
    var mixer = null;
    var action = null;
    var modelLoaded = false;

    // 动画控制参数
    var animSpeed = 1.0;
    var isPlaying = true;
    var isReversed = false;

    // 骨骼映射（用于手动姿态调整）
    var bones = {};
    var boneOrigins = {};

    // 动作状态
    var currentMode = 'play';

    // ===== 6. 加载模型 =====
    function loadModel() {
        if (!FBXLoaderClass || !paths.model) {
            updateStatus('\uD83D\uDD34 加载器或路径无效');
            return;
        }

        updateStatus('\uD83D\uDFE1 加载模型中...');

        var loader = new FBXLoaderClass();
        loader.load(
            paths.model,
            function (fbx) {
                model = fbx;
                model.scale.setScalar(opts.scale);
                scene.add(model);

                // 收集所有骨骼
                collectBones(model);
                saveOriginalRotations();

                // 创建动画混合器
                mixer = new T.AnimationMixer(model);

                if (model.animations && model.animations.length > 0) {
                    // 播放第一个动画
                    action = mixer.clipAction(model.animations[0]);
                    action.play();
                    isPlaying = true;
                    updateStatus('\uD83D\uDFE2 已加载 \u00B7 动画播放中');
                } else {
                    updateStatus('\uD83D\uDFE2 已加载 \u00B7 无内置动画');
                }

                modelLoaded = true;
            },
            undefined,
            function (error) {
                console.error('[Robot] 模型加载失败:', error);
                updateStatus('\uD83D\uDD34 模型加载失败');
            }
        );
    }

    /**
     * 递归收集骨骼节点
     */
    function collectBones(obj) {
        if (!obj) return;
        var name = obj.name || '';
        if (name) {
            var lower = name.toLowerCase();
            if (lower.indexOf('hips') >= 0 || lower.indexOf('hip') >= 0) bones.hip = obj;
            if (lower.indexOf('spine') >= 0) {
                if (!bones.spine) bones.spine = [];
                bones.spine.push(obj);
            }
            if (lower.indexOf('neck') >= 0) bones.neck = obj;
            if (lower.indexOf('head') >= 0) bones.head = obj;
            if (lower.indexOf('leftarm') >= 0 || lower.indexOf('left_arm') >= 0 ||
                (lower.indexOf('left') >= 0 && lower.indexOf('upper') >= 0 && lower.indexOf('arm') >= 0))
                bones.leftUpperArm = obj;
            if (lower.indexOf('leftforearm') >= 0 || lower.indexOf('left_forearm') >= 0 ||
                (lower.indexOf('left') >= 0 && lower.indexOf('forearm') >= 0))
                bones.leftForearm = obj;
            if (lower.indexOf('lefthand') >= 0) bones.leftHand = obj;
            if (lower.indexOf('rightarm') >= 0 || lower.indexOf('right_arm') >= 0 ||
                (lower.indexOf('right') >= 0 && lower.indexOf('upper') >= 0 && lower.indexOf('arm') >= 0))
                bones.rightUpperArm = obj;
            if (lower.indexOf('rightforearm') >= 0 || lower.indexOf('right_forearm') >= 0 ||
                (lower.indexOf('right') >= 0 && lower.indexOf('forearm') >= 0))
                bones.rightForearm = obj;
            if (lower.indexOf('righthand') >= 0) bones.rightHand = obj;
            if (lower.indexOf('leftupleg') >= 0 || lower.indexOf('left_up_leg') >= 0 ||
                (lower.indexOf('left') >= 0 && lower.indexOf('upleg') >= 0))
                bones.leftUpperLeg = obj;
            if (lower.indexOf('leftleg') >= 0 || lower.indexOf('left_leg') >= 0 ||
                (lower.indexOf('left') >= 0 && lower.indexOf('lowerleg') >= 0))
                bones.leftLowerLeg = obj;
            if (lower.indexOf('rightupleg') >= 0 || lower.indexOf('right_up_leg') >= 0 ||
                (lower.indexOf('right') >= 0 && lower.indexOf('upleg') >= 0))
                bones.rightUpperLeg = obj;
            if (lower.indexOf('rightleg') >= 0 || lower.indexOf('right_leg') >= 0 ||
                (lower.indexOf('right') >= 0 && lower.indexOf('lowerleg') >= 0))
                bones.rightLowerLeg = obj;
        }
        if (obj.children) {
            for (var i = 0; i < obj.children.length; i++) {
                collectBones(obj.children[i]);
            }
        }
    }

    function saveOriginalRotations() {
        Object.keys(bones).forEach(function (key) {
            var b = bones[key];
            if (Array.isArray(b)) {
                boneOrigins[key] = b.map(function (bone) {
                    return bone.rotation.clone();
                });
            } else if (b) {
                boneOrigins[key] = b.rotation.clone();
            }
        });
    }

    // ===== 7. 控制函数 =====
    function togglePlay() {
        if (!action) return;
        isPlaying = !isPlaying;
        if (isPlaying) {
            action.paused = false;
            updateStatus('\u25B6\uFE0F 继续播放');
            document.querySelector('[data-action="walk"]').classList.add('active');
        } else {
            action.paused = true;
            updateStatus('\u23F8\uFE0F 已暂停');
            document.querySelector('[data-action="walk"]').classList.remove('active');
        }
    }

    function speedUp() {
        if (!action) return;
        animSpeed = Math.min(animSpeed + 0.5, 5.0);
        action.setEffectiveTimeScale(animSpeed * (isReversed ? -1 : 1));
        updateStatus('\u23E9 速度: ' + animSpeed.toFixed(1) + 'x');
    }

    function slowDown() {
        if (!action) return;
        animSpeed = Math.max(animSpeed - 0.5, 0.2);
        action.setEffectiveTimeScale(animSpeed * (isReversed ? -1 : 1));
        updateStatus('\u23EA 速度: ' + animSpeed.toFixed(1) + 'x');
    }

    function toggleReverse() {
        if (!action) return;
        isReversed = !isReversed;
        action.setEffectiveTimeScale(animSpeed * (isReversed ? -1 : 1));
        updateStatus(isReversed ? '\uD83D\uDD03 倒放中' : '\uD83D\uDD03 正放中');
    }

    function applyTPose() {
        currentMode = 'pose1';
        if (action) { action.paused = true; isPlaying = false; }
        document.querySelector('[data-action="walk"]').classList.remove('active');

        var lArm = bones.leftUpperArm;
        var rArm = bones.rightUpperArm;
        var lFore = bones.leftForearm;
        var rFore = bones.rightForearm;

        if (lArm) { lArm.rotation.x = 0; lArm.rotation.z = 0.3; lArm.rotation.y = 0; }
        if (rArm) { rArm.rotation.x = 0; rArm.rotation.z = -0.3; rArm.rotation.y = 0; }
        if (lFore) { lFore.rotation.x = 0; lFore.rotation.z = 0; }
        if (rFore) { rFore.rotation.x = 0; rFore.rotation.z = 0; }

        updateStatus('\u2716 T-Pose 姿态');
    }

    function applySpreadWings() {
        currentMode = 'pose2';
        if (action) { action.paused = true; isPlaying = false; }
        document.querySelector('[data-action="walk"]').classList.remove('active');

        var lArm = bones.leftUpperArm;
        var rArm = bones.rightUpperArm;
        var lFore = bones.leftForearm;
        var rFore = bones.rightForearm;
        var head = bones.head;
        var lLeg = bones.leftUpperLeg;
        var rLeg = bones.rightUpperLeg;

        if (lArm) { lArm.rotation.x = -0.5; lArm.rotation.z = 0.8; lArm.rotation.y = -0.3; }
        if (rArm) { rArm.rotation.x = -0.5; rArm.rotation.z = -0.8; rArm.rotation.y = 0.3; }
        if (lFore) { lFore.rotation.x = -1.2; lFore.rotation.z = 0.2; }
        if (rFore) { rFore.rotation.x = -1.2; rFore.rotation.z = -0.2; }
        if (head) { head.rotation.x = -0.2; }
        if (lLeg) { lLeg.rotation.x = -0.3; lLeg.rotation.z = 0.4; }
        if (rLeg) { rLeg.rotation.x = 0; rLeg.rotation.z = 0; }

        updateStatus('\uD83E\uDD85 大鹏展翅');
    }

    function resetAll() {
        currentMode = 'play';

        Object.keys(bones).forEach(function (key) {
            var b = bones[key];
            var orig = boneOrigins[key];
            if (Array.isArray(b) && Array.isArray(orig)) {
                for (var i = 0; i < Math.min(b.length, orig.length); i++) {
                    b[i].rotation.copy(orig[i]);
                }
            } else if (b && orig) {
                b.rotation.copy(orig);
            }
        });

        if (model) {
            model.rotation.set(0, 0, 0);
            model.position.set(0, 0, 0);
        }

        animSpeed = 1.0;
        isReversed = false;

        if (action) {
            action.reset();
            action.setEffectiveTimeScale(1.0);
            action.paused = false;
            isPlaying = true;
            action.time = 0;
        }

        document.querySelectorAll('.robot-btn').forEach(function (b) { b.classList.remove('active'); });
        document.querySelector('[data-action="walk"]').classList.add('active');

        updateStatus('\u23F9 已重置 \u00B7 动画从头播放');
    }

    // ===== 8. 执行操作 =====
    function performAction(actionName) {
        if (!modelLoaded) {
            updateStatus('\u26A0\uFE0F 模型尚未加载完成');
            return;
        }

        switch (actionName) {
            case 'walk':
                if (currentMode === 'play' && isPlaying) {
                    togglePlay();
                } else {
                    if (currentMode !== 'play') { resetAll(); currentMode = 'play'; }
                    else { togglePlay(); }
                }
                break;
            case 'speedUp':
                if (currentMode !== 'play') { resetAll(); currentMode = 'play'; }
                speedUp();
                break;
            case 'slowDown':
                if (currentMode !== 'play') { resetAll(); currentMode = 'play'; }
                slowDown();
                break;
            case 'reverse':
                if (currentMode !== 'play') { resetAll(); currentMode = 'play'; }
                toggleReverse();
                break;
            case 'pose1':
                applyTPose();
                break;
            case 'pose2':
                applySpreadWings();
                break;
            case 'reset':
                resetAll();
                break;
        }

        document.querySelectorAll('.robot-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.action === actionName);
        });
    }

    // ===== 9. 状态更新 =====
    function updateStatus(text) {
        var el = document.getElementById('status-text');
        if (el) el.textContent = text;
    }

    // ===== 10. 渲染器 =====
    var renderer = null;
    var animationFrameId = null;
    if (T.WebGPURenderer) {
        renderer = new T.WebGPURenderer({ antialias: true });
    } else {
        renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    }
    if (renderer.toneMapping !== undefined) {
        renderer.toneMapping = T.NeutralToneMapping || T.LinearToneMapping;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // ===== 11. 控制器 =====
    var controls = createRobotControls(camera, renderer.domElement);

    // ===== 12. 窗口自适应 =====
    function onResize() {
        var w = container.clientWidth;
        var h = container.clientHeight || 500;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (renderer) renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    // ===== 13. 按钮事件绑定 =====
    function setupControls() {
        document.querySelectorAll('.robot-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                performAction(this.dataset.action);
            });
            btn.addEventListener('touchstart', function (e) {
                e.preventDefault();
                performAction(this.dataset.action);
            });
        });
        // 初始高亮
        var walkBtn = document.querySelector('[data-action="walk"]');
        if (walkBtn) walkBtn.classList.add('active');
    }

    // ===== 14. 动画循环 =====
    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        var delta = clock.getDelta();

        if (modelLoaded) {
            if (model && currentMode === 'play') {
                var floatOffset = Math.sin(clock.elapsedTime * opts.floatSpeed) * opts.floatAmplitude;
                model.position.y = floatOffset;
            }
            if (mixer) {
                mixer.update(delta);
            }
        }

        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    // ===== 15. 启动 =====
    loadModel();
    setTimeout(setupControls, 100);
    animate();

    // ===== 16. 公共 API =====
    return {
        getSceneRefs: function () {
            return { scene: scene, camera: camera, renderer: renderer, controls: controls };
        },
        performAction: function (actionName) {
            performAction(actionName);
        },
        dispose: function () {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            window.removeEventListener('resize', onResize);

            if (mixer) { mixer.stopAllAction(); mixer = null; }
            if (model) {
                scene.remove(model);
                disposeRobotObject(model);
                model = null;
            }
            if (controls && controls.dispose) controls.dispose();
            if (renderer) {
                renderer.dispose();
                if (renderer.domElement && renderer.domElement.parentNode) {
                    renderer.domElement.parentNode.removeChild(renderer.domElement);
                }
                renderer = null;
            }
            scene = null;
            camera = null;
        }
    };
}

function disposeRobotObject(obj) {
    if (!obj) return;
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
        if (Array.isArray(obj.material)) {
            for (var i = 0; i < obj.material.length; i++) {
                obj.material[i].dispose();
            }
        } else {
            obj.material.dispose();
        }
    }
    if (obj.children) {
        for (var i = 0; i < obj.children.length; i++) {
            disposeRobotObject(obj.children[i]);
        }
    }
}

/**
 * 创建简易轨迹球控制器
 */
function createRobotControls(camera, domElement) {
    var isDragging = false;
    var prev = { x: 0, y: 0 };
    var target = { x: 0, y: 1, z: 0 };

    var dx = camera.position.x - target.x;
    var dy = camera.position.y - target.y;
    var dz = camera.position.z - target.z;
    var radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
    var theta = Math.atan2(dx, dz);
    var phi = Math.acos(Math.max(-1, Math.min(1, dy / radius)));

    function updateCamera() {
        var sinPhi = Math.sin(phi);
        camera.position.x = target.x + sinPhi * radius * Math.sin(theta);
        camera.position.y = target.y + Math.cos(phi) * radius;
        camera.position.z = target.z + sinPhi * radius * Math.cos(theta);
        camera.lookAt(target.x, target.y, target.z);
    }
    updateCamera();

    function onMouseDown(e) { isDragging = true; prev = { x: e.clientX, y: e.clientY }; }
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
        radius = Math.max(1.5, Math.min(8, radius * (e.deltaY > 0 ? 1.1 : 0.9)));
        updateCamera();
    }

    var lastTouch = { x: 0, y: 0 };
    var lastDist = 0;
    function onTouchStart(e) {
        if (e.touches.length === 1) {
            isDragging = true;
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            var ddx = e.touches[0].clientX - e.touches[1].clientX;
            var ddy = e.touches[0].clientY - e.touches[1].clientY;
            lastDist = Math.sqrt(ddx * ddx + ddy * ddy);
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
            var ddx = e.touches[0].clientX - e.touches[1].clientX;
            var ddy = e.touches[0].clientY - e.touches[1].clientY;
            var dist = Math.sqrt(ddx * ddx + ddy * ddy);
            radius = Math.max(1.5, Math.min(8, radius * (lastDist / dist)));
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
        dispose: function () {
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
