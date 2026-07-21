// ==================== 记忆翻牌 ====================
let memoryDiff = 'easy';
const memoryDiffConfig = {
    easy: { rows: 3, cols: 4 },
    medium: { rows: 4, cols: 4 },
    hard: { rows: 4, cols: 6 }
};
const memoryIcons = ['🍎','🚗','🐱','🌸','🍀','🌙','⭐','🔥','❤️','🎵','⚽','🎁'];
let memoryCards = [];
let memoryFlipped = [];
let memoryMoves = 0;
let memoryMatchedPairs = 0;
let memoryTotalPairs = 0;
let memoryLock = false;

function setMemoryDiff(diff) {
    memoryDiff = diff;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function newMemoryGame() {
    const cfg = memoryDiffConfig[memoryDiff];
    memoryTotalPairs = (cfg.rows * cfg.cols) / 2;
    memoryMatchedPairs = 0;
    memoryMoves = 0;
    memoryFlipped = [];
    memoryLock = false;
    const selectedIcons = memoryIcons.slice(0, memoryTotalPairs);
    const cardIcons = [...selectedIcons, ...selectedIcons];
    for (let i = cardIcons.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardIcons[i], cardIcons[j]] = [cardIcons[j], cardIcons[i]];
    }
    memoryCards = cardIcons.map((icon, i) => ({
        icon, flipped: false, matched: false, id: i
    }));
    renderMemoryGrid();
    updateMemoryUI();
    startTimer('memory-timer');
}

function renderMemoryGrid() {
    const grid = document.getElementById('memory-grid');
    grid.innerHTML = '';
    const cfg = memoryDiffConfig[memoryDiff];
    grid.style.gridTemplateColumns = `repeat(${cfg.cols}, 1fr)`;
    memoryCards.forEach((card, i) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'memory-card';
        if (card.flipped || card.matched) cardEl.classList.add('flipped');
        if (card.matched) cardEl.classList.add('matched');
        cardEl.innerHTML = `
            <div class="memory-card-inner">
                <div class="memory-card-front">?</div>
                <div class="memory-card-back">${card.icon}</div>
            </div>
        `;
        cardEl.onclick = () => handleMemoryClick(i);
        grid.appendChild(cardEl);
    });
}

function handleMemoryClick(idx) {
    if (memoryLock) return;
    if (memoryCards[idx].flipped || memoryCards[idx].matched) return;
    memoryCards[idx].flipped = true;
    memoryFlipped.push(idx);
    renderMemoryGrid();
    if (memoryFlipped.length === 2) {
        memoryMoves++;
        updateMemoryUI();
        const [i1, i2] = memoryFlipped;
        if (memoryCards[i1].icon === memoryCards[i2].icon) {
            memoryCards[i1].matched = true;
            memoryCards[i2].matched = true;
            memoryMatchedPairs++;
            memoryFlipped = [];
            updateMemoryUI();
            renderMemoryGrid();
            if (memoryMatchedPairs === memoryTotalPairs) {
                stopTimer();
                const mins = Math.floor(seconds / 60), secs = seconds % 60;
                showModal('🎉 恭喜通关！', `用时: ${mins}分${secs}秒 | 步数: ${memoryMoves} | 难度: ${memoryDiff}`, true);
            }
        } else {
            memoryLock = true;
            setTimeout(() => {
                memoryCards[i1].flipped = false;
                memoryCards[i2].flipped = false;
                memoryFlipped = [];
                memoryLock = false;
                renderMemoryGrid();
            }, 900);
        }
    }
}

function updateMemoryUI() {
    document.getElementById('memory-moves').textContent = memoryMoves;
    document.getElementById('memory-left').textContent = memoryTotalPairs - memoryMatchedPairs;
}

// 关闭弹窗后重置游戏（不刷新页面，避免加载动画）
function closeModal() {
    document.getElementById('game-modal').classList.remove('show');
    newMemoryGame();
}

newMemoryGame();
