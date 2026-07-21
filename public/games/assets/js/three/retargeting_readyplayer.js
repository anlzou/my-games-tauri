/**
 * =====================================================================
 * 动画重定向 - ReadyPlayer.me 模型加载器（retargeting_readyplayer.js）
 * =====================================================================
 * 加载 Mixamo FBX 动画并重定向到 ReadyPlayer.me GLB 模型上播放。
 *
 * 功能特性：
 *   - 同时加载 Mixamo（FBX）和 ReadyPlayer.me（GLB）两个模型
 *   - 使用 SkeletonUtils.retargetClip() 将 Mixamo 动画重定向到 RP 模型
 *   - 地面反射效果（TSL reflector）
 *   - 简易轨迹球控制器（拖拽旋转 / 滚轮缩放 / 触摸）
 *   - WebGPU 渲染
 *   - TSL 着色器渐变背景
 *
 * 使用方式：
 *   1. 页面中先设置 importmap 并 import Three.js 依赖
 *   2. 将依赖注入到 window.__RETARGETING_DEPS__
 *   3. 用 <script> 加载本文件
 *   4. 调用 initRetargeting(containerId, modelPaths, options)
 *
 *   // 示例：
 *   window.__RETARGETING_DEPS__ = { THREE, GLTFLoader, FBXLoader, SkeletonUtils };
 *   window.__TSL__ = { screenUV, color, vec2, vec4, reflector, positionWorld };
 *   const viewer = initRetargeting('three-container', {
 *       mixamo: '../assets/models/fbx/mixamo.fbx',
 *       readyPlayerMe: '../assets/models/gltf/readyplayer.me.glb'
 *   });
 * =====================================================================
 */

/**
 * 初始化动画重定向展示
 * --------------------
 * @param {string} containerId - 挂载渲染器画布的 DOM 元素 ID
 * @param {object} modelPaths - 模型路径配置
 *        { mixamo: string, readyPlayerMe: string }
 * @param {object} [options] - 可选配置项
 * @param {number} [options.scale=0.01] - Mixamo 模型缩放（厘米转米）
 * @param {number} [options.camPosX=0] - 相机初始 X
 * @param {number} [options.camPosY=3] - 相机初始 Y
 * @param {number} [options.camPosZ=5] - 相机初始 Z
 * @param {number} [options.fov=40] - 相机视野
 * @param {number} [options.hipInfluenceX=1] - 髋关节 X 影响度
 * @param {number} [options.hipInfluenceY=1] - 髋关节 Y 影响度
 * @param {number} [options.hipInfluenceZ=1] - 髋关节 Z 影响度
 * @param {string} [options.hipBone='mixamorigHips'] - 源骨骼的骨盆骨名称
 * @param {number} [options.floorOpacity=0.2] - 地板透明度
 * @param {number} [options.lightIntensity=10] - 光照强度
 * @param {number} [options.bgColorTop=0x13172b] - TSL 渐变顶部颜色
 * @param {number} [options.bgColorMid=0x311649] - TSL 渐变中间颜色
 * @param {number} [options.bgColorAccent=0x0c5d68] - TSL 强调色
 * @param {number} [options.ambientColor=0x311649] - 环境光颜色
 * @param {number} [options.backLightColor=0xffffff] - 背光颜色
 * @param {number} [options.keyLightColor=0xfff9ea] - 主光颜色
 * @param {number} [options.keyLightIntensity=4] - 主光强度
 * @param {Function} [options.onLoad] - 全部模型加载完成回调 () => {}
 * @param {Function} [options.onProgress] - 加载进度回调 (percent) => {}
 * @param {Function} [options.onError] - 加载失败回调 (error) => {}
 * @returns {object|null} { dispose }
 */
function initRetargeting(containerId, modelPaths, options) {
    var container = document.getElementById(containerId);
    if (!container) {
        console.warn('[Retargeting] 容器元素未找到:', containerId);
        return null;
    }
    container.innerHTML = '';

    // 合并选项
    var opts = Object.assign({
        scale: 0.01,
        camPosX: 0,
        camPosY: 3,
        camPosZ: 5,
        fov: 40,
        hipInfluenceX: 1,
        hipInfluenceY: 1,
        hipInfluenceZ: 1,
        hipBone: 'mixamorigHips',
        floorOpacity: 0.2,
        lightIntensity: 10,
        bgColorTop: 0x13172b,
        bgColorMid: 0x311649,
        bgColorAccent: 0x0c5d68,
        ambientColor: 0x311649,
        backLightColor: 0xffffff,
        keyLightColor: 0xfff9ea,
        keyLightIntensity: 4,
    }, options);

    // 获取依赖
    var deps = window.__RETARGETING_DEPS__ || {};
    var T = deps.THREE || window.THREE;
    var GLTFLoaderClass = deps.GLTFLoader;
    var FBXLoaderClass = deps.FBXLoader;
    var SkeletonUtilsObj = deps.SkeletonUtils;

    if (!T) {
        console.error('[Retargeting] Three.js 未加载');
        return null;
    }

    // TSL 着色器工具
    var tsl = window.__TSL__ || {};

    // 时钟
    var clock = new T.Clock();

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
        0.25,
        50
    );
    camera.position.set(opts.camPosX, opts.camPosY, opts.camPosZ);

    // ----- 3. 光照 -----
    var hemiLight = new T.HemisphereLight(opts.ambientColor, opts.bgColorAccent, opts.lightIntensity);
    scene.add(hemiLight);

    var backLight = new T.DirectionalLight(opts.backLightColor, opts.lightIntensity);
    backLight.position.set(0, 5, -5);
    scene.add(backLight);

    var keyLight = new T.DirectionalLight(opts.keyLightColor, opts.keyLightIntensity);
    keyLight.position.set(3, 5, 3);
    scene.add(keyLight);

    // ----- 4. 地面反射 -----
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

    // ----- 5. 模型管理 -----
    var sourceModelObj = null;
    var targetModelObj = null;
    var sourceMixer = null;
    var retargetMixer = null;
    var loadedCount = 0;
    var totalModels = 2;

    function onModelLoaded() {
        loadedCount++;
        if (typeof opts.onProgress === 'function') {
            opts.onProgress(loadedCount / totalModels * 100);
        }
        if (loadedCount >= totalModels) {
            // 两个模型都加载完成，执行重定向
            doRetarget();
            if (typeof opts.onLoad === 'function') {
                opts.onLoad();
            }
        }
    }

    function doRetarget() {
        if (!sourceModelObj || !targetModelObj) return;

        // 重新定位模型
        sourceModelObj.position.x -= 0.9;
        targetModelObj.scene.position.x += 0.9;

        // Mixamo 使用厘米，缩放 0.01 转换为米
        sourceModelObj.scale.setScalar(opts.scale);

        // 获取源骨骼数据
        var sourceData = getSource(sourceModelObj);

        // 执行重定向
        var retargetMixerLocal = retargetModel(sourceData, targetModelObj);
        retargetMixer = retargetMixerLocal;

        sourceMixer = sourceData.mixer;
    }

    function getSource(sourceModel) {
        var clip = sourceModel.animations[0];
        var helper = new T.SkeletonHelper(sourceModel);
        var skeleton = new T.Skeleton(helper.bones);

        var mixer = new T.AnimationMixer(sourceModel);
        mixer.clipAction(sourceModel.animations[0]).play();

        return { clip: clip, skeleton: skeleton, mixer: mixer };
    }

    function retargetModel(sourceModelData, targetModel) {
        var targetSkin = targetModel.scene.children[0].children[1];

        var retargetOptions = {
            hip: opts.hipBone,
            scale: opts.scale,
            hipInfluence: new T.Vector3(opts.hipInfluenceX, opts.hipInfluenceY, opts.hipInfluenceZ),
            getBoneName: function (bone) {
                return 'mixamorig' + bone.name;
            }
        };

        var retargetedClip = SkeletonUtilsObj.retargetClip(
            targetSkin,
            sourceModelData.skeleton,
            sourceModelData.clip,
            retargetOptions
        );

        var mixer = new T.AnimationMixer(targetSkin);
        mixer.clipAction(retargetedClip).play();

        return mixer;
    }

    // 加载 Mixamo FBX 模型
    if (FBXLoaderClass && modelPaths.mixamo) {
        var fbxLoader = new FBXLoaderClass();
        fbxLoader.load(
            modelPaths.mixamo,
            function (object) {
                sourceModelObj = object;
                scene.add(object);
                onModelLoaded();
            },
            undefined,
            function (error) {
                console.error('[Retargeting] Mixamo 模型加载失败:', error);
                if (typeof opts.onError === 'function') opts.onError(error);
            }
        );
    } else {
        console.warn('[Retargeting] FBXLoader 不可用或未指定 Mixamo 路径');
        totalModels--;
        if (totalModels <= 0) onModelLoaded();
    }

    // 加载 ReadyPlayer.me GLB 模型
    if (GLTFLoaderClass && modelPaths.readyPlayerMe) {
        var gltfLoader = new GLTFLoaderClass();
        gltfLoader.load(
            modelPaths.readyPlayerMe,
            function (gltf) {
                targetModelObj = gltf;
                scene.add(gltf.scene);
                onModelLoaded();
            },
            undefined,
            function (error) {
                console.error('[Retargeting] ReadyPlayer.me 模型加载失败:', error);
                if (typeof opts.onError === 'function') opts.onError(error);
            }
        );
    } else {
        console.warn('[Retargeting] GLTFLoader 不可用或未指定 ReadyPlayer.me 路径');
        totalModels--;
        if (totalModels <= 0) onModelLoaded();
    }

    // ----- 6. 渲染器 -----
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

    // 创建简易轨道控制器
    var controls = createRetargetingControls(camera, renderer.domElement);

    // ----- 8. 窗口自适应 -----
    function onResize() {
        var w = container.clientWidth;
        var h = container.clientHeight || 500;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (renderer) renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    // ----- 9. 动画循环 -----
    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        var delta = clock.getDelta();

        if (sourceMixer) sourceMixer.update(delta);
        if (retargetMixer) retargetMixer.update(delta);

        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }
    animate();

    // ----- 10. 返回公共 API -----
    return {
        /**
         * 获取当前场景引用
         * @returns {object} { scene, camera, renderer, controls }
         */
        getSceneRefs: function () {
            return { scene: scene, camera: camera, renderer: renderer, controls: controls };
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

            if (sourceMixer) { sourceMixer.stopAllAction(); sourceMixer = null; }
            if (retargetMixer) { retargetMixer.stopAllAction(); retargetMixer = null; }

            if (sourceModelObj) {
                scene.remove(sourceModelObj);
                disposeRetargetObject(sourceModelObj);
                sourceModelObj = null;
            }
            if (targetModelObj) {
                scene.remove(targetModelObj.scene);
                disposeRetargetObject(targetModelObj.scene);
                targetModelObj = null;
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
        }
    };
}

/**
 * 递归清理 Three.js 对象
 */
function disposeRetargetObject(obj) {
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
            disposeRetargetObject(obj.children[i]);
        }
    }
}

/**
 * 创建简易轨迹球控制器（不依赖任何全局变量，纯数学计算）
 */
function createRetargetingControls(camera, domElement) {
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
        radius = Math.max(2, Math.min(12, radius * (e.deltaY > 0 ? 1.1 : 0.9)));
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
            radius = Math.max(2, Math.min(12, radius * (lastDist / dist)));
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
