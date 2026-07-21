// ==================== 数独 ====================
let sudokuGrid = [], sudokuSolution = [], sudokuFixed = [];
let selectedCell = null, sudokuDiff = 'easy';
const sudokuDiffConfig = { easy: 35, medium: 45, hard: 55, expert: 64 };

function setSudokuDiff(diff) {
    sudokuDiff = diff;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function generateSudoku() {
    const grid = Array(9).fill().map(() => Array(9).fill(0));
    function isValid(g, row, col, num) {
        for (let x = 0; x < 9; x++) if (g[row][x] === num) return false;
        for (let x = 0; x < 9; x++) if (g[x][col] === num) return false;
        const sr = row - row % 3, sc = col - col % 3;
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
            if (g[i + sr][j + sc] === num) return false;
        return true;
    }
    function solve(g) {
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
            if (g[r][c] === 0) {
                const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
                for (let n of nums) {
                    if (isValid(g, r, c, n)) { g[r][c] = n; if (solve(g)) return true; g[r][c] = 0; }
                }
                return false;
            }
        return true;
    }
    solve(grid);
    return grid;
}

function newSudoku() {
    sudokuSolution = generateSudoku();
    sudokuGrid = sudokuSolution.map(row => [...row]);
    sudokuFixed = Array(9).fill().map(() => Array(9).fill(false));
    let removed = 0;
    while (removed < sudokuDiffConfig[sudokuDiff]) {
        const r = Math.floor(Math.random() * 9), c = Math.floor(Math.random() * 9);
        if (sudokuGrid[r][c] !== 0) { sudokuGrid[r][c] = 0; removed++; }
    }
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (sudokuGrid[r][c] !== 0) sudokuFixed[r][c] = true;
    selectedCell = null;
    renderSudoku();
    startTimer('sudoku-timer');
}

function renderSudoku() {
    const gridEl = document.getElementById('sudoku-grid');
    gridEl.innerHTML = '';
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement('div');
            cell.className = 'sudoku-cell';
            if (sudokuFixed[r][c]) cell.classList.add('fixed');
            if (selectedCell && selectedCell.r === r && selectedCell.c === c) cell.classList.add('selected');
            if (sudokuGrid[r][c] !== 0) {
                cell.textContent = sudokuGrid[r][c];
                if (!sudokuFixed[r][c] && !isValidSudoku(r, c, sudokuGrid[r][c])) cell.classList.add('error');
            }
            cell.onclick = () => selectCell(r, c);
            gridEl.appendChild(cell);
        }
    }
}

function selectCell(r, c) {
    if (sudokuFixed[r][c]) return;
    selectedCell = { r, c };
    renderSudoku();
}

function inputNumber(num) {
    if (!selectedCell || sudokuFixed[selectedCell.r][selectedCell.c]) return;
    sudokuGrid[selectedCell.r][selectedCell.c] = num === 0 ? 0 : num;
    renderSudoku();
    checkWinSudoku();
}

function isValidSudoku(row, col, num) {
    for (let x = 0; x < 9; x++) {
        if (x !== col && sudokuGrid[row][x] === num) return false;
        if (x !== row && sudokuGrid[x][col] === num) return false;
    }
    const sr = row - row % 3, sc = col - col % 3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
        if ((sr + i !== row || sc + j !== col) && sudokuGrid[sr + i][sc + j] === num) return false;
    return true;
}

function checkSudoku() {
    let errors = 0;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
        if (sudokuGrid[r][c] !== 0 && !isValidSudoku(r, c, sudokuGrid[r][c])) errors++;
    alert(errors === 0 ? '✅ 目前没有发现错误！' : `❌ 发现 ${errors} 处错误！`);
}

function checkWinSudoku() {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++)
        if (sudokuGrid[r][c] === 0 || !isValidSudoku(r, c, sudokuGrid[r][c])) return;
    stopTimer();
    const mins = Math.floor(seconds / 60), secs = seconds % 60;
    showModal('🎉 恭喜通关！', `用时: ${mins}分${secs}秒 | 难度: ${sudokuDiff}`, true);
}

function clearSudoku() {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!sudokuFixed[r][c]) sudokuGrid[r][c] = 0;
    renderSudoku();
}

document.addEventListener('keydown', (e) => {
    if (!selectedCell) return;
    const key = parseInt(e.key);
    if (key >= 1 && key <= 9) inputNumber(key);
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') inputNumber(0);
});

// 关闭弹窗后重置游戏（不刷新页面，避免加载动画）
function closeModal() {
    document.getElementById('game-modal').classList.remove('show');
    newSudoku();
}

newSudoku();
