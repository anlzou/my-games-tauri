/**
 * =====================================================================
 * GLTF/AVIF 模型加载器（gltf_avif.js）
 * =====================================================================
 * 加载 GLTF/GLB 模型并展示 AVIF 纹理支持。
 * 模型自动居中（计算包围盒偏移到原点）。
 *
 * 功能特性：
 *   - 加载 GLB 模型（带 Draco 压缩支持）
 *   - 模型自动居中展示
 *   - 简易轨道控制器（拖拽旋转 / 滚轮缩放 / 触摸）
 *   - 窗口自适应
 *
 * 使用方式：
 *   1. 页面中设置 importmap 并 import Three.js 依赖
 *   2. 将依赖注入到 window.__GLTF_AVIF_DEPS__
 *   3. 用 <script> 加载本文件
 *   4. 调用 initGltfAvif(containerId, modelConfig, options)
 *
 *   // 示例：
 *   window.__GLTF_AVIF_DEPS__ = { THREE, GLTFLoader, DRACOLoader };
 *   const viewer = initGltfAvif('three-container', {
 *       path: '../assets/models/gltf/forest_house.glb',
 *       scale: 1
 *   }, {
 *       camPos: { x: 1.5, y: 2, z: 6 },
 *       bgColor: 0xf6eedc
 *   });
 * =====================================================================
 */

/**
 * 初始化 GLTF/AVIF 模型展示
 * ----------------------------
 * @param {string} containerId - 挂载渲染器画布的 DOM 元素 ID
 * @param {string|object} modelConfig - 模型路径（字符串）或配置对象
 *        { path: string, scale?: number }
 * @param {object} [options] - 可选配置项
 * @param {object} [options.camPos] - 相机初始位置 { x, y, z }
 * @param {number} [options.camPos.x=1.5] - 相机初始 X
 * @param {number} [options.camPos.y=2] - 相机初始 Y
 * @param {number} [options.camPos.z=6] - 相机初始 Z
 * @param {number} [options.fov=45] - 相机视野
 * @param {number} [options.bgColor=0xf6eedc] - 背景色
 * @param {Function} [options.onLoad] - 模型加载完成回调 (gltf, object) => {}
 * @param {Function} [options.onProgress] - 加载进度回调 (xhr) => {}
 * @param {Function} [options.onError] - 加载失败回调 (error) => {}
 * @returns {object|null} { getSceneRefs, getObject, loadModel, dispose }
 */
function initGltfAvif(containerId, modelConfig, options) {
    var container = document.getElementById(containerId);
    if (!container) {
        console.warn('[GltfAvif] 容器元素未找到:', containerId);
        return null;
    }
    container.innerHTML = '';

    // 合并选项
    var opts = Object.assign({
        camPos: { x: 1.5, y: 2, z: 6 },
        fov: 45,
        bgColor: 0xf6eedc
    }, options);

    // 解析模型配置
    var modelPath = '';
    var scale = 1;
    if (typeof modelConfig === 'string') {
        modelPath = modelConfig;
    } else if (modelConfig && typeof modelConfig === 'object') {
        modelPath = modelConfig.path || modelConfig.model || '';
        scale = modelConfig.scale || 1;
    }
    if (!modelPath) {
        console.warn('[GltfAvif] 未指定模型路径');
        return null;
    }

    // 获取 Three.js 依赖
    var deps = window.__GLTF_AVIF_DEPS__ || {};
    var T = deps.THREE || window.THREE;
    var GLTFLoaderClass = deps.GLTFLoader || null;
    var DRACOLoaderClass = deps.DRACOLoader || null;

    if (!T) {
        console.error('[GltfAvif] Three.js 未加载，请通过 window.__GLTF_AVIF_DEPS__ 注入');
        return null;
    }

    // ----- 1. 场景 -----
    var scene = new T.Scene();
    scene.background = new T.Color(opts.bgColor);

    // ----- 2. 相机 -----
    var camera = new T.PerspectiveCamera(
        opts.fov,
        container.clientWidth / container.clientHeight,
        0.1,
        100
    );
    camera.position.set(opts.camPos.x, opts.camPos.y, opts.camPos.z);

    // ----- 3. 光照 -----
    var ambientLight = new T.AmbientLight(0x404040);
    scene.add(ambientLight);

    var dirLight1 = new T.DirectionalLight(0xffffff, 1);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    var dirLight2 = new T.DirectionalLight(0x00d4ff, 0.5);
    dirLight2.position.set(-5, -3, 5);
    scene.add(dirLight2);

    // ----- 4. 渲染器 -----
    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(opts.bgColor, 1);
    container.appendChild(renderer.domElement);

    // ----- 5. 简易轨道控制器 -----
    var controls = createOrbitControls({ camera: camera, domElement: renderer.domElement });

    // ----- 6. 模型加载 -----
    var currentObject = null;

    function disposeObject(obj) {
        if (!obj) return;
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                for (var i = 0; i < obj.material.length; i++) {
                    if (obj.material[i].map) obj.material[i].map.dispose();
                    obj.material[i].dispose();
                }
            } else {
                if (obj.material.map) obj.material.map.dispose();
                obj.material.dispose();
            }
        }
        if (obj.children) {
            for (var i = obj.children.length - 1; i >= 0; i--) {
                disposeObject(obj.children[i]);
            }
        }
    }

    function loadModel(path) {
        if (currentObject) {
            scene.remove(currentObject);
            disposeObject(currentObject);
            currentObject = null;
        }

        if (!GLTFLoaderClass) {
            console.error('[GltfAvif] GLTFLoader 不可用');
            return;
        }

        var loader = new GLTFLoaderClass();
        if (DRACOLoaderClass) {
            var dracoLoader = new DRACOLoaderClass();
            dracoLoader.setDecoderPath('../assets/js/three/libs/draco/gltf/');
            loader.setDRACOLoader(dracoLoader);
        }

        // 提取目录路径作为 basePath
        var basePath = path.substring(0, path.lastIndexOf('/') + 1);
        var fileName = path.substring(path.lastIndexOf('/') + 1);
        if (basePath) loader.setPath(basePath);

        loader.load(
            fileName,
            function (gltf) {
                var object = gltf.scene;
                if (scale !== 1) {
                    object.scale.set(scale, scale, scale);
                }

                // ---- 自动居中模型（计算包围盒中心偏移到原点） ----
                var box = new T.Box3().setFromObject(object);
                var center = new T.Vector3();
                box.getCenter(center);
                object.position.sub(center);

                // ---- 自动调整相机距离使模型适配视野 ----
                box.setFromObject(object);
                var size = new T.Vector3();
                box.getSize(size);
                var maxDim = Math.max(size.x, size.y, size.z);
                if (maxDim > 0) {
                    // 根据模型大小和 fov 计算合适的相机距离
                    var dist = maxDim / (2 * Math.tan((opts.fov * Math.PI) / 360));
                    dist = dist * 1.5; // 留边距
                    var dir = new T.Vector3(opts.camPos.x, opts.camPos.y, opts.camPos.z).normalize();
                    camera.position.copy(dir.multiplyScalar(dist));
                    camera.lookAt(0, 0, 0);
                    // 重建控制器以同步新相机位置
                    if (controls && controls.dispose) controls.dispose();
                    controls = createOrbitControls({ camera: camera, domElement: renderer.domElement });
                }

                scene.add(object);
                currentObject = object;

                renderer.render(scene, camera);

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
                console.error('[GltfAvif] 模型加载失败:', error);
                if (typeof opts.onError === 'function') {
                    opts.onError(error);
                }
            }
        );
    }

    loadModel(modelPath);

    // ----- 7. 窗口自适应 -----
    function onResize() {
        var w = container.clientWidth;
        var h = container.clientHeight || 500;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.render(scene, camera);
    }
    window.addEventListener('resize', onResize);

    // ----- 8. 动画循环（控制器需要持续渲染） ----
    var animationFrameId = null;

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();

    // ----- 9. 返回公共 API -----
    return {
        /**
         * 切换加载新模型
         * @param {string|object} newConfig - 模型路径或配置 { path, scale }
         */
        loadModel: function (newConfig) {
            var path = '';
            if (typeof newConfig === 'string') {
                path = newConfig;
            } else if (newConfig && typeof newConfig === 'object') {
                path = newConfig.path || newConfig.model || '';
                if (newConfig.scale !== undefined) scale = newConfig.scale;
            }
            if (path) loadModel(path);
        },

        /**
         * 获取场景引用
         * @returns {object} { scene, camera, renderer, controls }
         */
        getSceneRefs: function () {
            return { scene: scene, camera: camera, renderer: renderer, controls: controls };
        },

        /**
         * 获取加载的模型对象
         * @returns {object|null}
         */
        getObject: function () {
            return currentObject;
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
            if (currentObject) {
                scene.remove(currentObject);
                disposeObject(currentObject);
                currentObject = null;
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
        }
    };
}
