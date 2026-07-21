// ==================== 打砖块 ====================
const breakoutCanvas = document.getElementById('breakout-canvas');
const breakoutCtx = breakoutCanvas.getContext('2d');
let breakoutGameLoop = null, breakoutPaused = false, breakoutDiff = 'easy';
let breakoutScore = 0, breakoutLives = 3;
let paddle = { x: 0, y: 0, width: 80, height: 10, dx: 8 };
let ball = { x: 0, y: 0, radius: 6, dx: 0, dy: 0 };
let bricks = [];
const BRICK_ROW_COUNT = 5;
const BRICK_COLUMN_COUNT = 8;
const BRICK_PADDING = 5;
const BRICK_OFFSET_TOP = 40;
const BRICK_OFFSET_LEFT = 25;
let brickWidth = 0, brickHeight = 15;
const breakoutDiffConfig = { easy: 3, medium: 4, hard: 5.5, insane: 7 };
let breakoutKeys = { left: false, right: false };

function setBreakoutDiff(diff) {
    breakoutDiff = diff;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function resizeBreakoutCanvas() {
    const maxWidth = Math.min(480, window.innerWidth - 32);
    breakoutCanvas.width = maxWidth;
    breakoutCanvas.height = Math.floor(maxWidth * 0.667);
    paddle.width = Math.max(60, breakoutCanvas.width * 0.18);
    paddle.height = Math.max(8, breakoutCanvas.height * 0.03);
    paddle.y = breakoutCanvas.height - paddle.height - 10;
    ball.radius = Math.max(4, breakoutCanvas.width * 0.012);
}

function createBricks() {
    bricks = [];
    brickWidth = (breakoutCanvas.width - (BRICK_OFFSET_LEFT * 2) - (BRICK_PADDING * (BRICK_COLUMN_COUNT - 1))) / BRICK_COLUMN_COUNT;
    brickHeight = Math.max(12, breakoutCanvas.height * 0.045);
    const colors = ['#ff6b6b', '#f9ca24', '#6c5ce7', '#00d4ff', '#00ff88'];
    for (let r = 0; r < BRICK_ROW_COUNT; r++) {
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            bricks.push({
                x: BRICK_OFFSET_LEFT + c * (brickWidth + BRICK_PADDING),
                y: BRICK_OFFSET_TOP + r * (brickHeight + BRICK_PADDING),
                width: brickWidth,
                height: brickHeight,
                color: colors[r % colors.length],
                visible: true
            });
        }
    }
}

function resetBall() {
    ball.x = breakoutCanvas.width / 2;
    ball.y = breakoutCanvas.height - 30;
    const baseSpeed = breakoutDiffConfig[breakoutDiff] * (breakoutCanvas.width / 480);
    const angle = (Math.random() * 60 + 60) * Math.PI / 180;
    ball.dx = baseSpeed * Math.cos(angle) * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = -baseSpeed * Math.sin(angle);
}

function initBreakout() {
    resizeBreakoutCanvas();
    paddle.x = (breakoutCanvas.width - paddle.width) / 2;
    breakoutScore = 0;
    breakoutLives = 3;
    breakoutPaused = false;
    breakoutKeys = { left: false, right: false };
    const btn = document.getElementById('breakout-pause-btn');
    if (btn) btn.textContent = '暂停';
    updateBreakoutUI();
    createBricks();
    resetBall();
    initBreakoutTouchButtons();
}

function startBreakout() {
    if (breakoutGameLoop) cancelAnimationFrame(breakoutGameLoop);
    initBreakout();
    breakoutPaused = false;
    gameLoopBreakout();
}

function pauseBreakout() {
    breakoutPaused = !breakoutPaused;
    const btn = document.getElementById('breakout-pause-btn');
    if (btn) btn.textContent = breakoutPaused ? '继续' : '暂停';
    if (!breakoutPaused) gameLoopBreakout();
}

function resetBreakout() {
    if (breakoutGameLoop) cancelAnimationFrame(breakoutGameLoop);
    initBreakout();
    drawBreakout();
}

function gameLoopBreakout() {
    if (breakoutPaused) return;
    updateBreakout();
    drawBreakout();
    breakoutGameLoop = requestAnimationFrame(gameLoopBreakout);
}

function updateBreakout() {
    if (breakoutKeys.left) { paddle.x = Math.max(0, paddle.x - paddle.dx * 1.5); }
    if (breakoutKeys.right) { paddle.x = Math.min(breakoutCanvas.width - paddle.width, paddle.x + paddle.dx * 1.5); }
    ball.x += ball.dx;
    ball.y += ball.dy;
    if (ball.x + ball.radius > breakoutCanvas.width || ball.x - ball.radius < 0) { ball.dx = -ball.dx; }
    if (ball.y - ball.radius < 0) { ball.dy = -ball.dy; }
    if (ball.y - ball.radius > breakoutCanvas.height) {
        breakoutLives--;
        updateBreakoutUI();
        if (breakoutLives <= 0) { gameOverBreakout(); return; }
        resetBall();
        return;
    }
    if (ball.y + ball.radius > paddle.y &&
        ball.y - ball.radius < paddle.y + paddle.height &&
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.width) {
        const hitPoint = ball.x - (paddle.x + paddle.width / 2);
        const normalized = hitPoint / (paddle.width / 2);
        const angle = normalized * (Math.PI / 3);
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        ball.dx = speed * Math.sin(angle);
        ball.dy = -Math.abs(speed * Math.cos(angle));
    }
    for (let b of bricks) {
        if (!b.visible) continue;
        if (ball.x > b.x && ball.x < b.x + b.width &&
            ball.y > b.y && ball.y < b.y + b.height) {
            b.visible = false;
            ball.dy = -ball.dy;
            breakoutScore += 10;
            updateBreakoutUI();
            break;
        }
    }
    if (bricks.every(b => !b.visible)) { gameWinBreakout(); }
}

function drawBreakout() {
    breakoutCtx.fillStyle = '#0a0a1a';
    breakoutCtx.fillRect(0, 0, breakoutCanvas.width, breakoutCanvas.height);
    for (let b of bricks) {
        if (!b.visible) continue;
        breakoutCtx.fillStyle = b.color;
        breakoutCtx.shadowColor = b.color;
        breakoutCtx.shadowBlur = 6;
        breakoutCtx.fillRect(b.x + 1, b.y + 1, b.width - 2, b.height - 2);
        breakoutCtx.shadowBlur = 0;
    }
    breakoutCtx.fillStyle = '#00d4ff';
    breakoutCtx.shadowColor = '#00d4ff';
    breakoutCtx.shadowBlur = 12;
    breakoutCtx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    breakoutCtx.shadowBlur = 0;
    breakoutCtx.beginPath();
    breakoutCtx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    breakoutCtx.fillStyle = '#ffd700';
    breakoutCtx.shadowColor = '#ffd700';
    breakoutCtx.shadowBlur = 10;
    breakoutCtx.fill();
    breakoutCtx.shadowBlur = 0;
    breakoutCtx.closePath();
}

function updateBreakoutUI() {
    const scoreEl = document.getElementById('breakout-score');
    const livesEl = document.getElementById('breakout-lives');
    if (scoreEl) scoreEl.textContent = breakoutScore;
    if (livesEl) livesEl.textContent = breakoutLives;
}

function gameOverBreakout() {
    if (breakoutGameLoop) cancelAnimationFrame(breakoutGameLoop);
    showModal('💥 游戏结束', `得分: ${breakoutScore} | 难度: ${breakoutDiff}`, false);
}

function gameWinBreakout() {
    if (breakoutGameLoop) cancelAnimationFrame(breakoutGameLoop);
    showModal('🎉 恭喜通关！', `得分: ${breakoutScore} | 剩余生命: ${breakoutLives} | 难度: ${breakoutDiff}`, true);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { breakoutKeys.left = true; }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { breakoutKeys.right = true; }
    else if (e.key === ' ') { e.preventDefault(); pauseBreakout(); }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { breakoutKeys.left = false; }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { breakoutKeys.right = false; }
});

breakoutCanvas.addEventListener('touchstart', (e) => {}, { passive: true });
breakoutCanvas.addEventListener('touchmove', (e) => {
    const rect = breakoutCanvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const scaleX = breakoutCanvas.width / rect.width;
    paddle.x = Math.max(0, Math.min(breakoutCanvas.width - paddle.width, touchX * scaleX - paddle.width / 2));
}, { passive: true });

function initBreakoutTouchButtons() {
    const leftBtn = document.getElementById('breakout-btn-left');
    const rightBtn = document.getElementById('breakout-btn-right');
    if (!leftBtn || !rightBtn) return;
    const newLeftBtn = leftBtn.cloneNode(true);
    const newRightBtn = rightBtn.cloneNode(true);
    leftBtn.parentNode.replaceChild(newLeftBtn, leftBtn);
    rightBtn.parentNode.replaceChild(newRightBtn, rightBtn);
    newLeftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); breakoutKeys.left = true; }, { passive: false });
    newLeftBtn.addEventListener('touchend', (e) => { e.preventDefault(); breakoutKeys.left = false; }, { passive: false });
    newLeftBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); breakoutKeys.left = false; }, { passive: false });
    newRightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); breakoutKeys.right = true; }, { passive: false });
    newRightBtn.addEventListener('touchend', (e) => { e.preventDefault(); breakoutKeys.right = false; }, { passive: false });
    newRightBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); breakoutKeys.right = false; }, { passive: false });
    newLeftBtn.addEventListener('mousedown', (e) => { e.preventDefault(); breakoutKeys.left = true; });
    newLeftBtn.addEventListener('mouseup', (e) => { e.preventDefault(); breakoutKeys.left = false; });
    newLeftBtn.addEventListener('mouseleave', (e) => { breakoutKeys.left = false; });
    newRightBtn.addEventListener('mousedown', (e) => { e.preventDefault(); breakoutKeys.right = true; });
    newRightBtn.addEventListener('mouseup', (e) => { e.preventDefault(); breakoutKeys.right = false; });
    newRightBtn.addEventListener('mouseleave', (e) => { breakoutKeys.right = false; });
}

window.addEventListener('resize', () => {
    resizeBreakoutCanvas();
    paddle.y = breakoutCanvas.height - paddle.height - 10;
    drawBreakout();
});

// 关闭弹窗后重置游戏（不刷新页面，避免加载动画）
function closeModal() {
    document.getElementById('game-modal').classList.remove('show');
    resetBreakout();
}

initBreakout(); drawBreakout();
