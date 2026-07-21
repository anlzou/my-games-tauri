// ==================== 滑块拼图游戏 (Puzzle) ====================
// 游戏规则：将打乱的拼图块通过滑动恢复到原始顺序
// 每次只能移动与空白格相邻的方块
//
// ★ 核心设计：使用 Canvas 2D API 和纯数学函数，先绘制一幅完整的精美图像，
//   然后将该图像分割成 N×N 个小块，每个小块作为拼图格子的背景。
//   当所有格子移动到正确位置时，还原出完整画面 — 就像真正的拼图游戏一样！
// ★ 提供 3 种绚丽的数学生成主题

// ========== 配置 ==========
const PUZZLE_CONFIG = {
    sizes: { easy: 3, medium: 4, hard: 5, expert: 6 },
    shuffleFactor: { easy: 20, medium: 30, hard: 40, expert: 50 },
    canvasSize: 512 // 生成完整图像的尺寸
};

// ========== 主题定义 - 三种精美主题 ==========
// 每个主题使用不同的数学函数在 Canvas 上绘制完整的图像
const PUZZLE_THEMES = {
    aurora: {
        name: '极光梦境',
        icon: '🌌',
        description: '🌌 多层正弦波叠加 · 极光般流动的彩色光带',
        colors: ['#00d4ff', '#7c3aed', '#ec4899', '#06d6a0', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']
    },
    kaleidoscope: {
        name: '几何万花筒',
        icon: '🪷',
        description: '🪷 极坐标对称变换 · 万花筒般绚丽几何图案',
        colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
    },
    nebula: {
        name: '星云漩涡',
        icon: '🌀',
        description: '🌀 类 Julia 分形迭代 · 宇宙星云般深邃图案',
        colors: ['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#533483', '#00d4ff', '#c77dff', '#ff6b6b']
    }
};

// ========== 游戏状态 ==========
let puzzleBoard = [];
let puzzleGrid = 4;
let puzzleDifficulty = 'medium';
let puzzleTheme = 'aurora';
let puzzleMoves = 0;
let puzzleSeconds = 0;
let puzzleTimer = null;
let puzzleStarted = false;
let puzzleWon = false;
let isPreviewOpen = false;
let showNumbers = false;

// 触摸/拖动相关
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let touchTargetTile = null;

// ★ 存储从完整图像中截取的每个格子的 base64 图片数据
let tileImages = [];

// ======================================================================
//  初始化游戏
// ======================================================================
function initPuzzle() {
    resetPuzzleState();
    // ★ 先生成完整的 Canvas 图像，再分割成小块
    generateFullImageAndSplit();
    renderPuzzle();
    updateNumButtonStyle();
}

function resetPuzzleState() {
    const size = puzzleGrid * puzzleGrid;
    puzzleBoard = [];
    for (let i = 0; i < size; i++) {
        puzzleBoard[i] = i;
    }
    puzzleMoves = 0;
    puzzleSeconds = 0;
    puzzleStarted = false;
    puzzleWon = false;
    if (puzzleTimer) { clearInterval(puzzleTimer); puzzleTimer = null; }
    updatePuzzleStats();
    const boardEl = document.getElementById('puzzle-board');
    if (boardEl) boardEl.classList.remove('win');
}

function resetPuzzleGame() {
    if (puzzleTimer) { clearInterval(puzzleTimer); puzzleTimer = null; }
    resetPuzzleState();
    generateFullImageAndSplit();
    renderPuzzle();
}

// ======================================================================
//  设置主题
// ======================================================================
function setPuzzleTheme(theme) {
    if (!PUZZLE_THEMES[theme]) return;
    if (puzzleTimer) { clearInterval(puzzleTimer); puzzleTimer = null; }
    puzzleTheme = theme;
    document.querySelectorAll('.puzzle-theme-selector .theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    resetPuzzleState();
    // ★ 重新生成完整图像并分割
    generateFullImageAndSplit();
    renderPuzzle();
}

// ======================================================================
//  设置难度
// ======================================================================
function setPuzzleDifficulty(diff) {
    const size = PUZZLE_CONFIG.sizes[diff];
    if (!size) return;
    if (puzzleTimer) { clearInterval(puzzleTimer); puzzleTimer = null; }
    puzzleDifficulty = diff;
    puzzleGrid = size;
    document.querySelectorAll('.difficulty-selector .diff-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.diff === diff);
    });
    resetPuzzleState();
    generateFullImageAndSplit();
    renderPuzzle();
}

// ======================================================================
//  显示/隐藏数字切换
// ======================================================================
function togglePuzzleNumbers() {
    showNumbers = !showNumbers;
    updateNumButtonStyle();
    renderPuzzle();
}

function updateNumButtonStyle() {
    const btn = document.getElementById('puzzle-num-toggle');
    if (!btn) return;
    if (showNumbers) {
        btn.style.background = '#ffd700';
        btn.style.color = '#1a1a2e';
        btn.textContent = '🔢 数字';
    } else {
        btn.style.background = '#6c757d';
        btn.style.color = '#fff';
        btn.textContent = '🔢 数字';
    }
}

// ======================================================================
//  打乱拼图（确保有解）
// ======================================================================
function startPuzzleGame() {
    if (puzzleTimer) { clearInterval(puzzleTimer); puzzleTimer = null; }
    
    const size = puzzleGrid * puzzleGrid;
    puzzleBoard = [];
    for (let i = 0; i < size; i++) {
        puzzleBoard[i] = i;
    }
    puzzleMoves = 0;
    puzzleSeconds = 0;
    puzzleStarted = false;
    puzzleWon = false;
    document.getElementById('puzzle-board').classList.remove('win');

    const shuffleSteps = PUZZLE_CONFIG.shuffleFactor[puzzleDifficulty] || 30;
    let blankIndex = size - 1;
    
    for (let step = 0; step < shuffleSteps; step++) {
        const neighbors = getNeighborIndices(blankIndex);
        if (neighbors.length === 0) continue;
        const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
        puzzleBoard[blankIndex] = puzzleBoard[randomNeighbor];
        puzzleBoard[randomNeighbor] = size - 1;
        blankIndex = randomNeighbor;
    }

    if (isPuzzleSolved()) {
        for (let step = 0; step < 10; step++) {
            const neighbors = getNeighborIndices(blankIndex);
            if (neighbors.length === 0) continue;
            const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
            puzzleBoard[blankIndex] = puzzleBoard[randomNeighbor];
            puzzleBoard[randomNeighbor] = size - 1;
            blankIndex = randomNeighbor;
        }
    }

    updatePuzzleStats();
    renderPuzzle();
}

// ======================================================================
//  获取相邻索引
// ======================================================================
function getNeighborIndices(index) {
    const row = Math.floor(index / puzzleGrid);
    const col = index % puzzleGrid;
    const neighbors = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < puzzleGrid && nc >= 0 && nc < puzzleGrid) {
            neighbors.push(nr * puzzleGrid + nc);
        }
    }
    return neighbors;
}

function getBlankIndex() {
    const size = puzzleGrid * puzzleGrid;
    for (let i = 0; i < size; i++) {
        if (puzzleBoard[i] === size - 1) return i;
    }
    return size - 1;
}

function isPuzzleSolved() {
    const size = puzzleGrid * puzzleGrid;
    for (let i = 0; i < size; i++) {
        if (puzzleBoard[i] !== i) return false;
    }
    return true;
}

// ======================================================================
//  尝试移动
// ======================================================================
function tryMoveTile(tileIndex) {
    if (puzzleWon) return false;
    
    const blankIndex = getBlankIndex();
    const tileRow = Math.floor(tileIndex / puzzleGrid);
    const tileCol = tileIndex % puzzleGrid;
    const blankRow = Math.floor(blankIndex / puzzleGrid);
    const blankCol = blankIndex % puzzleGrid;
    
    const dr = Math.abs(tileRow - blankRow);
    const dc = Math.abs(tileCol - blankCol);
    
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        const size = puzzleGrid * puzzleGrid;
        puzzleBoard[blankIndex] = puzzleBoard[tileIndex];
        puzzleBoard[tileIndex] = size - 1;
        
        if (!puzzleStarted) startPuzzleTimer();
        puzzleMoves++;
        updatePuzzleStats();
        renderPuzzle();
        
        if (isPuzzleSolved()) {
            puzzleWon = true;
            if (puzzleTimer) { clearInterval(puzzleTimer); puzzleTimer = null; }
            document.getElementById('puzzle-board').classList.add('win');
            setTimeout(() => showPuzzleWinModal(), 500);
        }
        return true;
    }
    return false;
}

// ======================================================================
//  计时器
// ======================================================================
function startPuzzleTimer() {
    if (puzzleTimer) return;
    puzzleStarted = true;
    puzzleTimer = setInterval(() => {
        puzzleSeconds++;
        updatePuzzleStats();
    }, 1000);
}

function updatePuzzleStats() {
    const movesEl = document.getElementById('puzzle-moves');
    const timeEl = document.getElementById('puzzle-time');
    if (movesEl) movesEl.textContent = puzzleMoves;
    if (timeEl) {
        const m = String(Math.floor(puzzleSeconds / 60)).padStart(2, '0');
        const s = String(puzzleSeconds % 60).padStart(2, '0');
        timeEl.textContent = `${m}:${s}`;
    }
}

// ======================================================================
//  ★★★ 核心算法：生成完整图像并分割 ★★★
//  使用 Canvas 2D API 和纯数学函数绘制一幅完整的精美图像，
//  然后按格子数量将图像分割成多个小块，每个小块作为格子的背景。
//  当所有格子回归正确位置时，还原出完整的画面 — 如同真实拼图！
// ======================================================================

function generateFullImageAndSplit() {
    const canvas = document.createElement('canvas');
    const size = PUZZLE_CONFIG.canvasSize;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // ★ 绘制一幅完整的数学函数图像
    drawMathImage(ctx, size);
    
    const grid = puzzleGrid;
    tileImages = [];
    
    // ★ 将完整 Canvas 切分为 grid×grid 个图片片段
    const tileW = Math.floor(size / grid);
    const tileH = Math.floor(size / grid);
    
    for (let tileNum = 0; tileNum < grid * grid; tileNum++) {
        const row = Math.floor(tileNum / grid);
        const col = tileNum % grid;
        
        const sx = col * tileW;
        const sy = row * tileH;
        
        // 截取对应区域的 Canvas，导出为 base64 dataURL
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = tileW;
        tileCanvas.height = tileH;
        const tileCtx = tileCanvas.getContext('2d');
        tileCtx.drawImage(canvas, sx, sy, tileW, tileH, 0, 0, tileW, tileH);
        
        tileImages[tileNum] = tileCanvas.toDataURL();
    }
}

// ======================================================================
//  ★★★ 绘制数学函数生成的图像 ★★★
//  在 512×512 Canvas 上，用纯像素级数学公式绘制精美图案
//  三种主题：极光梦境、几何万花筒、星云漩涡
// ======================================================================
function drawMathImage(ctx, size) {
    const theme = puzzleTheme;
    const seed = Date.now() % 10000;
    
    switch (theme) {
        case 'aurora':
            drawAurora(ctx, size, seed);
            break;
        case 'kaleidoscope':
            drawKaleidoscope(ctx, size, seed);
            break;
        case 'nebula':
            drawNebula(ctx, size, seed);
            break;
        default:
            drawAurora(ctx, size, seed);
    }
}

// -------- 主题1：极光梦境 (Aurora) --------
// 使用多层不同频率和相位的正弦波叠加，
// 产生极光般流动的彩色光带效果，色彩渐变自然
function drawAurora(ctx, size, seed) {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    const palette = PUZZLE_THEMES.aurora.colors.map(c => hexToRgb(c));
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const nx = x / size; // 归一化 0~1
            const ny = y / size;
            
            // 第1层：水平方向的主极光带
            const w1 = Math.sin(nx * 8 + ny * 3 + seed * 0.01) * 0.5 + 0.5;
            // 第2层：垂直波动的副光带
            const w2 = Math.sin(ny * 12 - nx * 5 + seed * 0.008 + 1.2) * 0.5 + 0.5;
            // 第3层：对角交叉的涟漪
            const w3 = Math.sin((nx + ny) * 10 + seed * 0.012) * 0.5 + 0.5;
            // 第4层：精细纹理
            const w4 = Math.sin(nx * 20 + ny * 15 + seed * 0.006) * 0.5 + 0.5;
            // 第5层：从中心向外扩散的波纹
            const dist = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2) * 1.5;
            const w5 = Math.sin(dist * 10 - seed * 0.005) * 0.5 + 0.5;
            
            // 混合各层，产生丰富的色彩变化
            const mix = (w1 * 0.30 + w2 * 0.25 + w3 * 0.20 + w4 * 0.15 + w5 * 0.10);
            
            // 根据混合值在调色板中插值取色
            const idx = mix * (palette.length - 1);
            const i1 = Math.min(Math.floor(idx), palette.length - 1);
            const i2 = Math.min(i1 + 1, palette.length - 1);
            const t = idx - Math.floor(idx);
            
            const pixelIdx = (y * size + x) * 4;
            data[pixelIdx]     = lerp(palette[i1][0], palette[i2][0], t);
            data[pixelIdx + 1] = lerp(palette[i1][1], palette[i2][1], t);
            data[pixelIdx + 2] = lerp(palette[i1][2], palette[i2][2], t);
            data[pixelIdx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

// -------- 主题2：几何万花筒 (Kaleidoscope) --------
// 使用极坐标和角度对称变换，生成万花筒般的绚丽几何图案。
// 通过多角度反射和径向变形创造丰富的对称视觉效果
function drawKaleidoscope(ctx, size, seed) {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    const palette = PUZZLE_THEMES.kaleidoscope.colors.map(c => hexToRgb(c));
    
    const cx = size / 2;
    const cy = size / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
            let angle = Math.atan2(dy, dx);
            
            // ★ 万花筒核心：N重角度对称 + 折叠反射
            const symmetry = 6 + (seed % 300) % 3; // 6~8 重对称
            angle = angle * symmetry;
            angle = Math.abs(angle % (Math.PI * 2)); // 折叠反射
            
            // 多种数学变换叠加
            const r1 = Math.sin(dist * 12 + seed * 0.01) * 0.5 + 0.5;
            const r2 = Math.cos(angle * 2 + dist * 8) * 0.5 + 0.5;
            const r3 = Math.sin(angle * 3 + dist * 6 + seed * 0.008) * 0.5 + 0.5;
            const spiral = Math.sin(angle + dist * 15 - seed * 0.01) * 0.5 + 0.5;
            
            // 花瓣效果：随距离衰减的对称花瓣
            const petal = Math.pow(Math.abs(Math.cos(angle * (symmetry / 2))), 0.5 + dist * 2);
            const petalMix = (1 - dist) * petal * 0.6 + (1 - dist) * 0.2;
            
            const mix = (r1 * 0.25 + r2 * 0.20 + r3 * 0.20 + spiral * 0.15 + petalMix * 0.20);
            
            const idx = mix * (palette.length - 1);
            const i1 = Math.min(Math.floor(idx), palette.length - 1);
            const i2 = Math.min(i1 + 1, palette.length - 1);
            const t = idx - Math.floor(idx);
            
            const pixelIdx = (y * size + x) * 4;
            data[pixelIdx]     = lerp(palette[i1][0], palette[i2][0], t);
            data[pixelIdx + 1] = lerp(palette[i1][1], palette[i2][1], t);
            data[pixelIdx + 2] = lerp(palette[i1][2], palette[i2][2], t);
            data[pixelIdx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

// -------- 主题3：星云漩涡 (Nebula) --------
// 使用类 Julia 集的分形迭代算法，生成宇宙星云般深邃的图案，
// 结合漩涡和星光效果，创造梦幻的太空感
function drawNebula(ctx, size, seed) {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    const palette = PUZZLE_THEMES.nebula.colors.map(c => hexToRgb(c));
    
    // Julia 集复平面参数（每局不同）
    const jr = -0.7 + (seed % 100) * 0.002;
    const ji = 0.27 + (seed % 50) * 0.003;
    const offsetX = (seed % 200) * 0.001;
    const offsetY = (seed % 150) * 0.001;
    const maxIter = 40 + (seed % 20);
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            // 映射到复平面范围 (-1.5 ~ 1.5)
            let zx = (x / size) * 3.0 - 1.5 + offsetX;
            let zy = (y / size) * 3.0 - 1.5 + offsetY;
            
            // 分形迭代
            let iter = 0;
            while (zx * zx + zy * zy < 4 && iter < maxIter) {
                const xt = zx * zx - zy * zy + jr;
                zy = 2.0 * zx * zy + ji;
                zx = xt;
                iter++;
            }
            
            const smooth = iter / maxIter;
            
            // 叠加漩涡效果
            const dx = x / size - 0.5;
            const dy = y / size - 0.5;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const swirl = Math.sin(dist * 20 - seed * 0.005 + Math.atan2(dy, dx) * 3) * 0.5 + 0.5;
            
            // 星云发光效果：中心亮、边缘暗
            const glow = Math.exp(-dist * 3) * 0.3 + Math.exp(-dist * 8) * 0.2;
            
            let mix = smooth * 0.6 + swirl * 0.3 + glow;
            mix = Math.min(Math.max(mix, 0), 1);
            
            // 在深空区域点缀星光
            if (iter < 3) {
                const starNoise = Math.sin(x * 127.1 + y * 311.7 + seed) * 0.5 + 0.5;
                if (starNoise > 0.995) {
                    mix = 1.0; // 亮星
                } else if (starNoise > 0.98) {
                    mix = Math.min(mix + 0.3, 1.0); // 暗星
                }
            }
            
            const idx = mix * (palette.length - 1);
            const i1 = Math.min(Math.floor(idx), palette.length - 1);
            const i2 = Math.min(i1 + 1, palette.length - 1);
            const t = idx - Math.floor(idx);
            
            const pixelIdx = (y * size + x) * 4;
            data[pixelIdx]     = lerp(palette[i1][0], palette[i2][0], t);
            data[pixelIdx + 1] = lerp(palette[i1][1], palette[i2][1], t);
            data[pixelIdx + 2] = lerp(palette[i1][2], palette[i2][2], t);
            data[pixelIdx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

// ======================================================================
//  工具函数
// ======================================================================

// 十六进制颜色转 RGB 数组
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : [0, 0, 0];
}

// 线性插值
function lerp(a, b, t) {
    return Math.round(a + (b - a) * t);
}

// ======================================================================
//  渲染拼图棋盘
// ======================================================================
function renderPuzzle() {
    const boardEl = document.getElementById('puzzle-board');
    if (!boardEl) return;
    boardEl.innerHTML = '';
    
    const size = puzzleGrid * puzzleGrid;
    const blankIndex = getBlankIndex();
    const imagesReady = tileImages.length === size;
    
    boardEl.style.gridTemplateColumns = `repeat(${puzzleGrid}, 1fr)`;
    boardEl.style.gridTemplateRows = `repeat(${puzzleGrid}, 1fr)`;
    
    for (let i = 0; i < size; i++) {
        const tileValue = puzzleBoard[i];
        const tile = document.createElement('div');
        tile.className = 'puzzle-tile';
        tile.dataset.index = i;
        
        const isBlank = (tileValue === size - 1);
        
        if (isBlank) {
            tile.classList.add('empty');
        } else {
            const tileNum = tileValue;
            
            // ★ 使用从完整图像中截取的真实图片片段作为背景
            if (imagesReady && tileImages[tileNum]) {
                tile.style.backgroundImage = `url('${tileImages[tileNum]}')`;
                tile.style.backgroundSize = 'cover';
                tile.style.backgroundPosition = 'center';
                tile.style.backgroundRepeat = 'no-repeat';
            }
            
            // 编号标签
            const label = document.createElement('span');
            label.className = 'tile-label';
            label.textContent = tileNum + 1;
            if (!showNumbers) {
                label.style.display = 'none';
            }
            tile.appendChild(label);
            
            // 点击事件
            tile.addEventListener('click', (function(idx) {
                return function(e) {
                    e.stopPropagation();
                    tryMoveTile(idx);
                };
            })(i));
            
            // 触摸事件
            tile.addEventListener('touchstart', (function(idx) {
                return function(e) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    touchStartTime = Date.now();
                    touchTargetTile = idx;
                };
            })(i));
            
            tile.addEventListener('touchmove', (function(idx) {
                return function(e) {
                    e.preventDefault();
                };
            })(i));
            
            tile.addEventListener('touchend', (function(idx) {
                return function(e) {
                    if (touchTargetTile === null) return;
                    const dt = Date.now() - touchStartTime;
                    if (dt > 500) {
                        touchTargetTile = null;
                        return;
                    }
                    const touchEnd = e.changedTouches[0];
                    const dx = touchEnd.clientX - touchStartX;
                    const dy = touchEnd.clientY - touchStartY;
                    const absDx = Math.abs(dx);
                    const absDy = Math.abs(dy);
                    const minSwipe = 10;
                    
                    if (absDx < minSwipe && absDy < minSwipe) {
                        touchTargetTile = null;
                        return;
                    }
                    
                    const blankIdx = getBlankIndex();
                    const bRow = Math.floor(blankIdx / puzzleGrid);
                    const bCol = blankIdx % puzzleGrid;
                    
                    let targetIdx = -1;
                    if (absDx > absDy) {
                        if (dx > 0) {
                            if (bCol + 1 < puzzleGrid) targetIdx = blankIdx + 1;
                        } else {
                            if (bCol - 1 >= 0) targetIdx = blankIdx - 1;
                        }
                    } else {
                        if (dy > 0) {
                            if (bRow + 1 < puzzleGrid) targetIdx = blankIdx + puzzleGrid;
                        } else {
                            if (bRow - 1 >= 0) targetIdx = blankIdx - puzzleGrid;
                        }
                    }
                    
                    if (targetIdx >= 0 && targetIdx < size && puzzleBoard[targetIdx] !== size - 1) {
                        tryMoveTile(targetIdx);
                    }
                    touchTargetTile = null;
                };
            })(i));
        }
        
        boardEl.appendChild(tile);
    }
}

// ======================================================================
//  预览完整图案
// ======================================================================
function showPuzzlePreview() {
    if (isPreviewOpen) {
        closePuzzlePreview();
        return;
    }
    
    const previewArea = document.getElementById('puzzle-preview-area');
    if (!previewArea) return;
    
    // ★ 重新生成完整的 Canvas 图像用于预览
    const canvas = document.createElement('canvas');
    const size = PUZZLE_CONFIG.canvasSize;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    drawMathImage(ctx, size);
    
    previewArea.innerHTML = '';
    previewArea.style.display = 'flex';
    previewArea.style.alignItems = 'center';
    previewArea.style.justifyContent = 'center';
    previewArea.style.background = '#2a1f3d';
    previewArea.style.padding = '4px';
    previewArea.style.borderRadius = '12px';
    previewArea.style.border = '3px solid rgba(0, 212, 255, 0.4)';
    previewArea.style.width = 'min(80vw, 320px)';
    previewArea.style.height = 'min(80vw, 320px)';
    previewArea.style.margin = '12px auto';
    previewArea.style.overflow = 'hidden';
    
    // ★ 显示完整图像（而非一个个小格子）
    const img = document.createElement('img');
    img.src = canvas.toDataURL();
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '8px';
    img.alt = '完整图案预览';
    
    previewArea.appendChild(img);
    
    document.getElementById('puzzle-preview-modal').classList.add('show');
    isPreviewOpen = true;
}

function closePuzzlePreview() {
    document.getElementById('puzzle-preview-modal').classList.remove('show');
    isPreviewOpen = false;
}

// ======================================================================
//  胜利弹窗
// ======================================================================
function showPuzzleWinModal() {
    const themeData = PUZZLE_THEMES[puzzleTheme];
    const themeName = themeData ? themeData.name : '未知';
    const gridDesc = `${puzzleGrid}×${puzzleGrid}`;
    
    const size = puzzleGrid * puzzleGrid;
    const optimalMoves = size * 2;
    let rating = '⭐⭐⭐';
    let ratingText = '大师级';
    if (puzzleMoves <= optimalMoves) {
        rating = '⭐⭐⭐';
        ratingText = '大师级';
    } else if (puzzleMoves <= optimalMoves * 2) {
        rating = '⭐⭐';
        ratingText = '优秀';
    } else {
        rating = '⭐';
        ratingText = '继续加油';
    }
    
    const timeStr = formatPuzzleTime(puzzleSeconds);
    
    document.getElementById('modal-title').textContent = '🎉 拼图完成！';
    document.getElementById('modal-msg').innerHTML = `
        主题: ${themeData.icon} ${themeName} (${gridDesc})<br>
        步数: ${puzzleMoves} 步 | 用时: ${timeStr}<br>
        评级: ${rating} ${ratingText}
    `;
    document.getElementById('modal-content').className = 'modal-content win';
    document.getElementById('game-modal').classList.add('show');
    
    const modalBtn = document.querySelector('#game-modal .modal-btn');
    modalBtn.onclick = function() {
        closeModal();
    };
}

function formatPuzzleTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

function closeModal() {
    document.getElementById('game-modal').classList.remove('show');
    resetPuzzleGame();
}

// ======================================================================
//  键盘快捷键
// ======================================================================
document.addEventListener('keydown', (e) => {
    const gameArea = document.getElementById('puzzle');
    if (!gameArea) return;
    
    const key = e.key;
    const blankIdx = getBlankIndex();
    const bRow = Math.floor(blankIdx / puzzleGrid);
    const bCol = blankIdx % puzzleGrid;
    const size = puzzleGrid * puzzleGrid;
    
    let targetIdx = -1;
    
    switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (bRow + 1 < puzzleGrid) targetIdx = blankIdx + puzzleGrid;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (bRow - 1 >= 0) targetIdx = blankIdx - puzzleGrid;
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (bCol + 1 < puzzleGrid) targetIdx = blankIdx + 1;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (bCol - 1 >= 0) targetIdx = blankIdx - 1;
            break;
        case ' ':
            e.preventDefault();
            startPuzzleGame();
            return;
        case 'r':
        case 'R':
            resetPuzzleGame();
            return;
        case 'p':
        case 'P':
            showPuzzlePreview();
            return;
        case 'n':
        case 'N':
            togglePuzzleNumbers();
            return;
    }
    
    if (targetIdx >= 0 && targetIdx < size && puzzleBoard[targetIdx] !== size - 1) {
        e.preventDefault();
        tryMoveTile(targetIdx);
    }
});
