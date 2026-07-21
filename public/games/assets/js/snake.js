// ==================== 贪吃蛇 ====================
let snake = [], food = {}, direction = 'right', nextDirection = 'right';
let snakeScore = 0, snakeHigh = localStorage.getItem('snakeHigh') || 0;
let snakeGameLoop = null, snakeSpeed = 150, snakePaused = false, snakeDiff = 'easy';
const snakeCanvas = document.getElementById('snake-canvas');
const snakeCtx = snakeCanvas.getContext('2d');
const GRID_SIZE = 20, TILE_COUNT = 20;
const snakeDiffConfig = { easy: 180, medium: 120, hard: 80, insane: 50 };
document.getElementById('snake-high').textContent = snakeHigh;

function setSnakeDiff(diff) {
    snakeDiff = diff; snakeSpeed = snakeDiffConfig[diff];
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function initSnake() {
    snake = [{ x: 10, y: 10 }];
    direction = 'right'; nextDirection = 'right';
    snakeScore = 0; snakePaused = false;
    document.getElementById('snake-pause-btn').textContent = '暂停';
    placeFood(); updateSnakeUI();
}

function placeFood() {
    do { food = { x: Math.floor(Math.random() * TILE_COUNT), y: Math.floor(Math.random() * TILE_COUNT) }; }
    while (snake.some(s => s.x === food.x && s.y === food.y));
}

function startSnake() {
    if (snakeGameLoop) clearInterval(snakeGameLoop);
    initSnake();
    snakeGameLoop = setInterval(gameStepSnake, snakeSpeed);
}

function pauseSnake() {
    snakePaused = !snakePaused;
    const btn = document.getElementById('snake-pause-btn');
    btn.textContent = snakePaused ? '继续' : '暂停';
}

function resetSnake() {
    if (snakeGameLoop) clearInterval(snakeGameLoop);
    initSnake(); drawSnake();
}

function handleDpad(e, dir) {
    if (e.cancelable) e.preventDefault();
    if (snakePaused) return;
    const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
    if (direction !== opposites[dir]) nextDirection = dir;
}

function gameStepSnake() {
    if (snakePaused) return;
    direction = nextDirection;
    const head = { ...snake[0] };
    switch (direction) {
        case 'up': head.y--; break; case 'down': head.y++; break;
        case 'left': head.x--; break; case 'right': head.x++; break;
    }
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT ||
        snake.some(s => s.x === head.x && s.y === head.y)) { gameOverSnake(); return; }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
        snakeScore += 10;
        if (snakeScore > snakeHigh) { snakeHigh = snakeScore; localStorage.setItem('snakeHigh', snakeHigh); }
        placeFood();
    } else snake.pop();
    updateSnakeUI(); drawSnake();
}

function updateSnakeUI() {
    document.getElementById('snake-score').textContent = snakeScore;
    document.getElementById('snake-high').textContent = snakeHigh;
    document.getElementById('snake-len').textContent = snake.length;
}

function drawSnake() {
    snakeCtx.fillStyle = '#0a0a1a';
    snakeCtx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);
    snakeCtx.strokeStyle = '#1a1a3a';
    for (let i = 0; i <= TILE_COUNT; i++) {
        snakeCtx.beginPath(); snakeCtx.moveTo(i * GRID_SIZE, 0); snakeCtx.lineTo(i * GRID_SIZE, snakeCanvas.height); snakeCtx.stroke();
        snakeCtx.beginPath(); snakeCtx.moveTo(0, i * GRID_SIZE); snakeCtx.lineTo(snakeCanvas.width, i * GRID_SIZE); snakeCtx.stroke();
    }
    snakeCtx.fillStyle = '#ff4444'; snakeCtx.shadowColor = '#ff4444'; snakeCtx.shadowBlur = 10;
    snakeCtx.fillRect(food.x * GRID_SIZE + 2, food.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
    snakeCtx.shadowBlur = 0;
    snake.forEach((s, i) => {
        const color = i === 0 ? '#00ff88' : '#00cc6a';
        snakeCtx.fillStyle = color; snakeCtx.shadowColor = color; snakeCtx.shadowBlur = i === 0 ? 15 : 5;
        snakeCtx.fillRect(s.x * GRID_SIZE + 1, s.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        snakeCtx.shadowBlur = 0;
    });
}

function gameOverSnake() {
    clearInterval(snakeGameLoop);
    showModal('💥 游戏结束', `得分: ${snakeScore} | 长度: ${snake.length} | 难度: ${snakeDiff}`, false);
}

document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': handleDpad({preventDefault:()=>{}}, 'up'); break;
        case 'ArrowDown': case 's': case 'S': handleDpad({preventDefault:()=>{}}, 'down'); break;
        case 'ArrowLeft': case 'a': case 'A': handleDpad({preventDefault:()=>{}}, 'left'); break;
        case 'ArrowRight': case 'd': case 'D': handleDpad({preventDefault:()=>{}}, 'right'); break;
        case ' ': e.preventDefault(); pauseSnake(); break;
    }
});

// 关闭弹窗后重置游戏（不刷新页面，避免加载动画）
function closeModal() {
    document.getElementById('game-modal').classList.remove('show');
    resetSnake();
}

initSnake(); drawSnake();
