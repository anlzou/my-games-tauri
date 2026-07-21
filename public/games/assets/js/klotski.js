// ==================== 华容道游戏 (Klotski) — 完全修复版 ====================
// 经典华容道 4×5 "横刀立马"布局
// 棋子编号:
//   1 - 曹操 (2×2) — 目标：移到底部出口
//   2 - 关羽 (2×1) — 横将
//   3 - 张飞 (1×2) — 竖将
//   4 - 赵云 (1×2) — 竖将
//   5 - 马超 (1×2) — 竖将
//   6 - 黄忠 (1×2) — 竖将
//   7-10 - 小兵 (1×1)
//   0 - 空位

const KLOTSKI_ROWS = 5;
const KLOTSKI_COLS = 4;

// 每个棋子的尺寸 [宽(列数), 高(行数)]
const PIECE_SIZES = {
    1: [2, 2],   // 曹操
    2: [2, 1],   // 关羽
    3: [1, 2],   // 张飞
    4: [1, 2],   // 赵云
    5: [1, 2],   // 马超
    6: [1, 2],   // 黄忠
    7: [1, 1],   // 兵
    8: [1, 1],
    9: [1, 1],
    10: [1, 1]
};

// 方向常量
const DIRS = {
    UP: [-1, 0],
    DOWN: [1, 0],
    LEFT: [0, -1],
    RIGHT: [0, 1]
};

// 横刀立马经典布局 (4列×5行)
//   曹操  曹操  张飞  赵云
//   曹操  曹操  张飞  赵云
//   马超  关羽  关羽  黄忠
//   马超  兵7   兵8   黄忠
//   兵9   兵10  空    空
const INITIAL_BOARD = [
    [1, 1, 3, 4],
    [1, 1, 3, 4],
    [5, 2, 2, 6],
    [5, 7, 8, 6],
    [9, 10, 0, 0]
];

// 各主题棋子显示
const PIECE_LABELS = {
    1: { classic: '曹操', plants: '🌳', animals: '🐯', fruits: '🍉', numbers: '1' },
    2: { classic: '关羽', plants: '🌿', animals: '🐴', fruits: '🍎', numbers: '2' },
    3: { classic: '张飞', plants: '🌻', animals: '🐍', fruits: '🍊', numbers: '3' },
    4: { classic: '赵云', plants: '🌺', animals: '🐦', fruits: '🍇', numbers: '4' },
    5: { classic: '马超', plants: '🌵', animals: '🐺', fruits: '🍓', numbers: '5' },
    6: { classic: '黄忠', plants: '🌲', animals: '🐻', fruits: '🍑', numbers: '6' },
    7: { classic: '兵', plants: '🌱', animals: '🐰', fruits: '🍒', numbers: '7' },
    8: { classic: '兵', plants: '🍀', animals: '🐭', fruits: '🍋', numbers: '8' },
    9: { classic: '兵', plants: '🌴', animals: '🐸', fruits: '🥝', numbers: '9' },
    10:{ classic: '兵', plants: '🌾', animals: '🐧', fruits: '🍌', numbers: '10' }
};

const THEME_KEYS = {
    classic: 'classic', plants: 'plants', animals: 'animals',
    fruits: 'fruits', numbers: 'numbers'
};

// ========== 游戏状态 ==========
let klotskiBoard = [];
let klotskiMoves = 0;
let klotskiTimer = null;
let klotskiSeconds = 0;
let klotskiStarted = false;
let klotskiWon = false;
let currentTheme = 'classic';
// 滑动检测状态
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let touchTargetId = null;

// ======================================================================
//  核心：从 board 提取每个棋子的左上角位置和尺寸
//  返回: { pieceId: { id, r, c, w, h } }
// ======================================================================
function getPieceInfos(board) {
    const infos = {};
    const seen = new Set();
    for (let r = 0; r < KLOTSKI_ROWS; r++) {
        for (let c = 0; c < KLOTSKI_COLS; c++) {
            const key = `${r},${c}`;
            if (seen.has(key)) continue;
            const id = board[r][c];
            if (id === 0) {
                seen.add(key);
                continue;
            }
            const [w, h] = PIECE_SIZES[id];
            // 标记该棋子所有格子
            for (let rr = r; rr < r + h; rr++) {
                for (let cc = c; cc < c + w; cc++) {
                    seen.add(`${rr},${cc}`);
                }
            }
            infos[id] = { id, r, c, w, h };
        }
    }
    return infos;
}

// ======================================================================
//  判断矩形 (r,c) 尺寸 (w×h) 能否向 (dr,dc) 方向移动一格
//  核心规则：目标区域中所有不属于原区域的格子必须全是空格 (=== 0)
// ======================================================================
function canMove(board, r, c, w, h, dr, dc) {
    const nr = r + dr;
    const nc = c + dc;
    // 边界检查
    if (nr < 0 || nr + h > KLOTSKI_ROWS) return false;
    if (nc < 0 || nc + w > KLOTSKI_COLS) return false;

    // 遍历目标区域，只检查"新增"格子
    for (let rr = nr; rr < nr + h; rr++) {
        for (let cc = nc; cc < nc + w; cc++) {
            // 该格子同时属于原位置 → 跳过
            if (rr >= r && rr < r + h && cc >= c && cc < c + w) continue;
            if (board[rr][cc] !== 0) return false;
        }
    }
    return true;
}

// ======================================================================
//  执行移动：清除原位置，在新位置填入棋子 ID
// ======================================================================
function doMove(board, info, dr, dc) {
    const { id, r, c, w, h } = info;
    // 清空原位置
    for (let rr = r; rr < r + h; rr++) {
        for (let cc = c; cc < c + w; cc++) {
            board[rr][cc] = 0;
        }
    }
    // 填入新位置
    for (let rr = r + dr; rr < r + dr + h; rr++) {
        for (let cc = c + dc; cc < c + dc + w; cc++) {
            board[rr][cc] = id;
        }
    }
}

// ======================================================================
//  尝试移动棋子到指定方向，返回是否成功
// ======================================================================
function tryMovePiece(pieceId, dr, dc) {
    if (klotskiWon) return false;
    const curInfo = getPieceInfos(klotskiBoard)[pieceId];
    if (!curInfo) return false;
    if (canMove(klotskiBoard, curInfo.r, curInfo.c, curInfo.w, curInfo.h, dr, dc)) {
        doMove(klotskiBoard, curInfo, dr, dc);
        if (!klotskiStarted) startKlotskiTimer();
        klotskiMoves++;
        updateKlotskiStats();
        renderKlotski();
        checkKlotskiWin();
        return true;
    }
    return false;
}

// ======================================================================
//  初始化 / 重置
// ======================================================================
function initKlotski() {
    klotskiBoard = INITIAL_BOARD.map(row => [...row]);
    klotskiMoves = 0;
    klotskiSeconds = 0;
    klotskiStarted = false;
    klotskiWon = false;
    if (klotskiTimer) { clearInterval(klotskiTimer); klotskiTimer = null; }
    updateKlotskiStats();
    renderKlotski();
}

function resetKlotski() {
    if (klotskiTimer) { clearInterval(klotskiTimer); klotskiTimer = null; }
    initKlotski();
}

// ======================================================================
//  打乱棋盘：从初始状态做多次随机合法移动
// ======================================================================
function startKlotskiGame() {
    if (klotskiTimer) { clearInterval(klotskiTimer); klotskiTimer = null; }
    klotskiBoard = INITIAL_BOARD.map(row => [...row]);
    klotskiMoves = 0;
    klotskiSeconds = 0;
    klotskiStarted = false;
    klotskiWon = false;

    const steps = 80 + Math.floor(Math.random() * 40);
    for (let i = 0; i < steps; i++) {
        const infos = getPieceInfos(klotskiBoard);
        const movable = [];
        for (const pid in infos) {
            const inf = infos[pid];
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (const [dr, dc] of dirs) {
                if (canMove(klotskiBoard, inf.r, inf.c, inf.w, inf.h, dr, dc)) {
                    movable.push({ info: inf, dr, dc });
                    break;
                }
            }
        }
        if (movable.length === 0) break;
        const pick = movable[Math.floor(Math.random() * movable.length)];
        doMove(klotskiBoard, pick.info, pick.dr, pick.dc);
    }
    updateKlotskiStats();
    renderKlotski();
}

function setKlotskiTheme(theme) {
    if (klotskiTimer) { clearInterval(klotskiTimer); klotskiTimer = null; }
    currentTheme = theme;
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    document.getElementById('klotski-board').className = 'klotski-board theme-' + theme;
    initKlotski();
}

// ========== 计时 ==========
function startKlotskiTimer() {
    if (klotskiTimer) return;
    klotskiStarted = true;
    klotskiTimer = setInterval(() => { klotskiSeconds++; updateKlotskiStats(); }, 1000);
}

function updateKlotskiStats() {
    document.getElementById('klotski-moves').textContent = klotskiMoves;
    const m = String(Math.floor(klotskiSeconds / 60)).padStart(2, '0');
    const s = String(klotskiSeconds % 60).padStart(2, '0');
    document.getElementById('klotski-time').textContent = `${m}:${s}`;
}

// ======================================================================
//  棋盘渲染（修复：每个棋子只创建一个 DOM 元素）
// ======================================================================
function renderKlotski() {
    const boardEl = document.getElementById('klotski-board');
    boardEl.innerHTML = '';
    const themeKey = THEME_KEYS[currentTheme] || 'classic';

    // 用 getPieceInfos 拿到所有棋子信息，再按左上角位置排序
    const infos = getPieceInfos(klotskiBoard);
    // 按 (r, c) 排序确保渲染顺序正确
    const sorted = Object.values(infos).sort((a, b) => a.r - b.r || a.c - b.c);

    // 用一个格子集合来跳过已被大棋子覆盖的格子
    const covered = new Set();

    for (let r = 0; r < KLOTSKI_ROWS; r++) {
        for (let c = 0; c < KLOTSKI_COLS; c++) {
            const key = `${r},${c}`;
            if (covered.has(key)) continue;

            const val = klotskiBoard[r][c];
            const tile = document.createElement('div');
            
            if (val === 0) {
                tile.className = 'klotski-tile empty';
                covered.add(key);
                boardEl.appendChild(tile);
                continue;
            }

            // 找到该棋子的信息
            const info = infos[val];
            if (!info) { covered.add(key); continue; }

            // 只有左上角 (info.r === r && info.c === c) 才创建元素
            if (info.r === r && info.c === c) {
                const label = PIECE_LABELS[val][themeKey] || val;
                tile.className = 'klotski-tile';
                tile.dataset.pieceId = val;
                tile.dataset.size = info.w;
                tile.textContent = label;
                tile.style.gridColumn = `${c + 1} / span ${info.w}`;
                tile.style.gridRow = `${r + 1} / span ${info.h}`;
                tile.style.cursor = 'pointer';

                // 标记覆盖区域
                for (let rr = r; rr < r + info.h; rr++) {
                    for (let cc = c; cc < c + info.w; cc++) {
                        covered.add(`${rr},${cc}`);
                    }
                }

                // --- 点击事件：尝试所有方向，找到第一个可移动的方向 ---
                tile.addEventListener('click', (function(id) {
                    return function(e) {
                        e.stopPropagation();
                        if (klotskiWon) return;
                        const curInfo = getPieceInfos(klotskiBoard)[id];
                        if (!curInfo) return;
                        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                        for (const [dr, dc] of dirs) {
                            if (canMove(klotskiBoard, curInfo.r, curInfo.c, curInfo.w, curInfo.h, dr, dc)) {
                                doMove(klotskiBoard, curInfo, dr, dc);
                                if (!klotskiStarted) startKlotskiTimer();
                                klotskiMoves++;
                                updateKlotskiStats();
                                renderKlotski();
                                checkKlotskiWin();
                                return;
                            }
                        }
                    };
                })(val));

                // --- 触摸事件：支持滑动方向移动 ---
                tile.addEventListener('touchstart', (function(id) {
                    return function(e) {
                        touchStartX = e.touches[0].clientX;
                        touchStartY = e.touches[0].clientY;
                        touchStartTime = Date.now();
                        touchTargetId = id;
                    };
                })(val));

                tile.addEventListener('touchmove', (function(id) {
                    return function(e) {
                        // 阻止页面滚动
                        e.preventDefault();
                    };
                })(val));

                tile.addEventListener('touchend', (function(id) {
                    return function(e) {
                        if (!touchTargetId || touchTargetId !== id) return;
                        const dt = Date.now() - touchStartTime;
                        if (dt > 500) { // 超过500ms不算滑动
                            touchTargetId = null;
                            return;
                        }
                        const touchEnd = e.changedTouches[0];
                        const dx = touchEnd.clientX - touchStartX;
                        const dy = touchEnd.clientY - touchStartY;
                        const absDx = Math.abs(dx);
                        const absDy = Math.abs(dy);
                        const minSwipe = 15; // 最小滑动距离（像素）

                        let dr = 0, dc = 0;
                        if (absDx < minSwipe && absDy < minSwipe) {
                            // 距离太短，当作点击处理
                            touchTargetId = null;
                            return;
                        }
                        
                        if (absDx > absDy) {
                            dc = dx > 0 ? 1 : -1;
                        } else {
                            dr = dy > 0 ? 1 : -1;
                        }

                        tryMovePiece(id, dr, dc);
                        touchTargetId = null;
                    };
                })(val));

                boardEl.appendChild(tile);
            } else {
                // 非左上角，跳过（会由左上角元素覆盖）
                covered.add(key);
            }
        }
    }

    // 在棋盘底部中央添加胜利出口标记（第5行，第2-3列）
    const exitEl = document.createElement('div');
    exitEl.className = 'klotski-exit';
    boardEl.appendChild(exitEl);
}

// ========== 检测胜利 ==========
function checkKlotskiWin() {
    // 曹操(1) 移到 (3,1)(3,2)(4,1)(4,2) — 底部中央
    if (klotskiBoard[3][1] === 1 && klotskiBoard[3][2] === 1 &&
        klotskiBoard[4][1] === 1 && klotskiBoard[4][2] === 1) {
        klotskiWon = true;
        if (klotskiTimer) { clearInterval(klotskiTimer); klotskiTimer = null; }
        document.getElementById('klotski-board').classList.add('win');

        const themeKey = THEME_KEYS[currentTheme] || 'classic';
        const heroName = PIECE_LABELS[1][themeKey] || '曹操';
        setTimeout(() => {
            showKlotskiModal(
                '🎉 恭喜通关！',
                `你用了 ${klotskiMoves} 步，${formatKlotskiTime(klotskiSeconds)}，成功让 "${heroName}" 逃出华容道！`
            );
        }, 600);
        return true;
    }
    return false;
}

function formatKlotskiTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

// ========== 弹窗 ==========
function showKlotskiModal(title, msg) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-msg').textContent = msg;
    document.getElementById('modal-content').className = 'modal-content win';
    document.getElementById('game-modal').classList.add('show');
}

function closeModal() {
    document.getElementById('game-modal').classList.remove('show');
    initKlotski();
}

// ========== 键盘快捷键 ==========
document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') resetKlotski();
});
