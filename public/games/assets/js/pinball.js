// ==================== 见缝插针 ====================
const pinballCanvas = document.getElementById('pinball-canvas');
const pinCtx = pinballCanvas.getContext('2d');
let pinballGameLoop = null, pinballDiff = 'easy';
let pinballLevel = 1, pinballPins = [], pinballRemaining = 0, pinballAngle = 0;
let pinballGameOver = false, pinballSpeed = 0.02;
const pinballDiffConfig = { easy: 0.015, medium: 0.025, hard: 0.04 };
const PIN_LENGTH = 40, PIN_RADIUS = 6, CENTER_R = 30;
let flyingPin = null;

function normalizeAngle(angle) {
    angle = angle % (Math.PI * 2);
    if (angle < 0) angle += Math.PI * 2;
    return angle;
}

function setPinballDiff(diff) {
    pinballDiff = diff;
    pinballSpeed = pinballDiffConfig[diff];
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function initPinballLevel() {
    pinballPins = [];
    pinballGameOver = false;
    pinballAngle = 0;
    flyingPin = null;
    pinballRemaining = pinballLevel + 5;
    updatePinballUI();
}

function startPinball() {
    if (pinballGameLoop) cancelAnimationFrame(pinballGameLoop);
    pinballLevel = 1;
    pinballSpeed = pinballDiffConfig[pinballDiff];
    initPinballLevel();
    gameLoopPinball();
}

function resetPinball() {
    if (pinballGameLoop) cancelAnimationFrame(pinballGameLoop);
    pinballLevel = 1;
    initPinballLevel();
    drawPinball();
}

function insertPin() {
    if (pinballGameOver || pinballRemaining <= 0 || flyingPin) return;
    const w = pinballCanvas.width, h = pinballCanvas.height;
    const cx = w / 2, cy = h / 2;
    const normalizedPinballAngle = normalizeAngle(pinballAngle);
    let localAngle = normalizeAngle(-Math.PI / 2 - normalizedPinballAngle);
    for (let pin of pinballPins) {
        let diff = Math.abs(localAngle - pin.angle);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < 0.16) {
            pinballGameOver = true;
            if (pinballGameLoop) cancelAnimationFrame(pinballGameLoop);
            showModal('💥 游戏结束', `到达关卡: ${pinballLevel} | 难度: ${pinballDiff}`, false);
            return;
        }
    }
    const startX = cx;
    const startY = h - 40 - PIN_LENGTH;
    const endX = cx + Math.cos(localAngle + normalizedPinballAngle) * (CENTER_R + PIN_LENGTH);
    const endY = cy + Math.sin(localAngle + normalizedPinballAngle) * (CENTER_R + PIN_LENGTH);
    flyingPin = {
        localAngle: localAngle,
        fromX: startX,
        fromY: startY,
        toX: endX,
        toY: endY,
        progress: 0
    };
    pinballRemaining--;
    updatePinballUI();
}

function gameLoopPinball() {
    if (pinballGameOver) return;
    pinballAngle += pinballSpeed;
    if (flyingPin) {
        flyingPin.progress += 0.08;
        if (flyingPin.progress >= 1) {
            pinballPins.push({ angle: flyingPin.localAngle });
            flyingPin = null;
            if (pinballRemaining === 0) {
                drawPinball();
                setTimeout(() => {
                    pinballLevel++;
                    pinballSpeed += 0.002;
                    initPinballLevel();
                    gameLoopPinball();
                }, 500);
                return;
            }
        }
    }
    drawPinball();
    pinballGameLoop = requestAnimationFrame(gameLoopPinball);
}

function drawPinball() {
    const w = pinballCanvas.width, h = pinballCanvas.height;
    const cx = w / 2, cy = h / 2;
    pinCtx.fillStyle = '#1a1a2e';
    pinCtx.fillRect(0, 0, w, h);
    pinCtx.beginPath();
    pinCtx.arc(cx, cy, CENTER_R, 0, Math.PI * 2);
    pinCtx.fillStyle = '#2d3436';
    pinCtx.fill();
    pinCtx.strokeStyle = '#dfe6e9';
    pinCtx.lineWidth = 2;
    pinCtx.stroke();
    pinCtx.fillStyle = '#dfe6e9';
    pinCtx.font = 'bold 24px sans-serif';
    pinCtx.textAlign = 'center';
    pinCtx.textBaseline = 'middle';
    pinCtx.fillText(pinballLevel, cx, cy);
    pinCtx.save();
    pinCtx.translate(cx, cy);
    pinCtx.rotate(pinballAngle);
    pinballPins.forEach(pin => { drawPin(pin.angle, CENTER_R, PIN_LENGTH, PIN_RADIUS, '#00d4ff'); });
    pinCtx.restore();
    if (flyingPin) {
        const t = flyingPin.progress;
        const easeT = 1 - Math.pow(1 - t, 3);
        const curX = flyingPin.fromX + (flyingPin.toX - flyingPin.fromX) * easeT;
        const curY = flyingPin.fromY + (flyingPin.toY - flyingPin.fromY) * easeT;
        const dx = cx - curX;
        const dy = cy - curY;
        const angle = Math.atan2(dy, dx);
        pinCtx.save();
        pinCtx.translate(curX, curY);
        pinCtx.rotate(angle);
        pinCtx.beginPath();
        pinCtx.moveTo(0, 0);
        pinCtx.lineTo(-PIN_LENGTH, 0);
        pinCtx.strokeStyle = '#ff9f43';
        pinCtx.lineWidth = 3;
        pinCtx.stroke();
        pinCtx.beginPath();
        pinCtx.arc(-PIN_LENGTH, 0, PIN_RADIUS, 0, Math.PI * 2);
        pinCtx.fillStyle = '#ff9f43';
        pinCtx.fill();
        pinCtx.restore();
    }
    if (pinballRemaining > 0 && !flyingPin) {
        const waitingX = cx;
        const waitingY = h - 40;
        pinCtx.beginPath();
        pinCtx.moveTo(waitingX, waitingY);
        pinCtx.lineTo(waitingX, waitingY - PIN_LENGTH);
        pinCtx.strokeStyle = '#ff9f43';
        pinCtx.lineWidth = 3;
        pinCtx.stroke();
        pinCtx.beginPath();
        pinCtx.arc(waitingX, waitingY - PIN_LENGTH, PIN_RADIUS, 0, Math.PI * 2);
        pinCtx.fillStyle = '#ff9f43';
        pinCtx.fill();
        pinCtx.fillStyle = '#ff9f43';
        pinCtx.font = 'bold 14px sans-serif';
        pinCtx.textAlign = 'center';
        pinCtx.fillText(`×${pinballRemaining}`, waitingX, waitingY + 20);
    }
}

function drawPin(angle, centerR, length, radius, color) {
    const startX = Math.cos(angle) * centerR;
    const startY = Math.sin(angle) * centerR;
    const endX = Math.cos(angle) * (centerR + length);
    const endY = Math.sin(angle) * (centerR + length);
    pinCtx.beginPath();
    pinCtx.moveTo(startX, startY);
    pinCtx.lineTo(endX, endY);
    pinCtx.strokeStyle = color;
    pinCtx.lineWidth = 3;
    pinCtx.stroke();
    pinCtx.beginPath();
    pinCtx.arc(endX, endY, radius, 0, Math.PI * 2);
    pinCtx.fillStyle = color;
    pinCtx.fill();
}

function updatePinballUI() {
    document.getElementById('pinball-level').textContent = pinballLevel;
    document.getElementById('pinball-left').textContent = pinballRemaining;
}

document.addEventListener('keydown', (e) => {
    if (e.key === ' ') { e.preventDefault(); insertPin(); }
});

pinballCanvas.addEventListener('click', () => { insertPin(); });
pinballCanvas.addEventListener('touchstart', (e) => {
    if (e.cancelable) e.preventDefault();
    insertPin();
}, { passive: false });

// 关闭弹窗后重置游戏（不刷新页面，避免加载动画）
function closeModal() {
    document.getElementById('game-modal').classList.remove('show');
    resetPinball();
}

initPinballLevel(); drawPinball();
