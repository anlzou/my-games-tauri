/**
 * =====================================================================
 * 骨骼动画模型加载器（skinning.js）
 * =====================================================================
 * 加载 GLTF/GLB 骨骼动画模型，支持交互式切换不同模型。
 *
 * 功能特性：
 *   - 加载带骨骼动画的 GLB 模型并播放动画
 *   - 支持通过 API 切换不同 GLB 模型
 *   - 简易轨迹球控制器（拖拽旋转 / 滚轮缩放 / 触摸）
 *   - WebGPU + WebGL 双模式兼容
 *   - TSL 着色器渐变背景
 *
 * 使用方式：
 *   1. 页面中先设置 importmap 并 import Three.js 依赖
 *   2. 将依赖注入到 window.__SKINNING_DEPS__
 *   3. 用 <script> 加载本文件
 *   4. 调用 initSkinning(containerId, modelConfig, options)
 *
 *   // 示例：
 *   window.__SKINNING_DEPS__ = { THREE, GLTFLoader };
 *   window.__TSL__ = { color, screenUV, vec2, vec4, reflector, positionWorld };
 *   const viewer = initSkinning('three-container', {
 *       path: '../assets/models/gltf/Michelle.glb',
 *       scale: 1,
 *       autoPlay: true
 *   });
 * =====================================================================
 */

/**
 * 初始化骨骼动画模型
 * --------------------
 * @param {string} containerId - 挂载渲染器画布的 DOM 元素 ID
 * @param {string|object} modelConfig - 模型路径（字符串）或配置对象
 *        { path: string, scale?: number, autoPlay?: boolean, animationIndex?: number }
 * @param {object} [options] - 可选配置项
 * @param {number} [options.camPosX=0] - 相机初始 X
 * @param {number} [options.camPosY=1.5] - 相机初始 Y
 * @param {number} [options.camPosZ=4] - 相机初始 Z
 * @param {number} [options.fov=50] - 相机视野
 * @param {number} [options.bgColorTop=0x13172b] - TSL 渐变顶部颜色
 * @param {number} [options.bgColorMid=0x311649] - TSL 渐变中间颜色
 * @param {number} [options.bgColorAccent=0x0c5d68] - TSL 强调色
 * @param {number} [options.ambientColor=0x311649] - 环境光颜色
 * @param {number} [options.backLightColor=0xffffff] - 背光颜色
 * @param {number} [options.keyLightColor=0xfff9ea] - 主光颜色
 * @param {number} [options.keyLightIntensity=4] - 主光强度
 * @param {number} [options.lightIntensity=10] - 半球光强度
 * @param {number} [options.floorOpacity=0.2] - 地板透明度
 * @param {Function} [options.onLoad] - 模型加载完成回调 (gltf, object) => {}
 * @param {Function} [options.onProgress] - 加载进度回调 (xhr) => {}
 * @param {Function} [options.onError] - 加载失败回调 (error) => {}
 * @returns {object|null} { loadModel, playAnimation, getAnimations, getSceneRefs, dispose }
 */
function initSkinning(containerId, modelConfig, options) {
    var container = document.getElementById(containerId);
    if (!container) {
        console.warn('[Skinning] 容器元素未找到:', containerId);
        return null;
    }
    container.innerHTML = '';

    // 合并选项
    var opts = Object.assign({
        camPosX: 0,
        camPosY: 3,
        camPosZ: 5,
        fov: 40,
        ambientColor: 0x311649,
        bgColorTop: 0x13172b,
        bgColorMid: 0x311649,
        bgColorAccent: 0x0c5d68,
        backLightColor: 0xffffff,
        keyLightColor: 0xfff9ea,
        keyLightIntensity: 4,
        lightIntensity: 10,
        floorOpacity: 0.2,
    }, options);

    // 解析模型配置
    var modelPath = '';
    var autoPlay = true;
    var animationIndex = 0;
    var scale = 1;

    if (typeof modelConfig === 'string') {
        modelPath = modelConfig;
    } else if (modelConfig && typeof modelConfig === 'object') {
        modelPath = modelConfig.path || modelConfig.model || '';
        autoPlay = modelConfig.autoPlay !== undefined ? modelConfig.autoPlay : true;
        animationIndex = modelConfig.animationIndex || 0;
        scale = modelConfig.scale || 1;
    }

    if (!modelPath) {
        console.warn('[Skinning] 未指定模型路径');
        return null;
    }

    // 获取 Three.js 依赖
    var deps = window.__SKINNING_DEPS__ || {};
    var T = deps.THREE || window.THREE;
    var GLTFLoaderClass = deps.GLTFLoader || (T && T.GLTFLoader instanceof Function ? T.GLTFLoader : null);

    if (!T) {
        console.error('[Skinning] Three.js 未加载，请通过 window.__SKINNING_DEPS__ 注入');
        return null;
    }

    // TSL 着色器工具
    var tsl = window.__TSL__ || {};

    // ----- 1. 场景 -----
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

    // ----- 2. 相机 -----
    var camera = new T.PerspectiveCamera(
        opts.fov,
        container.clientWidth / container.clientHeight,
        0.01,
        100
    );
    camera.position.set(opts.camPosX, opts.camPosY, opts.camPosZ);

    // ----- 3. 时钟 -----
    var clock = new T.Clock();

    // ----- 4. 光照（与 retargeting_readyplayer 一致） -----
    var hemiLight = new T.HemisphereLight(opts.ambientColor, opts.bgColorAccent, opts.lightIntensity);
    scene.add(hemiLight);

    var backLight = new T.DirectionalLight(opts.backLightColor, opts.lightIntensity);
    backLight.position.set(0, 5, -5);
    scene.add(backLight);

    var keyLight = new T.DirectionalLight(opts.keyLightColor, opts.keyLightIntensity);
    keyLight.position.set(3, 5, 3);
    scene.add(keyLight);

    // ----- 4.5 地面反射 -----
    var reflectionTarget = null;
    if (tsl.reflector && tsl.positionWorld && tsl.vec4) {
        try {
            reflectionTarget = tsl.reflector();
            reflectionTarget.target.rotateX(-Math.PI / 2);
            scene.add(reflectionTarget.target);

            var reflectionMask = tsl.positionWorld.xz.distance(0).mul(0.1).clamp().oneMinus();

            var floorMaterial = new T.NodeMaterial();
            floorMaterial.colorNode = tsl.vec4(reflectionTarget.rgb, reflectionMask);
            floorMaterial.opacity = opts.floorOpacity;
            floorMaterial.transparent = true;

            var floor = new T.Mesh(new T.BoxGeometry(50, 0.001, 50), floorMaterial);
            floor.receiveShadow = true;
            floor.position.set(0, 0, 0);
            scene.add(floor);
        } catch (e) {
            // 反射创建失败，忽略
        }
    }

    // ----- 5. 渲染器 -----
    var renderer;
    if (T.WebGPURenderer) {
        renderer = new T.WebGPURenderer({ antialias: true });
    } else {
        renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    if (renderer.toneMapping !== undefined) {
        renderer.toneMapping = T.NeutralToneMapping || T.LinearToneMapping;
    }
    container.appendChild(renderer.domElement);

    // ----- 6. 简易轨道控制器（不依赖 THREE 全局变量） -----
    var controls = createSkinningControls(camera, renderer.domElement);

    // ----- 7. 模型管理 -----
    var currentObject = null;
    var mixer = null;
    var actions = [];

    function disposeObject(obj) {
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
                disposeObject(obj.children[i]);
            }
        }
    }

    function loadModel(path) {
        // 移除旧模型
        if (currentObject) {
            if (mixer) { mixer.stopAllAction(); mixer = null; }
            scene.remove(currentObject);
            disposeObject(currentObject);
            currentObject = null;
            actions = [];
        }

        var loader = GLTFLoaderClass ? new GLTFLoaderClass() : null;
        if (!loader) {
            console.error('[Skinning] GLTFLoader 不可用');
            return;
        }

        loader.load(
            path,
            function (gltf) {
                var object = gltf.scene;
                if (scale !== 1) {
                    object.scale.set(scale, scale, scale);
                }
                currentObject = object;
                scene.add(object);

                mixer = new T.AnimationMixer(object);
                actions = [];

                if (gltf.animations && gltf.animations.length > 0) {
                    for (var i = 0; i < gltf.animations.length; i++) {
                        actions.push(mixer.clipAction(gltf.animations[i]));
                    }
                    var idx = Math.min(animationIndex, actions.length - 1);
                    if (autoPlay && actions[idx]) {
                        actions[idx].play();
                    }
                }

                if (typeof opts.onLoad === 'function') {
                    opts.onLoad(gltf, object);
                }
            },
            function (xhr) {
                if (typeof opts.onProgress === 'function') {
                    opts.onProgress(xhr);
                }
            },
            function (error) {
                console.error('[Skinning] 模型加载失败:', error);
                if (typeof opts.onError === 'function') {
                    opts.onError(error);
                }
            }
        );
    }

    loadModel(modelPath);

    // ----- 8. 窗口自适应 -----
    function onResize() {
        var w = container.clientWidth;
        var h = container.clientHeight || 500;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    // ----- 9. 动画循环 -----
    var animationFrameId = null;

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        var delta = clock.getDelta();
        if (mixer) mixer.update(delta);
        renderer.render(scene, camera);
    }
    animate();

    // ----- 10. 返回公共 API -----
    return {
        /**
         * 切换加载新模型
         * @param {string|object} newConfig - 模型路径或配置 { path, scale, autoPlay, animationIndex }
         */
        loadModel: function (newConfig) {
            var path = '';
            if (typeof newConfig === 'string') {
                path = newConfig;
            } else if (newConfig && typeof newConfig === 'object') {
                path = newConfig.path || newConfig.model || '';
                if (newConfig.scale !== undefined) scale = newConfig.scale;
                if (newConfig.animationIndex !== undefined) animationIndex = newConfig.animationIndex;
                if (newConfig.autoPlay !== undefined) autoPlay = newConfig.autoPlay;
            }
            if (path) loadModel(path);
        },

        /**
         * 播放指定索引的动画
         * @param {number} index - 动画索引
         */
        playAnimation: function (index) {
            if (!actions.length) return;
            for (var i = 0; i < actions.length; i++) {
                actions[i].stop();
            }
            var idx = Math.min(index, actions.length - 1);
            if (actions[idx]) actions[idx].play();
        },

        /**
         * 获取当前动画列表
         * @returns {Array}
         */
        getAnimations: function () {
            return actions.slice();
        },

        /**
         * 获取场景引用
         * @returns {object} { scene, camera, renderer, controls }
         */
        getSceneRefs: function () {
            return { scene: scene, camera: camera, renderer: renderer, controls: controls, reflectionTarget: reflectionTarget };
        },

        /**
         * 清理资源
         */
        dispose: function () {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            window.removeEventListener('resize', onResize);
            if (mixer) { mixer.stopAllAction(); mixer = null; }
            if (currentObject) {
                scene.remove(currentObject);
                disposeObject(currentObject);
                currentObject = null;
            }
            if (reflectionTarget && reflectionTarget.target) {
                scene.remove(reflectionTarget.target);
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
            controls = null;
            actions = [];
        }
    };
}

/**
 * 创建简易轨迹球控制器（不依赖任何全局变量，纯数学计算）
 * @param {THREE.Camera} camera
 * @param {HTMLElement} domElement
 * @returns {object} { dispose }
 */
function createSkinningControls(camera, domElement) {
    var isDragging = false;
    var prev = { x: 0, y: 0 };
    var target = { x: 0, y: 1, z: 0 };

    // 球坐标计算
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
        radius = Math.max(1, Math.min(20, radius * (e.deltaY > 0 ? 1.1 : 0.9)));
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
        dispose: function dispose() {
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
