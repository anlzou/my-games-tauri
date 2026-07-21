// ==================== 五子棋 ====================
let gomokuBoard = [], gomokuCurrentPlayer = 'black', gomokuMode = 'pvp';
let gomokuGameOver = false, gomokuWinner = null;
const gomokuSize = 15;
let gomokuStats = { black: 0, white: 0 };

function setGomokuMode(mode) {
    gomokuMode = mode;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    newGomokuGame();
}

function newGomokuGame() {
    gomokuBoard = Array(gomokuSize).fill().map(() => Array(gomokuSize).fill(null));
    gomokuCurrentPlayer = 'black';
    gomokuGameOver = false;
    gomokuWinner = null;
    updateGomokuUI();
    renderGomokuBoard();
}

function renderGomokuBoard() {
    const boardEl = document.getElementById('gomoku-board');
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${gomokuSize}, 1fr)`;
    for (let r = 0; r < gomokuSize; r++) {
        for (let c = 0; c < gomokuSize; c++) {
            const cell = document.createElement('div');
            cell.className = 'gomoku-cell';
            if (gomokuBoard[r][c]) {
                cell.classList.add(gomokuBoard[r][c]);
                if (r === gomokuBoard.lastMove?.r && c === gomokuBoard.lastMove?.c) {
                    cell.classList.add('last-move');
                }
            }
            cell.onclick = () => handleGomokuClick(r, c);
            boardEl.appendChild(cell);
        }
    }
}

function handleGomokuClick(r, c) {
    if (gomokuGameOver || gomokuBoard[r][c]) return;
    gomokuBoard[r][c] = gomokuCurrentPlayer;
    gomokuBoard.lastMove = { r, c };
    renderGomokuBoard();
    if (checkGomokuWin(r, c, gomokuCurrentPlayer)) {
        gomokuGameOver = true;
        gomokuWinner = gomokuCurrentPlayer;
        gomokuStats[gomokuCurrentPlayer]++;
        updateGomokuUI();
        showModal('🎉 游戏结束', `${gomokuCurrentPlayer === 'black' ? '黑方' : '白方'}获胜！`, true);
        return;
    }
    gomokuCurrentPlayer = gomokuCurrentPlayer === 'black' ? 'white' : 'black';
    updateGomokuUI();
    if (gomokuMode === 'pve' && gomokuCurrentPlayer === 'white' && !gomokuGameOver) {
        setTimeout(() => { makeComputerMove(); }, 500);
    }
}

function checkGomokuWin(r, c, player) {
    const directions = [
        [[0, 1], [0, -1]],
        [[1, 0], [-1, 0]],
        [[1, 1], [-1, -1]],
        [[1, -1], [-1, 1]]
    ];
    for (const dirPair of directions) {
        let count = 1;
        for (let i = 1; i < 5; i++) {
            const nr = r + dirPair[0][0] * i;
            const nc = c + dirPair[0][1] * i;
            if (nr >= 0 && nr < gomokuSize && nc >= 0 && nc < gomokuSize && gomokuBoard[nr][nc] === player) {
                count++;
            } else { break; }
        }
        for (let i = 1; i < 5; i++) {
            const nr = r + dirPair[1][0] * i;
            const nc = c + dirPair[1][1] * i;
            if (nr >= 0 && nr < gomokuSize && nc >= 0 && nc < gomokuSize && gomokuBoard[nr][nc] === player) {
                count++;
            } else { break; }
        }
        if (count >= 5) return true;
    }
    return false;
}

function evaluateGomokuPoint(r, c, player) {
    let score = 0;
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of directions) {
        let count = 1;
        let forwardEmpty = 0, forwardBlocked = false;
        for (let i = 1; i < 5; i++) {
            const nr = r + dr * i;
            const nc = c + dc * i;
            if (nr < 0 || nr >= gomokuSize || nc < 0 || nc >= gomokuSize) { forwardBlocked = true; break; }
            if (gomokuBoard[nr][nc] === player) { count++; }
            else if (gomokuBoard[nr][nc] === null) { forwardEmpty = 1; break; }
            else { forwardBlocked = true; break; }
        }
        let backwardEmpty = 0, backwardBlocked = false;
        for (let i = 1; i < 5; i++) {
            const nr = r - dr * i;
            const nc = c - dc * i;
            if (nr < 0 || nr >= gomokuSize || nc < 0 || nc >= gomokuSize) { backwardBlocked = true; break; }
            if (gomokuBoard[nr][nc] === player) { count++; }
            else if (gomokuBoard[nr][nc] === null) { backwardEmpty = 1; break; }
            else { backwardBlocked = true; break; }
        }
        let openEnds = (forwardEmpty ? 1 : 0) + (backwardEmpty ? 1 : 0);
        if (count >= 5) { score += 100000; }
        else if (count === 4) {
            if (openEnds === 2) score += 10000;
            else if (openEnds === 1) score += 5000;
            else score += 1000;
        } else if (count === 3) {
            if (openEnds === 2) score += 1000;
            else if (openEnds === 1) score += 500;
            else score += 100;
        } else if (count === 2) {
            if (openEnds === 2) score += 100;
            else if (openEnds === 1) score += 50;
            else score += 10;
        } else if (count === 1) {
            if (openEnds === 2) score += 10;
            else score += 5;
        }
    }
    return score;
}

function makeComputerMove() {
    if (gomokuGameOver) return;
    let bestScore = -Infinity;
    let bestMove = null;
    const center = Math.floor(gomokuSize / 2);
    let isEmpty = true;
    for (let r = 0; r < gomokuSize && isEmpty; r++) {
        for (let c = 0; c < gomokuSize; c++) {
            if (gomokuBoard[r][c]) { isEmpty = false; break; }
        }
    }
    if (isEmpty) { makeComputerMoveAt(center, center); return; }
    for (let r = 0; r < gomokuSize; r++) {
        for (let c = 0; c < gomokuSize; c++) {
            if (gomokuBoard[r][c]) continue;
            if (checkGomokuWin(r, c, 'white')) { makeComputerMoveAt(r, c); return; }
        }
    }
    for (let r = 0; r < gomokuSize; r++) {
        for (let c = 0; c < gomokuSize; c++) {
            if (gomokuBoard[r][c]) continue;
            if (checkGomokuWin(r, c, 'black')) { makeComputerMoveAt(r, c); return; }
        }
    }
    for (let r = 0; r < gomokuSize; r++) {
        for (let c = 0; c < gomokuSize; c++) {
            if (gomokuBoard[r][c]) continue;
            let nearPiece = false;
            for (let dr = -2; dr <= 2 && !nearPiece; dr++) {
                for (let dc = -2; dc <= 2; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < gomokuSize && nc >= 0 && nc < gomokuSize && gomokuBoard[nr][nc]) {
                        nearPiece = true; break;
                    }
                }
            }
            if (!nearPiece) continue;
            let attackScore = evaluateGomokuPoint(r, c, 'white');
            let defenseScore = evaluateGomokuPoint(r, c, 'black');
            let score = attackScore * 1.15 + defenseScore;
            const dist = Math.abs(r - center) + Math.abs(c - center);
            score += Math.max(0, (gomokuSize - dist)) * 3;
            score += Math.random() * 8;
            if (score > bestScore) {
                bestScore = score;
                bestMove = { r, c };
            }
        }
    }
    if (bestMove) { makeComputerMoveAt(bestMove.r, bestMove.c); }
    else {
        for (let r = 0; r < gomokuSize; r++) {
            for (let c = 0; c < gomokuSize; c++) {
                if (!gomokuBoard[r][c]) { makeComputerMoveAt(r, c); return; }
            }
        }
    }
}

function makeComputerMoveAt(r, c) {
    gomokuBoard[r][c] = 'white';
    gomokuBoard.lastMove = { r, c };
    renderGomokuBoard();
    if (checkGomokuWin(r, c, 'white')) {
        gomokuGameOver = true;
        gomokuWinner = 'white';
        gomokuStats.white++;
        updateGomokuUI();
        showModal('🎉 游戏结束', '白方获胜！', true);
    } else {
        gomokuCurrentPlayer = 'black';
        updateGomokuUI();
    }
}

function updateGomokuUI() {
    const blackPlayer = gomokuMode === 'pvp' ? '玩家1' : '玩家';
    const whitePlayer = gomokuMode === 'pvp' ? '玩家2' : '电脑';
    document.getElementById('gomoku-black').textContent = blackPlayer;
    document.getElementById('gomoku-white').textContent = whitePlayer;
    const blackWinsEl = document.getElementById('gomoku-black-wins');
    const whiteWinsEl = document.getElementById('gomoku-white-wins');
    if (blackWinsEl) blackWinsEl.textContent = gomokuStats.black;
    if (whiteWinsEl) whiteWinsEl.textContent = gomokuStats.white;
}

// 关闭弹窗后重置游戏（不刷新页面，避免加载动画）
function closeModal() {
    document.getElementById('game-modal').classList.remove('show');
    newGomokuGame();
}

newGomokuGame();
