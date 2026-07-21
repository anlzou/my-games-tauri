// ==================== 2048 ====================
let game2048Grid = [], game2048Score = 0, game2048High = localStorage.getItem('game2048High') || 0;
let game2048Size = 4, game2048Diff = 'medium';
const game2048DiffConfig = { easy: 3, medium: 4, hard: 5 };
document.getElementById('game2048-high').textContent = game2048High;

function set2048Diff(diff) {
    game2048Diff = diff;
    game2048Size = game2048DiffConfig[diff];
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    newGame2048();
}

function newGame2048() {
    game2048Grid = Array(game2048Size).fill().map(() => Array(game2048Size).fill(0));
    game2048Score = 0;
    updateGame2048UI();
    addRandomTile();
    addRandomTile();
    renderGame2048();
}

function addRandomTile() {
    const emptyCells = [];
    for (let r = 0; r < game2048Size; r++) {
        for (let c = 0; c < game2048Size; c++) {
            if (game2048Grid[r][c] === 0) emptyCells.push({ r, c });
        }
    }
    if (emptyCells.length === 0) return false;
    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    game2048Grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    return true;
}

function renderGame2048() {
    const gridEl = document.getElementById('game2048-grid');
    gridEl.innerHTML = '';
    for (let r = 0; r < game2048Size; r++) {
        for (let c = 0; c < game2048Size; c++) {
            if (game2048Grid[r][c] !== 0) {
                const cell = document.createElement('div');
                cell.className = 'game2048-cell';
                cell.textContent = game2048Grid[r][c];
                cell.setAttribute('data-val', game2048Grid[r][c]);
                const cellSize = 100 / game2048Size;
                const gap = 8;
                const padding = 8;
                cell.style.left = `${c * cellSize + padding / cellSize}%`;
                cell.style.top = `${r * cellSize + padding / cellSize}%`;
                cell.style.width = `calc(${cellSize}% - ${gap}px)`;
                cell.style.height = `calc(${cellSize}% - ${gap}px)`;
                gridEl.appendChild(cell);
            }
        }
    }
}

function updateGame2048UI() {
    document.getElementById('game2048-score').textContent = game2048Score;
    document.getElementById('game2048-high').textContent = game2048High;
}

function moveGame2048(direction) {
    let moved = false;
    const newGrid = game2048Grid.map(row => [...row]);
    const mergedPositions = [];

    if (direction === 'left' || direction === 'right') {
        for (let r = 0; r < game2048Size; r++) {
            let row = newGrid[r].filter(val => val !== 0);
            if (direction === 'right') row.reverse();
            for (let i = 0; i < row.length - 1; i++) {
                if (row[i] === row[i + 1]) {
                    row[i] *= 2;
                    game2048Score += row[i];
                    row.splice(i + 1, 1);
                    const col = direction === 'right' ? game2048Size - 1 - i : i;
                    mergedPositions.push({ r, c: col });
                }
            }
            while (row.length < game2048Size) row.push(0);
            if (direction === 'right') row.reverse();
            if (row.join(',') !== newGrid[r].join(',')) moved = true;
            newGrid[r] = row;
        }
    } else {
        for (let c = 0; c < game2048Size; c++) {
            let col = [];
            for (let r = 0; r < game2048Size; r++) col.push(newGrid[r][c]);
            col = col.filter(val => val !== 0);
            if (direction === 'down') col.reverse();
            for (let i = 0; i < col.length - 1; i++) {
                if (col[i] === col[i + 1]) {
                    col[i] *= 2;
                    game2048Score += col[i];
                    col.splice(i + 1, 1);
                    const row = direction === 'down' ? game2048Size - 1 - i : i;
                    mergedPositions.push({ r: row, c });
                }
            }
            while (col.length < game2048Size) col.push(0);
            if (direction === 'down') col.reverse();
            for (let r = 0; r < game2048Size; r++) {
                if (newGrid[r][c] !== col[r]) moved = true;
                newGrid[r][c] = col[r];
            }
        }
    }

    if (moved) {
        game2048Grid = newGrid;
        addRandomTile();
        renderGame2048();
        const cells = document.querySelectorAll('.game2048-cell');
        cells.forEach(cell => {
            const cellRow = parseInt(cell.style.top) / (100 / game2048Size);
            const cellCol = parseInt(cell.style.left) / (100 / game2048Size);
            if (mergedPositions.some(pos => pos.r === cellRow && pos.c === cellCol)) {
                cell.classList.add('merged');
                setTimeout(() => cell.classList.remove('merged'), 300);
            }
        });
        const newCells = document.querySelectorAll('.game2048-cell.new');
        newCells.forEach(cell => {
            cell.classList.add('new');
            setTimeout(() => cell.classList.remove('new'), 300);
        });
        updateGame2048UI();
        if (game2048Score > game2048High) {
            game2048High = game2048Score;
            localStorage.setItem('game2048High', game2048High);
            updateGame2048UI();
        }
        checkWinGame2048();
    }
}

function checkWinGame2048() {
    for (let r = 0; r < game2048Size; r++) {
        for (let c = 0; c < game2048Size; c++) {
            if (game2048Grid[r][c] === 2048) {
                showModal('🎉 恭喜通关！', `得分: ${game2048Score} | 难度: ${game2048Diff}`, true);
                return;
            }
        }
    }
    let canMove = false;
    for (let r = 0; r < game2048Size; r++) {
        for (let c = 0; c < game2048Size; c++) {
            if (game2048Grid[r][c] === 0) { canMove = true; break; }
            if (c < game2048Size - 1 && game2048Grid[r][c] === game2048Grid[r][c + 1]) { canMove = true; break; }
            if (r < game2048Size - 1 && game2048Grid[r][c] === game2048Grid[r + 1][c]) { canMove = true; break; }
        }
        if (canMove) break;
    }
    if (!canMove) {
        showModal('💥 游戏结束', `得分: ${game2048Score} | 难度: ${game2048Diff}`, false);
    }
}

document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp': moveGame2048('up'); break;
        case 'ArrowDown': moveGame2048('down'); break;
        case 'ArrowLeft': moveGame2048('left'); break;
        case 'ArrowRight': moveGame2048('right'); break;
    }
});

let touchStartX = 0, touchStartY = 0;
const game2048GridEl = document.getElementById('game2048-grid');
game2048GridEl.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
}, { passive: false });
game2048GridEl.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
game2048GridEl.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > 30) {
            if (dx > 0) moveGame2048('right');
            else moveGame2048('left');
        }
    } else {
        if (Math.abs(dy) > 30) {
            if (dy > 0) moveGame2048('down');
            else moveGame2048('up');
        }
    }
    e.preventDefault();
}, { passive: false });

// 关闭弹窗后重置游戏（不刷新页面，避免加载动画）
function closeModal() {
    document.getElementById('game-modal').classList.remove('show');
    newGame2048();
}

newGame2048();
