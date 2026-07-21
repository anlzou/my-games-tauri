// ==================== 通用功能 ====================
let currentGame = 'sudoku';
let timerInterval = null;

// 返回主页
function goBackToIndex() {
    const moduleInfo = getCurrentModule();
    if (moduleInfo.module === 'three') {
        window.location.href = '../index.html';
    } else {
        window.location.href = 'index.html';
    }
}

const gameNames = {
    sudoku: '数独',
    snake: '贪吃蛇',
    tetris: '俄罗斯方块',
    minesweeper: '扫雷',
    game2048: '2048',
    gomoku: '五子棋',
    breakout: '打砖块',
    memory: '记忆翻牌',
    sokoban: '推箱子',
    whackamole: '打地鼠',
    flappybird: '飞翔的小鸟',
    pinball: '见缝插针',
    klotski: '华容道',
    puzzle: '滑块拼图',
    rubik: '3D魔方',
};
const gameIcons = {
    sudoku: '🔢',
    snake: '🐍',
    tetris: '🧱',
    minesweeper: '💣',
    game2048: '🎲',
    gomoku: '⚫',
    breakout: '🏓',
    memory: '🃏',
    sokoban: '📦',
    whackamole: '🐹',
    flappybird: '🐦',
    pinball: '🎯',
    klotski: '🏯',
    puzzle: '🧩',
    rubik: '🧊',
};
const gameDescs = {
    sudoku: '逻辑填数',
    snake: '经典街机',
    tetris: '消除方块',
    minesweeper: '推理排雷',
    game2048: '数字合并',
    gomoku: '策略对战',
    breakout: '弹球击碎',
    memory: '考验记忆',
    sokoban: '益智解谜',
    whackamole: '快速击打',
    flappybird: '飞越障碍',
    pinball: '精准时机',
    klotski: '滑块解谜',
    puzzle: '拼图还原',
    rubik: '3D魔方',
};

// 3D 模型数据
const threeModelNames = {
    cube: '旋转立方体',
    sphere: '发光球体',
    torus: '扭结环',
    earth: '旋转地球',
    skinning: '骨骼动画',
    gltf_avif: 'GLTF AVIF',
    retargeting_readyplayer: '动画重定向',
    convex_hull: '凸包几何',
    terrain: '程序化地形',
    robot: '机器人模型',
};
const threeModelIcons = {
    cube: '📦',
    sphere: '🔮',
    torus: '🔄',
    earth: '🌍',
    skinning: '🏃',
    gltf_avif: '🏠',
    retargeting_readyplayer: '🔄',
    convex_hull: '💎',
    terrain: '🏔️',
    robot: '🤖',
};
const threeModelDescs = {
    cube: '彩色立方体',
    sphere: '粒子光效',
    torus: '复杂曲面',
    earth: '3D 地球',
    skinning: '蒙皮动画',
    gltf_avif: 'GLTF模型与AVIF纹理',
    retargeting_readyplayer: '动画重定向到ReadyPlayer.me',
    convex_hull: '随机点云凸包计算',
    terrain: 'Simplex噪声生成地形',
    robot: '机器人模型展示',
};

// 游戏顺序列表
const gameList = ['sudoku', 'snake', 'tetris', 'minesweeper', 'game2048', 'gomoku', 'breakout', 'memory', 'sokoban', 'whackamole', 'flappybird', 'pinball', 'klotski', 'puzzle', 'rubik'];
// 3D 模型顺序列表
const threeModelList = ['cube', 'sphere', 'torus', 'earth', 'skinning', 'gltf_avif', 'retargeting_readyplayer', 'convex_hull', 'terrain', 'robot'];

// 获取当前模块和页面ID
function getCurrentModule() {
    const path = window.location.pathname;
    const parts = path.replace(/\/+$/, '').split('/');
    const filename = parts[parts.length - 1].replace('.html', '') || 'index';
    // 检查是否在子目录中（如 three/cube.html）
    if (parts.length >= 2 && parts[parts.length - 2] === 'three') {
        return { module: 'three', id: filename };
    }
    return { module: 'games', id: filename };
}

// 获取当前游戏名（兼容旧代码）
function getCurrentGame() {
    const info = getCurrentModule();
    // 如果是3D模块，返回当前模型ID
    if (info.module === 'three') {
        return info.id;
    }
    return info.id;
}

// ========== 页面过渡加载动画 ==========
function showPageLoading(key, moduleType) {
    const existing = document.querySelector('.page-transition-overlay');
    if (existing) existing.remove();

    const icon = gameIcons[key] || threeModelIcons[key] || '🎮';
    const name = gameNames[key] || threeModelNames[key] || '页面';
    const moduleLabel = moduleType === 'three' ? '3D模型' : '游戏';

    const overlay = document.createElement('div');
    overlay.className = 'page-transition-overlay';
    overlay.innerHTML = `
        <div class="loading-game-icon">${icon}</div>
        <div class="spinner"></div>
        <div class="loading-text">加载 ${name}...</div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

function hidePageLoading(callback) {
    const overlay = document.querySelector('.page-transition-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        setTimeout(() => {
            overlay.remove();
            if (callback) callback();
        }, 500);
    } else {
        if (callback) callback();
    }
}

// 拦截所有链接点击，添加过渡动画
function setupGameLinkInterception() {
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a.game-btn, a.sidebar-item, a.sidebar-cat-item, a.game-card, a.cat-item, a.model-card, a.three-model-btn');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || !href.endsWith('.html')) return;

        // 将相对路径解析为完整路径，避免子目录（three/）中路径判断错误
        const linkUrl = new URL(href, window.location.href);
        const currentUrl = new URL(window.location.href);
        // 不拦截指向当前页面的链接（比较完整路径）
        if (linkUrl.pathname === currentUrl.pathname) return;

        e.preventDefault();
        sessionStorage.setItem('fromMenuNavigation', 'true');
        setTimeout(() => {
            window.location.href = href;
        }, 200);
    });
}

// ========== 动态生成公共布局（侧边栏 + 桌面选择器 + 顶部栏 + 模态框） ==========
// 支持传入模块类型参数：'games' (默认) 或 'three'
function initCommonLayout(moduleType, sectionType) {
    const moduleInfo = getCurrentModule();
    const current = moduleInfo.id;
    // 如果未指定模块类型，自动判断
    if (!moduleType) {
        moduleType = moduleInfo.module;
    }
    currentGame = current;

    const container = document.querySelector('.container');
    if (!container) return;

    // 根据模块类型获取名称和图标
    let getName, getIcon, itemList, basePath;
    if (moduleType === 'three') {
        getName = threeModelNames;
        getIcon = threeModelIcons;
        itemList = threeModelList;
        basePath = './three/';
    } else {
        getName = gameNames;
        getIcon = gameIcons;
        itemList = gameList;
        basePath = './';
    }

    const itemName = getName[current] || '页面';
    const itemIcon = getIcon[current] || '🎮';
    const moduleTitle = moduleType === 'three' ? '🎨 3D模型' : '🎮 游戏列表';

        // 如果侧边栏和顶部栏已存在，只更新 active 状态和标题
    const existingSidebar = document.getElementById('sidebar');
    const existingTopBar = document.querySelector('.top-bar');
    const existingSelector = document.getElementById('desktop-selector');

    if (existingSidebar && existingTopBar && existingSelector) {
        // 更新桌面端选择器
        existingSelector.querySelectorAll('.game-btn').forEach(el => {
            const href = el.getAttribute('href');
            if (href) {
                const game = href.replace('.html', '').replace('./three/', '').replace('./', '');
                el.classList.toggle('active', game === current);
            }
        });
        // 更新侧边栏分类项 active 状态
        existingSidebar.querySelectorAll('.sidebar-cat-item').forEach(el => {
            el.classList.remove('active');
            const href = el.getAttribute('href');
            if (href) {
                const item = href.replace('.html', '').replace('./three/', '').replace('./', '');
                if (item === current) {
                    el.classList.add('active');
                }
            }
        });
        const titleEl = existingTopBar.querySelector('h1');
        if (titleEl) {
            titleEl.innerHTML = `<span class="game-icon">${itemIcon}</span> ${itemName}`;
        }
        ensureModals(container);
        return;
    }

        // 移除旧的布局元素
    if (existingSidebar) existingSidebar.remove();
    if (document.querySelector('.top-bar')) document.querySelector('.top-bar').remove();
    if (existingSelector) existingSelector.remove();
    if (document.querySelector('.sidebar-overlay')) document.querySelector('.sidebar-overlay').remove();

    // ===== 桌面端选择器 =====
    const selectorItemsHtml = itemList.map(id =>
        `<a href="${basePath}${id}.html" class="game-btn${id === current ? ' active' : ''}">${getIcon[id]} ${getName[id]}</a>`
    ).join('\n            ');

        // ===== 移动端侧边栏（分类折叠菜单，显示所有模块） =====
    // 根据页面所在目录确定相对路径前缀：three/ 子目录中的页面需要 ../ 回退
    const prefix = moduleType === 'three' ? '../' : './';
    const threePrefix = './' + (moduleType === 'three' ? '' : 'three/');
    
    const gameCatItemsHtml = gameList.map(id =>
        `<a href="${prefix}${id}.html" class="sidebar-cat-item${id === current && moduleType === 'games' ? ' active' : ''}">
            <span class="item-icon">${gameIcons[id]}</span>
            <span class="item-name">${gameNames[id]}</span>
        </a>`
    ).join('\n                ');

    const threeCatItemsHtml = threeModelList.map(id =>
        `<a href="${threePrefix}${id}.html" class="sidebar-cat-item${id === current && moduleType === 'three' ? ' active' : ''}">
            <span class="item-icon">${threeModelIcons[id]}</span>
            <span class="item-name">${threeModelNames[id]}</span>
        </a>`
    ).join('\n                ');

    // 当前所在分类默认展开
    const gamesExpanded = moduleType === 'games' ? ' expanded' : '';
    const threeExpanded = moduleType === 'three' ? ' expanded' : '';
    const threeCatExtra = moduleType === 'three' ? ' three-cat' : '';

    const sidebarHtml = `
        <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>
        <div class="sidebar" id="sidebar">
            <div class="sidebar-categories">
                <!-- 游戏分类 -->
                <div class="sidebar-category${gamesExpanded}" data-cat="games">
                    <div class="sidebar-cat-header" onclick="toggleSidebarCategory(this)">
                        <span class="left">
                            <span class="cat-icon">🎮</span>
                            <span class="cat-name">经典游戏</span>
                            <span class="cat-count">${gameList.length}</span>
                        </span>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div class="sidebar-cat-body">
                        <div class="sidebar-cat-items">
                            ${gameCatItemsHtml}
                        </div>
                    </div>
                </div>
                <!-- 3D 模型分类 -->
                <div class="sidebar-category${threeExpanded}${threeCatExtra}" data-cat="three">
                    <div class="sidebar-cat-header" onclick="toggleSidebarCategory(this)">
                        <span class="left">
                            <span class="cat-icon">🎨</span>
                            <span class="cat-name">3D 模型</span>
                            <span class="cat-count">${threeModelList.length}</span>
                        </span>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div class="sidebar-cat-body">
                        <div class="sidebar-cat-items">
                            ${threeCatItemsHtml}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

    // 判断是否为3D模型详情页（单独3D模型页面有自己的模型选择器，不需要通用选择器）
    const isThreeDetailPage = moduleType === 'three' && sectionType === 'models';

    const headerHtml = `
        ${sidebarHtml}

        <div class="top-bar">
            <button class="back-btn" id="back-btn" onclick="goBackToIndex()">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
            </button>
            <button class="menu-btn" id="menu-btn" onclick="openSidebar()">☰</button>
            <h1><span class="game-icon">${itemIcon}</span> ${itemName}</h1>
            <button class="help-btn" id="help-btn" onclick="showRules()" style="${moduleType === 'three' ? 'display:none;' : ''}">?</button>
        </div>

        <div class="game-selector" id="desktop-selector" style="${isThreeDetailPage ? 'display:none;' : ''}">
            ${selectorItemsHtml}
        </div>`;

    container.insertAdjacentHTML('afterbegin', headerHtml);

    // 将内容区域包裹到 scroll-container 中
    const gameArea = container.querySelector('.game-area, #model-area');
    if (gameArea) {
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'game-scroll-container';
        gameArea.parentNode.insertBefore(scrollContainer, gameArea);
        scrollContainer.appendChild(gameArea);
    }

    document.body.classList.add('game-page');
    ensureModals(container);
    setupGameLinkInterception();
}

function ensureModals(container) {
    // 移除旧模态框（如果有页面硬编码的）
    const oldGameModal = document.getElementById('game-modal');
    const oldRulesModal = document.getElementById('rules-modal');
    if (oldGameModal) oldGameModal.remove();
    if (oldRulesModal) oldRulesModal.remove();

    const modalHtml = `
        <!-- 游戏结束弹窗 -->
        <div class="modal" id="game-modal">
            <div class="modal-content" id="modal-content">
                <h2 id="modal-title"></h2>
                <p id="modal-msg"></p>
                <button class="modal-btn" onclick="closeModal()">继续</button>
            </div>
        </div>

        <!-- 规则说明弹窗 -->
        <div class="modal rules-modal" id="rules-modal">
            <div class="modal-content">
                <div class="rules-modal-header">
                    <h2 id="rules-title">📖 游戏规则</h2>
                </div>
                <div id="rules-body" class="rules-modal-body"></div>
                <div class="rules-modal-footer">
                    <button class="modal-btn" onclick="closeRules()">知道了</button>
                </div>
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', modalHtml);
}

let seconds = 0;

function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('show');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
}

function selectGameFromSidebar(game) {
    showPageLoading(game);
    sessionStorage.setItem('fromMenuNavigation', 'true');
    setTimeout(() => {
        window.location.href = './' + game + '.html';
    }, 300);
}

// 侧边栏分类折叠切换
function toggleSidebarCategory(headerEl) {
    const category = headerEl.closest('.sidebar-category');
    if (!category) return;
    category.classList.toggle('expanded');
}

// 点击侧边栏中的项后自动关闭侧边栏
document.addEventListener('click', function(e) {
    const item = e.target.closest('.sidebar-cat-item');
    if (item) {
        setTimeout(closeSidebar, 100);
    }
});

function startTimer(displayId) {
    stopTimer();
    seconds = 0;
    const isMineTimer = displayId === 'mine-timer';
    timerInterval = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        const el = document.getElementById(displayId);
        if (el) {
            el.textContent = isMineTimer ? seconds : `${mins}:${secs}`;
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function showModal(title, msg, isWin) {
    const modal = document.getElementById('game-modal');
    const content = document.getElementById('modal-content');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-msg').textContent = msg;
    content.className = 'modal-content ' + (isWin ? 'win' : 'lose');
    // 延迟弹出，让玩家先看清游戏结果
    setTimeout(() => {
        modal.classList.add('show');
    }, 800);
}

function closeModal() {
    document.getElementById('game-modal').classList.remove('show');
    // 不再使用 location.reload()，避免触发页面的加载动画
    // 各个游戏页面可自行覆盖此方法来实现重置逻辑
}

// ==================== 规则说明 ====================
const rulesData = {
    sudoku: `
        <h3>🎯 游戏目标</h3>
        <p>在 9×9 的格子中填入数字 1-9，使每行、每列、每个 3×3 宫格内的数字都不重复。</p>
        <h3>🎮 操作方式</h3>
        <ul>
            <li>点击空白格子选中，再点击下方数字按钮填入</li>
            <li>也可直接使用键盘数字键输入，Backspace 删除</li>
            <li>灰色数字为固定提示，不可修改</li>
            <li>红色数字表示与规则冲突</li>
        </ul>
        <h3>⭐ 难度说明</h3>
        <ul>
            <li><b>简单</b>：移除 35 个数字</li>
            <li><b>中等</b>：移除 45 个数字</li>
            <li><b>困难</b>：移除 55 个数字</li>
            <li><b>专家</b>：移除 64 个数字</li>
        </ul>
    `,
    snake: `
        <h3>🎯 游戏目标</h3>
        <p>控制小蛇吃掉食物，不断变长，不要撞到墙壁或自己的身体！</p>
        <h3>🎮 操作方式</h3>
        <ul>
            <li>电脑：方向键 ↑↓←→ 或 WASD 控制方向，空格键暂停</li>
            <li>手机：点击屏幕下方的十字方向键</li>
        </ul>
        <h3>⭐ 难度说明</h3>
        <ul>
            <li><b>简单</b>：速度较慢，适合新手</li>
            <li><b>中等</b>：正常速度</li>
            <li><b>困难</b>：速度较快</li>
            <li><b>疯狂</b>：极速挑战</li>
        </ul>
        <h3>💡 技巧</h3>
        <p>每吃一个食物得 10 分，蛇身会增长一格。合理规划路线，给自己留足空间！</p>
    `,
    tetris: `
        <h3>🎯 游戏目标</h3>
        <p>控制下落的方块，填满整行即可消除得分。不要让方块堆到顶部！</p>
        <h3>🎮 操作方式</h3>
        <ul>
            <li>电脑：←→ 移动，↑ 旋转，↓ 加速下落，空格直接落底</li>
            <li>手机：点击下方虚拟按键操作</li>
        </ul>
        <h3>⭐ 计分规则</h3>
        <ul>
            <li>消除 1 行：100 × 等级</li>
            <li>消除 2 行：300 × 等级</li>
            <li>消除 3 行：500 × 等级</li>
            <li>消除 4 行：800 × 等级</li>
        </ul>
        <h3>💡 技巧</h3>
        <p>尽量保持底部平整，预留竖条（I型方块）的位置可以一次消除4行获得高分！</p>
    `,
    minesweeper: `
        <h3>🎯 游戏目标</h3>
        <p>找出所有安全的格子，避开地雷。揭开所有非雷格子即可获胜！</p>
        <h3>🎮 操作方式</h3>
        <ul>
            <li>左键点击揭开格子</li>
            <li>右键点击标记旗帜（手机可开启标记模式或长按）</li>
            <li>数字表示周围 8 格中地雷的数量</li>
        </ul>
        <h3>⭐ 难度说明</h3>
        <ul>
            <li><b>简单</b>：9×9 格子，10 颗雷</li>
            <li><b>中等</b>：16×16 格子，40 颗雷</li>
            <li><b>困难</b>：16×30 格子，99 颗雷</li>
        </ul>
        <h3>💡 技巧</h3>
        <p>首次点击永远不会踩到雷。当数字周围已标记的旗帜数等于该数字时，可以尝试揭开其余格子。</p>
    `,
    game2048: `
        <h3>🎯 游戏目标</h3>
        <p>通过滑动合并相同数字的方块，最终合成 2048 方块！</p>
        <h3>🎮 操作方式</h3>
        <ul>
            <li>电脑：使用方向键 ↑↓←→ 移动方块</li>
            <li>手机：在游戏区域滑动手指移动方块</li>
        </ul>
        <h3>⭐ 游戏规则</h3>
        <ul>
            <li>每次移动，所有方块都会向移动方向滑动</li>
            <li>相同数字的方块相撞时会合并成一个新方块</li>
            <li>每次移动后，会在空白处随机生成一个新方块</li>
            <li>当棋盘填满且无法移动时，游戏结束</li>
        </ul>
        <h3>💡 技巧</h3>
        <p>尽量保持大数字在角落，小数字在旁边，合理规划移动顺序！</p>
    `,
    gomoku: `
        <h3>🎯 游戏目标</h3>
        <p>在棋盘上落子，使自己的棋子连成五子一线即可获胜！</p>
        <h3>🎮 操作方式</h3>
        <ul>
            <li>点击棋盘交叉点落子</li>
            <li>黑方先手，白方后手</li>
        </ul>
        <h3>⭐ 游戏模式</h3>
        <ul>
            <li><b>人机对战</b>：与电脑对战，电脑使用简单AI</li>
            <li><b>双人对战</b>：两人轮流落子</li>
        </ul>
        <h3>💡 技巧</h3>
        <p>注意防守对方的活三，同时寻找自己的进攻机会。占据棋盘中心位置更有优势！</p>
    `,
    breakout: `
        <h3>🎯 游戏目标</h3>
        <p>控制挡板反弹小球，击碎所有砖块即可获胜！不要让球掉到底部。</p>
        <h3>🎮 操作方式</h3>
        <ul>
            <li>电脑：←→ 方向键或 A/D 移动挡板，空格键暂停</li>
            <li>手机：左右滑动屏幕或点击下方按钮移动挡板</li>
        </ul>
        <h3>⭐ 难度说明</h3>
        <ul>
            <li><b>简单</b>：球速较慢，适合新手</li>
            <li><b>中等</b>：正常球速</li>
            <li><b>困难</b>：球速较快</li>
            <li><b>疯狂</b>：极速挑战</li>
        </ul>
        <h3>💡 技巧</h3>
        <p>球击中挡板不同位置会改变反弹角度，击中挡板边缘可获得更大角度！</p>
    `,
    memory: `
        <h3>🎯 游戏目标</h3>
        <p>翻开所有卡片，找出相同的图案配对。全部配对完成即可获胜！</p>
        <h3>🎮 操作方式</h3>
        <ul>
            <li>点击卡片翻开，每次可翻开两张</li>
            <li>图案相同则配对成功，保持翻开状态</li>
            <li>图案不同则自动翻回，请牢记位置</li>
        </ul>
        <h3>⭐ 难度说明</h3>
        <ul>
            <li><b>简单</b>：3×4 共 12 张卡片（6 对）</li>
            <li><b>中等</b>：4×4 共 16 张卡片（8 对）</li>
            <li><b>困难</b>：4×6 共 24 张卡片（12 对）</li>
        </ul>
        <h3>💡 技巧</h3>
        <p>尽量记住已翻开卡片的位置，减少无效翻牌，挑战最少步数通关！</p>
    `,
    sokoban: `
        <h3>🎯 游戏目标</h3>
        <p>控制工人将所有箱子推到金色目标点上，完成所有目标即可过关！共15关。</p>
        <h3>🎮 操作方式</h3>
        <ul>
            <li>电脑：方向键 ↑↓←→ 或 WASD 移动，Ctrl+Z 撤销</li>
            <li>手机：点击屏幕下方的十字方向键</li>
            <li>点击右侧 📋 按钮选择关卡</li>
        </ul>
        <h3>⭐ 游戏规则</h3>
        <ul>
            <li>工人只能推箱子，不能拉箱子</li>
            <li>一次只能推动一个箱子</li>
            <li>箱子推到墙角就无法再移动，注意避免死局</li>
            <li>通关后自动进入下一关</li>
        </ul>
        <h3>💡 技巧</h3>
        <p>善用撤销功能回退步数。推箱子前想好退路，避免将箱子推到角落或靠墙的位置！绿色边框表示已通关。</p>
    `,
    whackamole: `
        <h3>🎯 游戏目标</h3>
        <p>在限时内尽可能多地打到冒出来的地鼠，获得高分！千万别打到炸弹 💥</p>
        <h3>🎮 操作方式</h3>
        <ul>
            <li>点击或触摸冒出的地鼠击打，每次击中得 10 分</li>
            <li>打到炸弹扣 15 分，地鼠消失漏打也算失误</li>
            <li>时间结束根据得分评级</li>
        </ul>
        <h3>⭐ 难度说明</h3>
        <ul>
            <li><b>简单</b>：35秒，地鼠出现慢，炸弹少</li>
            <li><b>中等</b>：30秒，地鼠速度适中</li>
            <li><b>困难</b>：25秒，地鼠出现快，炸弹增多</li>
            <li><b>疯狂</b>：20秒，满地地鼠和炸弹</li>
        </ul>
        <h3>💡 技巧</h3>
        <p>注意区分地鼠和炸弹！炸弹出现时有 💣 标识。优先击打即将消失的地鼠，减少失误次数！</p>
    `,
    flappybird: `
        <h3>🎯 游戏目标</h3>
        <p>控制小鸟穿越管道之间的空隙，每安全通过一个管道得 10 分，尽可能飞得更远！</p>
        <h3>🎮 操作方式</h3>
        <ul>
            <li>电脑：点击屏幕或按空格键让小鸟向上飞</li>
            <li>手机：点击/触摸屏幕让小鸟向上飞</li>
            <li>点击暂停按钮可暂停游戏</li>
        </ul>
        <h3>⭐ 难度说明</h3>
        <ul>
            <li><b>简单</b>：重力小，跳跃力大，管道间隙宽，速度慢</li>
            <li><b>中等</b>：正常重力与间隙</li>
            <li><b>困难</b>：重力大，管道间隙窄，速度快</li>
        </ul>
        <h3>💡 技巧</h3>
        <p>不要频繁点击！有节奏地点击控制小鸟高度。尽量保持在管道中间高度飞行，提前规划穿越路线。最高分会自动保存！</p>
    `,
    pinball: `
        <h3>🎯 游戏目标</h3>
        <p>将所有的针插入旋转的圆盘中，且不能碰到已经插好的针！</p>
        <h3>🎮 操作方式</h3>
        <ul>
            <li>点击屏幕或按空格键插针</li>
        </ul>
        <h3>⭐ 难度说明</h3>
        <ul>
            <li><b>简单</b>：圆盘转速较慢</li>
            <li><b>中等</b>：圆盘转速适中</li>
            <li><b>困难</b>：圆盘转速较快</li>
        </ul>
        <h3>💡 技巧</h3>
        <p>观察圆盘的旋转速度和空隙，找准时机果断出手！每过一关，需要插入的针会变多，转速也会微增。</p>
    `,
    klotski: `
        <h3>🎯 游戏目标</h3>
        <p>移动棋子，让"曹操"（2×2 大棋）从棋盘底部唯一的出口逃出！这是经典的"横刀立马"布局。</p>
        <h3>🎮 操作方式</h3>
        <ul>
            <li>点击棋子（非空白格）即可尝试移动</li>
            <li>棋子沿上下左右四个方向滑动到空格处</li>
            <li>点击"打乱"按钮重新排列棋子后开始挑战</li>
            <li>点击"重置"按钮恢复初始布局</li>
        </ul>
        <h3>🎨 主题说明</h3>
        <ul>
            <li><b>🏯 经典</b>：显示三国武将名称</li>
            <li><b>🌿 植物</b>：用各种植物 emoji 代表棋子</li>
            <li><b>🐾 动物</b>：用可爱动物 emoji 代表棋子</li>
            <li><b>🍎 水果</b>：用缤纷水果 emoji 代表棋子</li>
            <li><b>🔢 数字</b>：用数字编号代表棋子</li>
        </ul>
        <h3>⭐ 胜利条件</h3>
        <ul>
            <li>将 2×2 的大棋（曹操）移动到棋盘最底部的中央位置</li>
            <li>系统会记录你的步数和用时</li>
        </ul>
        <h3>💡 技巧</h3>
        <p>华容道是经典的滑块类益智游戏。注意规划移动顺序，逐步将大棋向出口移动。小兵虽小但至关重要，合理利用空格是关键！按 R 键可快速重置。</p>
    `,
    puzzle: `
        <h3>🎯 游戏目标</h3>
        <p>将打乱的拼图块通过滑动恢复到原始顺序！每次只能移动与空白格相邻的方块。当所有格子回归正确位置，还原出完整的精美画面！</p>
        <h3>🎮 操作方式</h3>
        <ul>
            <li><b>点击</b>：点击与空白格相邻的拼图块，它就会滑动到空白位置</li>
            <li><b>拖动</b>：在拼图块上滑动手指/鼠标，将块拖向空白格方向</li>
            <li><b>键盘</b>：方向键 ↑↓←→ 或 WASD 控制，空格键快速打乱，R 重置，P 预览，N 切换数字显示</li>
        </ul>
        <h3>🎨 可选主题（Canvas 数学函数实时生成）</h3>
        <ul>
            <li><b>🌌 极光梦境</b>：多层正弦波叠加，极光般流动的彩色光带</li>
            <li><b>🪷 几何万花筒</b>：极坐标对称变换，万花筒般绚丽几何图案</li>
            <li><b>🌀 星云漩涡</b>：类 Julia 集分形迭代，宇宙星云般深邃图案</li>
        </ul>
        <h3>⭐ 难度等级</h3>
        <ul>
            <li><b>简单 3×3</b>：9块拼图，适合新手入门</li>
            <li><b>中等 4×4</b>：16块拼图，经典难度</li>
            <li><b>困难 5×5</b>：25块拼图，进阶挑战</li>
            <li><b>专家 6×6</b>：36块拼图，高手试炼</li>
        </ul>
        <h3>💡 技巧</h3>
        <p>可以点击"预览"按钮查看完整图案。从左上角开始逐行还原是最常用的策略。步数越少评级越高！按 P 键快速预览完整图片，N 键切换数字辅助显示。</p>
    `,
    rubik: `
        <h3>🎯 游戏目标</h3>
        <p>还原被打乱的魔方，使每个面都恢复为纯色！</p>
        <h3>🎮 操作方式</h3>
        <ul>
            <li><b>点击面块</b> + 拖拽：旋转该层（点击某面块后沿方向拖拽）</li>
            <li><b>拖拽空白处</b>：旋转视角从不同角度观察魔方</li>
            <li><b>滚轮</b>：缩放视图</li>
            <li>支持触屏操作，双指缩放</li>
        </ul>
        <h3>⚙️ 设置功能</h3>
        <ul>
            <li>点击右下角悬浮齿轮按钮 ⚙️ 打开设置弹窗</li>
            <li><b>魔方阶数</b>：支持 2×2 / 3×3 / 4×4 / 5×5</li>
            <li><b>动画速度</b>：慢速 / 正常 / 快速</li>
        </ul>
        <h3>🎯 操作方法</h3>
        <ul>
            <li>点击"打乱"按钮随机打乱魔方开始挑战</li>
            <li>点击"重置"按钮恢复已还原的魔方</li>
            <li>系统自动记录步数和用时</li>
        </ul>
        <h3>💡 技巧</h3>
        <p>使用标准魔方还原方法（层先法、CFOP等）可以高效还原。从底层开始逐步还原，先还原一面再逐层推进！</p>
    `
};

function showRules() {
    const moduleInfo = getCurrentModule();
    const game = moduleInfo.id || 'sudoku';
    currentGame = game;
    // 3D 模块没有规则说明
    if (moduleInfo.module === 'three') return;
    document.getElementById('rules-title').textContent = '📖 ' + gameNames[currentGame] + ' 规则';
    document.getElementById('rules-body').innerHTML = rulesData[currentGame] || rulesData['sudoku'];
    document.getElementById('rules-modal').classList.add('show');
}

function closeRules() {
    document.getElementById('rules-modal').classList.remove('show');
}

// ==================== 页面加载自动处理：加载动画 ====================
(function autoPageTransition() {
    const moduleInfo = getCurrentModule();
    const current = moduleInfo.id;
    // 大厅页面不显示加载动画
    if (current === 'index' || current === '') return;

    const fromMenu = sessionStorage.getItem('fromMenuNavigation');
    if (fromMenu !== 'true') {
        sessionStorage.removeItem('fromMenuNavigation');
        return;
    }

    sessionStorage.removeItem('fromMenuNavigation');
    const doShow = function() {
        const icon = gameIcons[current] || threeModelIcons[current] || '🎮';
        const name = gameNames[current] || threeModelNames[current] || '页面';
        const overlay = document.createElement('div');
        overlay.className = 'page-transition-overlay';
        overlay.innerHTML = `
            <div class="loading-game-icon">${icon}</div>
            <div class="spinner"></div>
            <div class="loading-text">加载 ${name}...</div>
        `;
        document.body.appendChild(overlay);

        if (document.readyState === 'complete') {
            setTimeout(function() {
                overlay.classList.add('hidden');
                setTimeout(() => overlay.remove(), 500);
            }, 200);
        } else {
            window.addEventListener('load', function() {
                setTimeout(function() {
                    overlay.classList.add('hidden');
                    setTimeout(() => overlay.remove(), 500);
                }, 200);
            });
            setTimeout(function() {
                overlay.classList.add('hidden');
                setTimeout(() => overlay.remove(), 500);
            }, 2000);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doShow);
    } else {
        doShow();
    }
})();
