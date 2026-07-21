// ==================== 扫雷 ====================
let mineBoard = [], mineRevealed = [], mineFlagged = [];
let mineRows = 9, mineCols = 9, mineCount = 10;
let mineGameOver = false, mineFirstClick = true;
let mineTimer = 0, mineTimerInterval = null;
let flagMode = false, mineDiff = 'easy';
const mineDiffConfig = { easy: { rows: 9, cols: 9, mines: 10 }, medium: { rows: 16, cols: 16, mines: 40 }, hard: { rows: 16, cols: 30, mines: 99 } };

// 自定义配置
let customConfig = { rows: 9, cols: 9, mines: 10 };

function setMineDiff(diff) {
    mineDiff = diff;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    if (diff !== 'custom') {
        event.target.classList.add('active');
        const cfg = mineDiffConfig[diff];
        mineRows = cfg.rows; mineCols = cfg.cols; mineCount = cfg.mines;
    } else {
        // 自定义模式使用 customConfig
        mineRows = customConfig.rows; mineCols = customConfig.cols; mineCount = customConfig.mines;
    }
}

function toggleFlagMode() {
    flagMode = !flagMode;
    document.getElementById('flag-toggle').classList.toggle('active', flagMode);
    document.getElementById('flag-status').textContent = flagMode ? '开启' : '关闭';
}

function newMineGame() {
    mineBoard = Array(mineRows).fill().map(() => Array(mineCols).fill(0));
    mineRevealed = Array(mineRows).fill().map(() => Array(mineCols).fill(false));
    mineFlagged = Array(mineRows).fill().map(() => Array(mineCols).fill(false));
    mineGameOver = false; mineFirstClick = true; mineTimer = 0;
    if (mineTimerInterval) clearInterval(mineTimerInterval);
    document.getElementById('mine-timer').textContent = '0';
    document.getElementById('mine-count').textContent = mineCount;
    document.getElementById('flag-count').textContent = '0';
    renderMineGrid();
}

function resetMineGame() { newMineGame(); }

function placeMines(excludeR, excludeC) {
    let placed = 0;
    while (placed < mineCount) {
        const r = Math.floor(Math.random() * mineRows), c = Math.floor(Math.random() * mineCols);
        if (mineBoard[r][c] !== -1 && !(r === excludeR && c === excludeC)) { mineBoard[r][c] = -1; placed++; }
    }
    for (let r = 0; r < mineRows; r++) for (let c = 0; c < mineCols; c++) {
        if (mineBoard[r][c] === -1) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < mineRows && nc >= 0 && nc < mineCols && mineBoard[nr][nc] === -1) count++;
        }
        mineBoard[r][c] = count;
    }
}

function revealCell(r, c) {
    if (r < 0 || r >= mineRows || c < 0 || c >= mineCols) return;
    if (mineRevealed[r][c] || mineFlagged[r][c]) return;
    // 绝对不能揭开炸弹
    if (mineBoard[r][c] === -1) return;
    mineRevealed[r][c] = true;
    if (mineBoard[r][c] === 0)
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) revealCell(r + dr, c + dc);
}

function handleMineClick(r, c) {
    if (mineGameOver) return;
    if (mineFirstClick) {
        placeMines(r, c);
        mineFirstClick = false;
        mineTimerInterval = setInterval(() => { mineTimer++; document.getElementById('mine-timer').textContent = mineTimer; }, 1000);
    }
    if (flagMode) { if (!mineRevealed[r][c]) { mineFlagged[r][c] = !mineFlagged[r][c]; updateFlagCount(); } }
    else {
        if (mineFlagged[r][c]) return;
        if (mineBoard[r][c] === -1) {
            mineGameOver = true; clearInterval(mineTimerInterval);
            for (let i = 0; i < mineRows; i++) for (let j = 0; j < mineCols; j++) if (mineBoard[i][j] === -1) mineRevealed[i][j] = true;
            renderMineGrid();
            showModal('💥 踩到雷了！', `用时: ${mineTimer}秒 | 难度: ${mineDiff}`, false);
            return;
        }
        revealCell(r, c);
    }
    renderMineGrid();
    checkWinMine();
}

function handleMineRightClick(r, c, e) {
    e.preventDefault();
    if (mineGameOver || mineFirstClick) return;
    if (!mineRevealed[r][c]) { mineFlagged[r][c] = !mineFlagged[r][c]; updateFlagCount(); renderMineGrid(); checkWinMine(); }
}

function updateFlagCount() {
    let count = 0;
    for (let r = 0; r < mineRows; r++) for (let c = 0; c < mineCols; c++) if (mineFlagged[r][c]) count++;
    document.getElementById('flag-count').textContent = count;
}

function checkWinMine() {
    let revealedCount = 0;
    for (let r = 0; r < mineRows; r++) for (let c = 0; c < mineCols; c++) if (mineRevealed[r][c]) revealedCount++;
    if (revealedCount === mineRows * mineCols - mineCount) {
        mineGameOver = true; clearInterval(mineTimerInterval);
        showModal('🎉 扫雷成功！', `用时: ${mineTimer}秒 | 难度: ${mineDiff}`, true);
    }
}

function renderMineGrid() {
    const gridEl = document.getElementById('mine-grid');
    gridEl.innerHTML = '';
    // 适配较大的格子，列数多时用较小的尺寸
    const cellSize = mineCols > 25 ? 'min(28px, 5vw)' : (mineCols > 15 ? 'min(30px, 6vw)' : 'clamp(28px, 8vw, 40px)');
    gridEl.style.gridTemplateColumns = `repeat(${mineCols}, ${cellSize})`;
    // 网格始终居中显示，超出容器时会自动在两侧产生等宽间隙
    // 配合外层 .minesweeper-wrapper 的 overflow:auto 支持双向滚动
    for (let r = 0; r < mineRows; r++) {
        for (let c = 0; c < mineCols; c++) {
            const cell = document.createElement('div');
            cell.className = 'mine-cell';
            cell.style.width = cellSize;
            cell.style.height = cellSize;
            if (mineRows > 20 || mineCols > 20) {
                cell.style.fontSize = '0.65em';
            }
            if (mineRevealed[r][c]) {
                cell.classList.add('revealed');
                if (mineBoard[r][c] === -1) { cell.classList.add('mine'); cell.textContent = '💣'; }
                else if (mineBoard[r][c] > 0) { cell.classList.add(`num-${mineBoard[r][c]}`); cell.textContent = mineBoard[r][c]; }
            } else if (mineFlagged[r][c]) { cell.classList.add('flagged'); cell.textContent = '🚩'; }
            cell.onclick = () => handleMineClick(r, c);
            cell.oncontextmenu = (e) => handleMineRightClick(r, c, e);
            gridEl.appendChild(cell);
        }
    }
}

// ==================== 自定义设置 ====================
function openCustomSettings() {
    // 填充当前值到表单
    document.getElementById('custom-rows').value = mineRows;
    document.getElementById('custom-cols').value = mineCols;
    document.getElementById('custom-mines').value = mineCount;
    document.getElementById('custom-modal').classList.add('show');
}

function closeCustomSettings() {
    document.getElementById('custom-modal').classList.remove('show');
}

function applyCustomSettings() {
    const rowsInput = document.getElementById('custom-rows');
    const colsInput = document.getElementById('custom-cols');
    const minesInput = document.getElementById('custom-mines');

    let rows = parseInt(rowsInput.value);
    let cols = parseInt(colsInput.value);
    let mines = parseInt(minesInput.value);

    // 校验输入
    rows = Math.max(5, Math.min(40, rows));
    cols = Math.max(5, Math.min(40, cols));
    const maxMines = rows * cols - 1;
    mines = Math.max(1, Math.min(maxMines, mines));

    // 更新输入框显示修正后的值
    rowsInput.value = rows;
    colsInput.value = cols;
    minesInput.value = mines;

    // 保存自定义配置
    customConfig.rows = rows;
    customConfig.cols = cols;
    customConfig.mines = mines;

    // 切换到自定义模式
    mineDiff = 'custom';
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    mineRows = rows;
    mineCols = cols;
    mineCount = mines;

    closeCustomSettings();
    resetMineGame();
}

function randomCustomSettings() {
    // 随机生成行数 5-40
    const rows = Math.floor(Math.random() * 36) + 5;
    // 随机生成列数 5-40
    const cols = Math.floor(Math.random() * 36) + 5;
    // 随机生成炸弹数：格子总数的 5% ~ 30%，至少1颗
    const totalCells = rows * cols;
    const minMines = 1;
    const maxMines = Math.floor(totalCells * 0.3);
    const mines = Math.max(minMines, Math.floor(Math.random() * maxMines) + 1);

    // 填入表单
    document.getElementById('custom-rows').value = rows;
    document.getElementById('custom-cols').value = cols;
    document.getElementById('custom-mines').value = mines;
}

// 关闭弹窗后重置游戏（不刷新页面，避免加载动画）
function closeModal() {
    document.getElementById('game-modal').classList.remove('show');
    resetMineGame();
}

newMineGame();
