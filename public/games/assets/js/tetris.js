// ==================== 俄罗斯方块 ====================
const TETRIS_COLS = 10, TETRIS_ROWS = 20;
const tetrisCanvas = document.getElementById('tetris-canvas');
const tetrisCtx = tetrisCanvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const SHAPES = [
    [[1,1,1,1]], [[1,1],[1,1]], [[0,1,0],[1,1,1]],
    [[1,1,0],[0,1,1]], [[0,1,1],[1,1,0]], [[1,0,0],[1,1,1]], [[0,0,1],[1,1,1]]
];
const COLORS = ['#00f0f0','#f0f000','#a000f0','#00f000','#f00000','#f0a000','#0000f0'];
let board = [], currentPiece = null, nextPiece = null;
let tetrisScore = 0, tetrisLines = 0, tetrisLevel = 1;
let tetrisGameLoop = null, tetrisPaused = false, tetrisDiff = 'easy';
const tetrisDiffConfig = { easy: 800, medium: 500, hard: 300, insane: 150 };

function getTetrisBlockSize() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        const displayWidth = tetrisCanvas.clientWidth || 300;
        return Math.floor(displayWidth / TETRIS_COLS);
    }
    return 30;
}

function getNextBlockSize() {
    const isMobile = window.innerWidth <= 768;
    return isMobile ? 16 : 25;
}

function setTetrisDiff(diff) {
    tetrisDiff = diff;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function initTetris() {
    board = Array(TETRIS_ROWS).fill().map(() => Array(TETRIS_COLS).fill(0));
    tetrisScore = 0; tetrisLines = 0; tetrisLevel = 1; tetrisPaused = false;
    document.getElementById('tetris-pause-btn').textContent = '暂停';
    nextPiece = createPiece(); spawnPiece(); updateTetrisUI();
}

function createPiece() {
    const type = Math.floor(Math.random() * SHAPES.length);
    return { shape: SHAPES[type].map(row => [...row]), color: COLORS[type],
        x: Math.floor(TETRIS_COLS / 2) - Math.floor(SHAPES[type][0].length / 2), y: 0 };
}

function spawnPiece() {
    currentPiece = nextPiece; nextPiece = createPiece(); drawNext();
    if (collision(currentPiece, 0, 0)) gameOverTetris();
}

function collision(piece, dx, dy) {
    for (let y = 0; y < piece.shape.length; y++)
        for (let x = 0; x < piece.shape[y].length; x++)
            if (piece.shape[y][x]) {
                const nx = piece.x + x + dx, ny = piece.y + y + dy;
                if (nx < 0 || nx >= TETRIS_COLS || ny >= TETRIS_ROWS) return true;
                if (ny >= 0 && board[ny][nx]) return true;
            }
    return false;
}

function rotatePiece() {
    const rotated = currentPiece.shape[0].map((_, i) => currentPiece.shape.map(row => row[i]).reverse());
    const oldShape = currentPiece.shape; currentPiece.shape = rotated;
    if (collision(currentPiece, 0, 0)) currentPiece.shape = oldShape;
}

function mergePiece() {
    currentPiece.shape.forEach((row, y) => row.forEach((cell, x) => {
        if (cell && currentPiece.y + y >= 0) board[currentPiece.y + y][currentPiece.x + x] = currentPiece.color;
    }));
}

function clearLines() {
    let cleared = 0;
    for (let y = TETRIS_ROWS - 1; y >= 0; y--)
        if (board[y].every(c => c !== 0)) { board.splice(y, 1); board.unshift(Array(TETRIS_COLS).fill(0)); cleared++; y++; }
    if (cleared > 0) {
        tetrisLines += cleared;
        tetrisScore += [0, 100, 300, 500, 800][cleared] * tetrisLevel;
        tetrisLevel = Math.floor(tetrisLines / 10) + 1;
        updateTetrisUI();
    }
}

function startTetris() {
    if (tetrisGameLoop) clearInterval(tetrisGameLoop);
    initTetris();
    tetrisGameLoop = setInterval(gameStepTetris, tetrisDiffConfig[tetrisDiff]);
}

function pauseTetris() {
    tetrisPaused = !tetrisPaused;
    const btn = document.getElementById('tetris-pause-btn');
    btn.textContent = tetrisPaused ? '继续' : '暂停';
}

function resetTetris() {
    if (tetrisGameLoop) clearInterval(tetrisGameLoop);
    initTetris(); drawTetris();
}

function gameStepTetris() {
    if (tetrisPaused) return;
    if (!collision(currentPiece, 0, 1)) currentPiece.y++;
    else { mergePiece(); clearLines(); spawnPiece(); }
    drawTetris();
}

function hardDrop() {
    while (!collision(currentPiece, 0, 1)) { currentPiece.y++; tetrisScore += 2; }
    mergePiece(); clearLines(); spawnPiece(); drawTetris(); updateTetrisUI();
}

function handleTetrisBtn(e, action) {
    if (e.cancelable) e.preventDefault();
    if (!currentPiece || tetrisPaused) return;
    switch (action) {
        case 'left': if (!collision(currentPiece, -1, 0)) currentPiece.x--; break;
        case 'right': if (!collision(currentPiece, 1, 0)) currentPiece.x++; break;
        case 'rotate': rotatePiece(); break;
        case 'down': if (!collision(currentPiece, 0, 1)) { currentPiece.y++; tetrisScore += 1; updateTetrisUI(); } break;
        case 'drop': hardDrop(); return;
    }
    drawTetris();
}

function drawTetris() {
    const bs = getTetrisBlockSize();
    const w = TETRIS_COLS * bs, h = TETRIS_ROWS * bs;
    if (tetrisCanvas.width !== w || tetrisCanvas.height !== h) {
        tetrisCanvas.width = w; tetrisCanvas.height = h;
    }
    tetrisCtx.fillStyle = '#1a0a0a'; tetrisCtx.fillRect(0, 0, w, h);
    tetrisCtx.strokeStyle = '#2a1a1a';
    for (let i = 0; i <= TETRIS_COLS; i++) { tetrisCtx.beginPath(); tetrisCtx.moveTo(i * bs, 0); tetrisCtx.lineTo(i * bs, h); tetrisCtx.stroke(); }
    for (let i = 0; i <= TETRIS_ROWS; i++) { tetrisCtx.beginPath(); tetrisCtx.moveTo(0, i * bs); tetrisCtx.lineTo(w, i * bs); tetrisCtx.stroke(); }
    board.forEach((row, y) => row.forEach((cell, x) => {
        if (cell) { tetrisCtx.fillStyle = cell; tetrisCtx.fillRect(x * bs + 1, y * bs + 1, bs - 2, bs - 2); }
    }));
    if (currentPiece) {
        tetrisCtx.fillStyle = currentPiece.color; tetrisCtx.shadowColor = currentPiece.color; tetrisCtx.shadowBlur = 10;
        currentPiece.shape.forEach((row, y) => row.forEach((cell, x) => {
            if (cell) tetrisCtx.fillRect((currentPiece.x + x) * bs + 1, (currentPiece.y + y) * bs + 1, bs - 2, bs - 2);
        }));
        tetrisCtx.shadowBlur = 0;
    }
}

function drawNext() {
    const mobileCanvas = document.getElementById('next-canvas');
    if (mobileCanvas) {
        const mCtx = mobileCanvas.getContext('2d');
        const bs = getNextBlockSize();
        const size = 6 * bs;
        if (mobileCanvas.width !== size || mobileCanvas.height !== size) {
            mobileCanvas.width = size; mobileCanvas.height = size;
        }
        mCtx.fillStyle = '#1a0a0a'; mCtx.fillRect(0, 0, size, size);
        if (nextPiece) {
            const ox = (size - nextPiece.shape[0].length * bs) / 2;
            const oy = (size - nextPiece.shape.length * bs) / 2;
            mCtx.fillStyle = nextPiece.color; mCtx.shadowColor = nextPiece.color; mCtx.shadowBlur = 10;
            nextPiece.shape.forEach((row, y) => row.forEach((cell, x) => {
                if (cell) mCtx.fillRect(ox + x * bs + 1, oy + y * bs + 1, bs - 2, bs - 2);
            }));
            mCtx.shadowBlur = 0;
        }
    }

    const desktopCanvas = document.getElementById('next-canvas-desktop');
    if (desktopCanvas) {
        const dCtx = desktopCanvas.getContext('2d');
        const bs = 25;
        const size = 6 * bs;
        if (desktopCanvas.width !== size || desktopCanvas.height !== size) {
            desktopCanvas.width = size; desktopCanvas.height = size;
        }
        dCtx.fillStyle = '#1a0a0a'; dCtx.fillRect(0, 0, size, size);
        if (nextPiece) {
            const ox = (size - nextPiece.shape[0].length * bs) / 2;
            const oy = (size - nextPiece.shape.length * bs) / 2;
            dCtx.fillStyle = nextPiece.color; dCtx.shadowColor = nextPiece.color; dCtx.shadowBlur = 10;
            nextPiece.shape.forEach((row, y) => row.forEach((cell, x) => {
                if (cell) dCtx.fillRect(ox + x * bs + 1, oy + y * bs + 1, bs - 2, bs - 2);
            }));
            dCtx.shadowBlur = 0;
        }
    }
}

function updateTetrisUI() {
    const scoreEl = document.getElementById('tetris-score');
    const linesEl = document.getElementById('tetris-lines');
    const levelEl = document.getElementById('tetris-level');
    if(scoreEl) scoreEl.textContent = tetrisScore;
    if(linesEl) linesEl.textContent = tetrisLines;
    if(levelEl) levelEl.textContent = tetrisLevel;

    const scoreDesktopEl = document.getElementById('tetris-score-desktop');
    const linesDesktopEl = document.getElementById('tetris-lines-desktop');
    const levelDesktopEl = document.getElementById('tetris-level-desktop');
    if(scoreDesktopEl) scoreDesktopEl.textContent = tetrisScore;
    if(linesDesktopEl) linesDesktopEl.textContent = tetrisLines;
    if(levelDesktopEl) levelDesktopEl.textContent = tetrisLevel;
}

function gameOverTetris() {
    clearInterval(tetrisGameLoop);
    showModal('💥 游戏结束', `得分: ${tetrisScore} | 消除: ${tetrisLines}行 | 等级: ${tetrisLevel}`, false);
}

document.addEventListener('keydown', (e) => {
    if (!currentPiece || tetrisPaused) return;
    switch (e.key) {
        case 'ArrowLeft': handleTetrisBtn({preventDefault:()=>{}}, 'left'); break;
        case 'ArrowRight': handleTetrisBtn({preventDefault:()=>{}}, 'right'); break;
        case 'ArrowUp': handleTetrisBtn({preventDefault:()=>{}}, 'rotate'); break;
        case 'ArrowDown': handleTetrisBtn({preventDefault:()=>{}}, 'down'); break;
        case ' ': e.preventDefault(); handleTetrisBtn({preventDefault:()=>{}}, 'drop'); break;
    }
});

window.addEventListener('resize', () => { drawTetris(); drawNext(); });

function toggleTetrisDrawer(type) {
    const section = document.getElementById(type === 'next' ? 'drawer-next' : 'drawer-info');
    const btn = document.getElementById(type === 'next' ? 'toggle-next-btn' : 'toggle-info-btn');
    section.classList.toggle('show');
    btn.classList.toggle('active');
    const anyOpen = document.getElementById('drawer-next').classList.contains('show') || 
                    document.getElementById('drawer-info').classList.contains('show');
    if (anyOpen) {
        setTimeout(() => {
            document.addEventListener('touchstart', closeDrawerOnOutsideClick, { passive: false });
            document.addEventListener('mousedown', closeDrawerOnOutsideClick);
        }, 50);
    } else {
        document.removeEventListener('touchstart', closeDrawerOnOutsideClick);
        document.removeEventListener('mousedown', closeDrawerOnOutsideClick);
    }
}

function closeDrawerOnOutsideClick(e) {
    const nextBtn = document.getElementById('toggle-next-btn');
    const infoBtn = document.getElementById('toggle-info-btn');
    if (nextBtn.contains(e.target)) { toggleTetrisDrawer('next'); }
    else if (infoBtn.contains(e.target)) { toggleTetrisDrawer('info'); }
    document.removeEventListener('touchstart', closeDrawerOnOutsideClick);
    document.removeEventListener('mousedown', closeDrawerOnOutsideClick);
}

// 关闭弹窗后重置游戏（不刷新页面，避免加载动画）
function closeModal() {
    document.getElementById('game-modal').classList.remove('show');
    resetTetris();
}

initTetris(); drawTetris();
