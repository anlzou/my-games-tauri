// ==================== 打地鼠 ====================

let whackDifficulty = 'easy';
let whackScore = 0;
let whackHit = 0;
let whackMiss = 0;
let whackTimeLeft = 30;
let whackTimer = null;
let whackMoleTimer = null;
let whackGameRunning = false;
let whackPaused = false;
let whackPauseMoleRemain = {}; // 暂停时保存活跃的地鼠状态
let whackActiveMoles = {}; // { holeIdx: 'mole' | 'bomb' }
let whackHoles = [];
let whackDisappearTimers = {}; // { holeIdx: timeoutId } 每个地鼠的消失计时器
const WHACK_MOLE_EMOJIS = ['🐹', '🐭', '🐿️', '🦔'];
const WHACK_BOMB_EMOJI = '💥';

const whackDiffConfig = {
    easy: { time: 35, moleInterval: 1400, maxSimultaneous: 2, bombChance: 0.08 },
    medium: { time: 30, moleInterval: 1000, maxSimultaneous: 3, bombChance: 0.15 },
    hard: { time: 25, moleInterval: 750, maxSimultaneous: 4, bombChance: 0.22 },
    insane: { time: 20, moleInterval: 550, maxSimultaneous: 5, bombChance: 0.30 }
};

function setWhackDiff(diff) {
    if (whackGameRunning) return;
    whackDifficulty = diff;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function initWhackamole() {
    whackScore = 0;
    whackHit = 0;
    whackMiss = 0;
    whackTimeLeft = whackDiffConfig[whackDifficulty].time;
    whackActiveMoles = {};
    whackGameRunning = false;
    whackPaused = false;
    whackPauseMoleRemain = {};
    // 清除所有消失计时器
    for (const key in whackDisappearTimers) {
        clearTimeout(whackDisappearTimers[key]);
    }
    whackDisappearTimers = {};
    if (whackTimer) { clearInterval(whackTimer); whackTimer = null; }
    if (whackMoleTimer) { clearInterval(whackMoleTimer); whackMoleTimer = null; }
    const pauseBtn = document.getElementById('whack-pause-btn');
    if (pauseBtn) { pauseBtn.style.display = 'none'; pauseBtn.textContent = '暂停'; }
    createWhackGrid();
    updateWhackUI();
}

function createWhackGrid() {
    const grid = document.getElementById('whack-grid');
    grid.innerHTML = '';
    whackHoles = [];
    for (let i = 0; i < 9; i++) {
        const hole = document.createElement('div');
        hole.className = 'whack-hole';
        hole.dataset.index = i;
        hole.addEventListener('click', (e) => whackHoleClick(i, e));
        hole.addEventListener('touchend', (e) => {
            e.preventDefault();
            whackHoleClick(i, e);
        });
        grid.appendChild(hole);
        whackHoles.push(hole);
    }
}

function whackHoleClick(index, e) {
    if (!whackGameRunning || whackPaused) return;
    const hole = whackHoles[index];
    if (!hole || hole.classList.contains('disabled')) return;

    if (whackActiveMoles[index]) {
        const type = whackActiveMoles[index];
        delete whackActiveMoles[index];
        // 取消该地鼠的消失计时器（已手动处理，防止后台计时器再次触发）
        if (whackDisappearTimers[index]) {
            clearTimeout(whackDisappearTimers[index]);
            delete whackDisappearTimers[index];
        }

        if (type === 'mole') {
            // 打中地鼠
            whackScore += 10;
            whackHit++;
            hole.classList.remove('hit');
            // force reflow to restart animation
            void hole.offsetWidth;
            hole.classList.add('hit');
            hole.innerHTML = '<span class="mole">💫</span>';
            setTimeout(() => {
                hole.innerHTML = '';
                hole.classList.remove('hit');
            }, 300);
        } else if (type === 'bomb') {
            // 打到炸弹
            whackScore = Math.max(0, whackScore - 15);
            whackMiss++;
            hole.classList.remove('bomb-hit');
            void hole.offsetWidth;
            hole.classList.add('bomb-hit');
            hole.innerHTML = '<span class="bomb">💥</span>';
            setTimeout(() => {
                hole.innerHTML = '';
                hole.classList.remove('bomb-hit');
            }, 500);
        }
        updateWhackUI();
    }
}

function spawnWhackMole() {
    if (!whackGameRunning || whackPaused) return;
    const config = whackDiffConfig[whackDifficulty];
    
    // 找出空闲的洞
    const freeHoles = [];
    for (let i = 0; i < 9; i++) {
        if (!whackActiveMoles[i]) freeHoles.push(i);
    }
    if (freeHoles.length === 0) return;

    // 当前活跃数量
    const activeCount = Object.keys(whackActiveMoles).length;
    if (activeCount >= config.maxSimultaneous) return;

    // 决定生多少个（1 或 2 个）
    const spawnCount = Math.min(
        Math.random() < 0.35 ? 2 : 1,
        config.maxSimultaneous - activeCount,
        freeHoles.length
    );

    for (let s = 0; s < spawnCount; s++) {
        if (freeHoles.length === 0) break;
        const randIdx = Math.floor(Math.random() * freeHoles.length);
        const holeIdx = freeHoles[randIdx];
        freeHoles.splice(randIdx, 1);

        const isBomb = Math.random() < config.bombChance;
        whackActiveMoles[holeIdx] = isBomb ? 'bomb' : 'mole';

        const hole = whackHoles[holeIdx];
        if (isBomb) {
            hole.innerHTML = `<span class="bomb">💣</span>`;
        } else {
            const emoji = WHACK_MOLE_EMOJIS[Math.floor(Math.random() * WHACK_MOLE_EMOJIS.length)];
            hole.innerHTML = `<span class="mole">${emoji}</span>`;
        }

        // 自动消失计时 - 保存计时器ID用于暂停时取消
        const duration = isBomb ? 800 + Math.random() * 600 : 700 + Math.random() * 900;
        const timerId = setTimeout(() => {
            if (whackActiveMoles[holeIdx]) {
                // 地鼠消失（漏打）
                if (whackActiveMoles[holeIdx] === 'mole') {
                    whackMiss++;
                    updateWhackUI();
                }
                delete whackActiveMoles[holeIdx];
                const h = whackHoles[holeIdx];
                if (h) {
                    h.innerHTML = '';
                    h.classList.remove('hit', 'bomb-hit');
                }
            }
            // 清理已执行的计时器记录
            delete whackDisappearTimers[holeIdx];
        }, duration);
        whackDisappearTimers[holeIdx] = timerId;
    }
}

function startWhackamole() {
    if (whackGameRunning) return;
    initWhackamole();
    whackGameRunning = true;

    const config = whackDiffConfig[whackDifficulty];
    whackTimeLeft = config.time;
    updateWhackUI();

    // 显示暂停按钮
    const pauseBtn = document.getElementById('whack-pause-btn');
    if (pauseBtn) { pauseBtn.style.display = 'inline-block'; pauseBtn.textContent = '暂停'; }

    // 计时器
    whackTimer = setInterval(() => {
        whackTimeLeft--;
        updateWhackUI();
        if (whackTimeLeft <= 0) {
            endWhackamole();
        }
    }, 1000);

    // 生成地鼠
    spawnWhackMole();
    whackMoleTimer = setInterval(() => {
        spawnWhackMole();
    }, config.moleInterval);
}

function resetWhackamole() {
    if (whackTimer) { clearInterval(whackTimer); whackTimer = null; }
    if (whackMoleTimer) { clearInterval(whackMoleTimer); whackMoleTimer = null; }
    whackGameRunning = false;
    whackPaused = false;
    whackActiveMoles = {};
    whackPauseMoleRemain = {};
    // 清除所有消失计时器
    for (const key in whackDisappearTimers) {
        clearTimeout(whackDisappearTimers[key]);
    }
    whackDisappearTimers = {};
    const pauseBtn = document.getElementById('whack-pause-btn');
    if (pauseBtn) { pauseBtn.style.display = 'none'; pauseBtn.textContent = '暂停'; }
    initWhackamole();
}

function pauseWhackamole() {
    if (!whackGameRunning) return;
    whackPaused = !whackPaused;
    const pauseBtn = document.getElementById('whack-pause-btn');
    if (whackPaused) {
        // 暂停：停止计时器和地鼠生成，取消所有消失计时器，隐藏地鼠
        if (whackTimer) { clearInterval(whackTimer); whackTimer = null; }
        if (whackMoleTimer) { clearInterval(whackMoleTimer); whackMoleTimer = null; }
        // 取消所有地鼠的自动消失计时器（防止后台计时器移除地鼠状态）
        for (const key in whackDisappearTimers) {
            clearTimeout(whackDisappearTimers[key]);
        }
        whackDisappearTimers = {};
        pauseBtn.textContent = '继续';
        // 隐藏所有地鼠（保留状态）
        for (let i = 0; i < 9; i++) {
            const hole = whackHoles[i];
            if (hole) {
                if (whackActiveMoles[i]) {
                    hole.style.opacity = '0';
                }
            }
        }
    } else {
        // 继续：恢复地鼠显示，重启计时器和地鼠生成
        pauseBtn.textContent = '暂停';
        const config = whackDiffConfig[whackDifficulty];
        // 恢复地鼠显示，并为恢复的地鼠重新设置消失计时器
        for (let i = 0; i < 9; i++) {
            const hole = whackHoles[i];
            if (hole) {
                if (whackActiveMoles[i]) {
                    hole.style.opacity = '1';
                    // 为恢复显示的地鼠重新设置消失计时器
                    const isBomb = whackActiveMoles[i] === 'bomb';
                    const duration = isBomb ? 800 + Math.random() * 600 : 700 + Math.random() * 900;
                    const timerId = setTimeout(() => {
                        if (whackActiveMoles[i]) {
                            if (whackActiveMoles[i] === 'mole') {
                                whackMiss++;
                                updateWhackUI();
                            }
                            delete whackActiveMoles[i];
                            const h = whackHoles[i];
                            if (h) {
                                h.innerHTML = '';
                                h.classList.remove('hit', 'bomb-hit');
                            }
                        }
                        delete whackDisappearTimers[i];
                    }, duration);
                    whackDisappearTimers[i] = timerId;
                }
            }
        }
        // 重启计时器
        whackTimer = setInterval(() => {
            whackTimeLeft--;
            updateWhackUI();
            if (whackTimeLeft <= 0) {
                endWhackamole();
            }
        }, 1000);
        // 重启地鼠生成
        whackMoleTimer = setInterval(() => {
            spawnWhackMole();
        }, config.moleInterval);
    }
}

function endWhackamole() {
    whackGameRunning = false;
    whackPaused = false;
    whackPauseMoleRemain = {};
    if (whackTimer) { clearInterval(whackTimer); whackTimer = null; }
    if (whackMoleTimer) { clearInterval(whackMoleTimer); whackMoleTimer = null; }
    // 清除所有消失计时器
    for (const key in whackDisappearTimers) {
        clearTimeout(whackDisappearTimers[key]);
    }
    whackDisappearTimers = {};
    const pauseBtn = document.getElementById('whack-pause-btn');
    if (pauseBtn) { pauseBtn.style.display = 'none'; pauseBtn.textContent = '暂停'; }
    // 清除所有地鼠
    for (let i = 0; i < 9; i++) {
        const hole = whackHoles[i];
        if (hole) {
            hole.innerHTML = '';
            hole.classList.remove('hit', 'bomb-hit', 'disabled');
        }
    }
    whackActiveMoles = {};
    // 禁用点击
    whackHoles.forEach(h => h.classList.add('disabled'));

    const grade = whackScore >= 100 ? 'S' : whackScore >= 70 ? 'A' : whackScore >= 40 ? 'B' : whackScore >= 20 ? 'C' : 'D';
    const gradeText = { S: '🌟 打鼠大师！', A: '👏 非常棒！', B: '👍 还不错！', C: '💪 继续加油！', D: '😅 再多练练！' };
    showModal(
        `⏰ 时间到！${gradeText[grade]}`,
        `最终得分: ${whackScore} 分\n命中: ${whackHit} 次 | 失误: ${whackMiss} 次\n评价: ${grade} 级`,
        whackScore >= 40
    );
}

function updateWhackUI() {
    document.getElementById('whack-score').textContent = whackScore;
    document.getElementById('whack-time').textContent = whackTimeLeft;
    document.getElementById('whack-hit').textContent = whackHit;
    document.getElementById('whack-miss').textContent = whackMiss;
}

// 关闭弹窗后重置游戏（不刷新页面，避免加载动画）
function closeModal() {
    document.getElementById('game-modal').classList.remove('show');
    resetWhackamole();
}

// 初始化
initWhackamole();
