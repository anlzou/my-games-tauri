// ==================== 飞翔的小鸟 ====================
let flappyDifficulty = 'easy';
let flappyGameRunning = false;
let flappyPaused = false;
let flappyScore = 0;
let flappyPipeCount = 0;
let flappyBestScore = parseInt(localStorage.getItem('flappyBest') || '0');
let flappyCanvas, flappyCtx;
let flappyAnimationId = null;
let flappyGameLoop = null;

// 小鸟
let bird = {
    x: 0,
    y: 0,
    width: 34,
    height: 26,
    velocity: 0,
    gravity: 0.25,
    jump: -5,
    rotation: 0
};

// 管道
let pipes = [];
const PIPE_WIDTH = 52;
const PIPE_GAP = 120;
const PIPE_SPEED_BASE = 1.8;
let pipeSpeed = PIPE_SPEED_BASE;
let frameCounter = 0;
let pipeSpawnFrame = 0;

// 地面
const GROUND_HEIGHT = 60;
const GROUND_Y = 540;

// 难度配置
const flappyDiffConfig = {
    easy: { gravity: 0.2, jump: -5.5, gap: 140, speed: 1.5, spawnInterval: 110 },
    medium: { gravity: 0.25, jump: -5, gap: 120, speed: 1.8, spawnInterval: 100 },
    hard: { gravity: 0.3, jump: -4.8, gap: 100, speed: 2.2, spawnInterval: 85 }
};

function setFlappyDiff(diff) {
    if (flappyGameRunning) return;
    flappyDifficulty = diff;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function initFlappyBird() {
    flappyCanvas = document.getElementById('flappy-canvas');
    flappyCtx = flappyCanvas.getContext('2d');
    
    bird.x = 80;
    bird.y = 250;
    bird.velocity = 0;
    bird.rotation = 0;
    bird.width = 34;
    bird.height = 26;
    
    pipes = [];
    flappyScore = 0;
    flappyPipeCount = 0;
    frameCounter = 0;
    pipeSpawnFrame = 0;
    flappyGameRunning = false;
    flappyPaused = false;
    
    document.getElementById('flappy-best').textContent = flappyBestScore;
    document.getElementById('flappy-score').textContent = '0';
    document.getElementById('flappy-pipes').textContent = '0';
    document.getElementById('flappy-score-overlay').textContent = '点击开始';
    
    const pauseBtn = document.getElementById('flappy-pause-btn');
    if (pauseBtn) { pauseBtn.style.display = 'none'; pauseBtn.textContent = '暂停'; }
    
    // 绑定事件
    const canvas = flappyCanvas;
    canvas.onclick = null;
    canvas.ontouchend = null;
    
    canvas.addEventListener('click', flappyHandleInput);
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        flappyHandleInput();
    });
    
    document.onkeydown = null;
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            flappyHandleInput();
        }
    });
    
    drawFlappyStartScreen();
}

function flappyHandleInput() {
    if (!flappyGameRunning && !flappyPaused) {
        // 如果游戏没在运行，点击开始
        startFlappyBird();
        return;
    }
    if (flappyPaused) return;
    
    // 小鸟跳跃
    const config = flappyDiffConfig[flappyDifficulty];
    bird.velocity = config.jump;
}

function drawFlappyStartScreen() {
    const ctx = flappyCtx;
    const w = flappyCanvas.width;
    const h = flappyCanvas.height;
    
    // 天空背景渐变
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#4ec0ca');
    skyGrad.addColorStop(0.7, '#70c5ce');
    skyGrad.addColorStop(1, '#85d4dd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);
    
    // 云朵
    drawFlappyClouds(ctx, w, h);
    
    // 地面
    drawFlappyGround(ctx, w);
    
    // 标题
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#543847';
    ctx.lineWidth = 4;
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText('🐦 飞翔的小鸟', w/2, 180);
    ctx.fillText('🐦 飞翔的小鸟', w/2, 180);
    
    // 提示
    ctx.font = '18px Arial, sans-serif';
    ctx.strokeStyle = '#543847';
    ctx.lineWidth = 2;
    ctx.strokeText('点击/空格 开始游戏', w/2, 240);
    ctx.fillText('点击/空格 开始游戏', w/2, 240);
    
    // 小鸟展示
    drawFlappyBird(ctx, w/2, 360, 0);
}

function drawFlappyClouds(ctx, w, h) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const clouds = [
        { x: 50, y: 60, s: 40 },
        { x: 200, y: 30, s: 50 },
        { x: 330, y: 80, s: 35 }
    ];
    clouds.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.s * 0.5, 0, Math.PI * 2);
        ctx.arc(c.x + c.s * 0.5, c.y - 5, c.s * 0.4, 0, Math.PI * 2);
        ctx.arc(c.x + c.s, c.y, c.s * 0.45, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawFlappyGround(ctx, w) {
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, GROUND_Y, w, GROUND_HEIGHT);
    ctx.fillStyle = '#d2b44c';
    ctx.fillRect(0, GROUND_Y, w, 4);
    // 草地纹理
    ctx.fillStyle = '#5a8f3c';
    for (let i = 0; i < w; i += 8) {
        ctx.fillRect(i, GROUND_Y - 3, 3, 6);
    }
    // 条纹
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, GROUND_Y + 10);
        ctx.lineTo(i + 10, GROUND_Y + 10);
        ctx.stroke();
    }
}

function drawFlappyBird(ctx, x, y, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    const w = bird.width;
    const h = bird.height;
    const hw = w / 2;
    const hh = h / 2;
    
    // 身体
    ctx.fillStyle = '#f5d442';
    ctx.beginPath();
    ctx.ellipse(0, 2, hw, hh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // 翅膀
    ctx.fillStyle = '#e8b830';
    ctx.beginPath();
    ctx.moveTo(-4, 4);
    ctx.lineTo(-16, -2);
    ctx.lineTo(-4, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c49a1a';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // 眼睛
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(10, -4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(12, -4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(14, -6, 1.8, 0, Math.PI * 2);
    ctx.fill();
    
    // 嘴巴
    ctx.fillStyle = '#f57c00';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(28, 2);
    ctx.lineTo(15, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d84315';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
}

function drawFlappyPipe(ctx, pipe) {
    const x = pipe.x;
    const topH = pipe.topHeight;
    const gap = pipe.gap;
    const w = PIPE_WIDTH;
    
    // 上方管道
    drawFlappyPipePiece(ctx, x, 0, w, topH, false);
    // 下方管道
    drawFlappyPipePiece(ctx, x, topH + gap, w, GROUND_Y - (topH + gap), true);
}

function drawFlappyPipePiece(ctx, x, y, w, h, isBottom) {
    const radius = 6;
    
    // 管身
    ctx.fillStyle = '#73bf2e';
    ctx.fillRect(x + 2, y, w - 4, h);
    
    // 管道边框
    ctx.fillStyle = '#558b2f';
    ctx.fillRect(x + 2, y, w - 4, 4);
    if (isBottom) {
        ctx.fillRect(x + 2, y + h - 4, w - 4, 4);
    }
    
    // 管口
    const lipH = 18;
    const lipW = w + 10;
    const lipX = x - 5;
    let lipY;
    if (isBottom) {
        lipY = y;
    } else {
        lipY = y + h - lipH;
    }
    
    ctx.fillStyle = '#8bc34a';
    ctx.beginPath();
    if (isBottom) {
        ctx.roundRect(lipX, lipY, lipW, lipH, [0, 0, radius, radius]);
    } else {
        ctx.roundRect(lipX, lipY, lipW, lipH, [radius, radius, 0, 0]);
    }
    ctx.fill();
    
    // 管口边框
    ctx.strokeStyle = '#558b2f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (isBottom) {
        ctx.roundRect(lipX, lipY, lipW, lipH, [0, 0, radius, radius]);
    } else {
        ctx.roundRect(lipX, lipY, lipW, lipH, [radius, radius, 0, 0]);
    }
    ctx.stroke();
    
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 6, y + 5, 6, h - 10);
}

// roundRect polyfill for canvas
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
        if (!Array.isArray(radii)) radii = [radii, radii, radii, radii];
        const [tl, tr, br, bl] = radii.map(r => Math.min(r || 0, Math.min(w, h) / 2));
        this.moveTo(x + tl, y);
        this.lineTo(x + w - tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + tr);
        this.lineTo(x + w, y + h - br);
        this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
        this.lineTo(x + bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - bl);
        this.lineTo(x, y + tl);
        this.quadraticCurveTo(x, y, x + tl, y);
        this.closePath();
        return this;
    };
}

function startFlappyBird() {
    if (flappyGameRunning) return;
    
    const config = flappyDiffConfig[flappyDifficulty];
    bird.gravity = config.gravity;
    bird.jump = config.jump;
    pipeSpeed = config.speed;
    const gap = config.gap;
    const spawnInterval = config.spawnInterval;
    
    bird.y = 250;
    bird.velocity = 0;
    bird.rotation = 0;
    pipes = [];
    flappyScore = 0;
    flappyPipeCount = 0;
    frameCounter = 0;
    pipeSpawnFrame = 0;
    flappyGameRunning = true;
    flappyPaused = false;
    
    document.getElementById('flappy-score').textContent = '0';
    document.getElementById('flappy-pipes').textContent = '0';
    document.getElementById('flappy-score-overlay').textContent = '';
    
    const pauseBtn = document.getElementById('flappy-pause-btn');
    if (pauseBtn) { pauseBtn.style.display = 'inline-block'; pauseBtn.textContent = '暂停'; }
    
    if (flappyAnimationId) {
        cancelAnimationFrame(flappyAnimationId);
    }
    
    // 游戏主循环
    let pipeFrameCount = 0;
    const PIPE_SPAWN_FRAMES = spawnInterval;
    
    function gameLoop() {
        if (!flappyGameRunning) return;
        
        if (!flappyPaused) {
            // 更新物理
            bird.velocity += bird.gravity;
            bird.y += bird.velocity;
            
            // 旋转角度
            bird.rotation = Math.min(Math.PI / 3, Math.max(-Math.PI / 6, bird.velocity * 0.08));
            
            // 生成管道
            pipeFrameCount++;
            if (pipeFrameCount >= PIPE_SPAWN_FRAMES) {
                pipeFrameCount = 0;
                spawnFlappyPipe(gap);
            }
            
            // 更新管道
            updateFlappyPipes();
            
            // 碰撞检测
            if (checkFlappyCollision()) {
                endFlappyBird();
                return;
            }
        }
        
        // 绘制
        drawFlappyFrame();
        
        flappyAnimationId = requestAnimationFrame(gameLoop);
    }
    
    flappyAnimationId = requestAnimationFrame(gameLoop);
}

function spawnFlappyPipe(gap) {
    const minTop = 50;
    const maxTop = GROUND_Y - gap - 50;
    const topHeight = Math.floor(Math.random() * (maxTop - minTop) + minTop);
    
    pipes.push({
        x: flappyCanvas.width,
        topHeight: topHeight,
        gap: gap,
        passed: false
    });
}

function updateFlappyPipes() {
    for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.x -= pipeSpeed;
        
        // 计分 - 鸟通过管道
        if (!p.passed && p.x + PIPE_WIDTH < bird.x) {
            p.passed = true;
            flappyPipeCount++;
            flappyScore += 10;
            document.getElementById('flappy-score').textContent = flappyScore;
            document.getElementById('flappy-pipes').textContent = flappyPipeCount;
        }
        
        // 移除屏幕外管道
        if (p.x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
        }
    }
}

function checkFlappyCollision() {
    const bx = bird.x - bird.width / 2;
    const by = bird.y - bird.height / 2;
    const bw = bird.width;
    const bh = bird.height;
    
    // 碰到上下边界
    if (bird.y - bird.height / 2 <= 0) return false; // 顶部允许通过
    if (bird.y + bird.height / 2 >= GROUND_Y) return true;
    
    // 碰到管道
    for (const p of pipes) {
        const px = p.x;
        const py1 = 0;
        const ph1 = p.topHeight;
        const py2 = p.topHeight + p.gap;
        const ph2 = GROUND_Y - py2;
        
        // 矩形碰撞检测
        if (bx + bw > px && bx < px + PIPE_WIDTH) {
            if (by < ph1 || by + bh > py2) {
                return true;
            }
        }
    }
    
    return false;
}

function drawFlappyFrame() {
    const ctx = flappyCtx;
    const w = flappyCanvas.width;
    const h = flappyCanvas.height;
    
    // 清空 - 天空背景
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#4ec0ca');
    skyGrad.addColorStop(0.7, '#70c5ce');
    skyGrad.addColorStop(1, '#85d4dd');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);
    
    // 云朵
    drawFlappyClouds(ctx, w, h);
    
    // 管道
    for (const p of pipes) {
        drawFlappyPipe(ctx, p);
    }
    
    // 地面
    drawFlappyGround(ctx, w);
    
    // 小鸟
    drawFlappyBird(ctx, bird.x, bird.y, bird.rotation);
    
    // 暂停提示
    if (flappyPaused) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 42px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 4;
        ctx.strokeText('⏸ 已暂停', w/2, h/2);
        ctx.fillText('⏸ 已暂停', w/2, h/2);
        ctx.font = '18px Arial, sans-serif';
        ctx.strokeWidth = 2;
        ctx.strokeText('点击继续', w/2, h/2 + 50);
        ctx.fillText('点击继续', w/2, h/2 + 50);
    }
}

function pauseFlappyBird() {
    if (!flappyGameRunning) return;
    flappyPaused = !flappyPaused;
    const pauseBtn = document.getElementById('flappy-pause-btn');
    if (pauseBtn) {
        pauseBtn.textContent = flappyPaused ? '继续' : '暂停';
    }
}

function resetFlappyBird() {
    if (flappyAnimationId) {
        cancelAnimationFrame(flappyAnimationId);
        flappyAnimationId = null;
    }
    flappyGameRunning = false;
    flappyPaused = false;
    const pauseBtn = document.getElementById('flappy-pause-btn');
    if (pauseBtn) { pauseBtn.style.display = 'none'; pauseBtn.textContent = '暂停'; }
    initFlappyBird();
}

function endFlappyBird() {
    flappyGameRunning = false;
    flappyPaused = false;
    
    if (flappyAnimationId) {
        cancelAnimationFrame(flappyAnimationId);
        flappyAnimationId = null;
    }
    
    const pauseBtn = document.getElementById('flappy-pause-btn');
    if (pauseBtn) { pauseBtn.style.display = 'none'; pauseBtn.textContent = '暂停'; }
    
    // 更新最高分
    if (flappyScore > flappyBestScore) {
        flappyBestScore = flappyScore;
        localStorage.setItem('flappyBest', String(flappyBestScore));
        document.getElementById('flappy-best').textContent = flappyBestScore;
    }
    
    // 检查是否通过至少一个管道（算有成绩）
    const hasScore = flappyPipeCount > 0;
    
    // 绘制最后一帧
    drawFlappyFrame();
    
    // 显示结束遮罩
    const ctx = flappyCtx;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, flappyCanvas.width, flappyCanvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.strokeText('💀 游戏结束', flappyCanvas.width/2, flappyCanvas.height/2 - 40);
    ctx.fillText('💀 游戏结束', flappyCanvas.width/2, flappyCanvas.height/2 - 40);
    ctx.font = '22px Arial, sans-serif';
    ctx.lineWidth = 2;
    ctx.strokeText(`得分: ${flappyScore}  通过: ${flappyPipeCount} 根管道`, flappyCanvas.width/2, flappyCanvas.height/2 + 20);
    ctx.fillText(`得分: ${flappyScore}  通过: ${flappyPipeCount} 根管道`, flappyCanvas.width/2, flappyCanvas.height/2 + 20);
    
    // 弹窗
    const grade = flappyScore >= 100 ? 'S' : flappyScore >= 60 ? 'A' : flappyScore >= 30 ? 'B' : flappyScore >= 10 ? 'C' : 'D';
    const gradeText = { S: '🌟 飞行大师！', A: '👏 非常棒！', B: '👍 还不错！', C: '💪 继续加油！', D: '😅 再多练练！' };
    
    setTimeout(() => {
        showModal(
            `💀 撞到了！${gradeText[grade]}`,
            `最终得分: ${flappyScore} 分\n通过管道: ${flappyPipeCount} 根${flappyScore > 0 && flappyScore >= flappyBestScore ? '\n🎉 新纪录！' : ''}\n最高分: ${flappyBestScore} 分`,
            hasScore
        );
    }, 200);
}

// 覆盖 closeModal 防止刷新，而是重置游戏
const originalCloseModal = closeModal;
closeModal = function() {
    document.getElementById('game-modal').classList.remove('show');
    // 不刷新页面，直接重置游戏
    resetFlappyBird();
};

// 初始化
initFlappyBird();
