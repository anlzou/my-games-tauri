// ==================== 推箱子 ====================
const sokobanLevels = [
    [" ####"," # .#","##  ###","# *@  #","#   $ #","##  ###"," ####"],
    ["######","#    #","# #@ #","# $* #","# .* #","#    #","######"],
    ["  ####","###  ####","#     $ #","# #  #$ #","# . .#@ #","#########"],
    ["########","#      #","# .**$@#","#      #","#####  #","    ####"],
    [" #######"," #     #"," # .$. #","## $@$ #","#  .$. #","#      #","########"],
    ["###### #####","#    ###   #","# $$     #@#","# $ #...   #","#   ########","#####"],
    ["#######","#     #","# .$. #","# $.$ #","# .$. #","# $.$ #","#  @  #","#######"],
    ["  ######","  # ..@#","  # $$ #","  ## ###","   # #","   # #","#### #","#    ##","# #   #","#   # #","###   #","  #####"],
    ["#####","#.  ##","#@$$ #","##   #"," ##  #","  ##.#","   ###"],
    ["      #####","      #.  #","      #.# #","#######.# #","# @ $ $ $ #","# # # # ###","#       #","#########"],
    ["  ######","  #    #","  # ##@##","### # $ #","# ..# $ #","#       #","#  ######","####"],
    ["#####","#   ##","# $  #","## $ ####"," ###@.  #","  #  .# #","  #     #","  #######"],
    ["####","#. ##","#.@ #","#. $#","##$ ###"," # $  #"," #    #"," #  ###"," ####"],
    ["#######","#     #","# # # #","#. $*@#","#   ###","#####"],
    ["     ###","######@##","#    .* #","#   #   #","#####$# #","    #   #","    #####"]
];

let sokobanLevel = 0;
let sokobanMap = [];
let sokobanPlayer = { r: 0, c: 0 };
let sokobanBoxes = [];
let sokobanTargets = [];
let sokobanMoves = 0;
let sokobanHistory = [];
let sokobanGameOver = false;
let sokobanCompleted = JSON.parse(localStorage.getItem('sokobanCompleted') || '[]');

function setSokobanLevel(level) {
    if (level < 0 || level >= sokobanLevels.length) return;
    sokobanLevel = level;
    newSokobanGame();
    const drawer = document.getElementById('drawer-levels');
    const btn = document.getElementById('toggle-levels-btn');
    if (drawer) drawer.classList.remove('show');
    if (btn) btn.classList.remove('active');
}

function parseSokobanLevel(levelIdx) {
    const raw = sokobanLevels[levelIdx];
    sokobanMap = [];
    sokobanBoxes = [];
    sokobanTargets = [];
    sokobanPlayer = { r: 0, c: 0 };
    let maxCols = 0;
    for (let r = 0; r < raw.length; r++) maxCols = Math.max(maxCols, raw[r].length);
    for (let r = 0; r < raw.length; r++) {
        const row = [];
        for (let c = 0; c < maxCols; c++) {
            const ch = raw[r][c] || ' ';
            if (ch === '@') { sokobanPlayer = { r, c }; row.push(' '); }
            else if (ch === '$') { sokobanBoxes.push({ r, c }); row.push(' '); }
            else if (ch === '.') { sokobanTargets.push({ r, c }); row.push('.'); }
            else if (ch === '*') { sokobanBoxes.push({ r, c }); sokobanTargets.push({ r, c }); row.push('.'); }
            else if (ch === '+') { sokobanPlayer = { r, c }; sokobanTargets.push({ r, c }); row.push('.'); }
            else { row.push(ch); }
        }
        sokobanMap.push(row);
    }
}

function newSokobanGame() {
    parseSokobanLevel(sokobanLevel);
    sokobanMoves = 0;
    sokobanHistory = [];
    sokobanGameOver = false;
    updateSokobanUI();
    renderSokoban();
    renderLevelGrid();
}

function resetSokoban() { newSokobanGame(); }

function moveSokobanPlayer(dr, dc) {
    if (sokobanGameOver) return;
    const nr = sokobanPlayer.r + dr;
    const nc = sokobanPlayer.c + dc;
    if (nr < 0 || nr >= sokobanMap.length || nc < 0 || nc >= sokobanMap[0].length) return;
    if (sokobanMap[nr][nc] === '#') return;
    const boxIdx = sokobanBoxes.findIndex(b => b.r === nr && b.c === nc);
    if (boxIdx !== -1) {
        const br = nr + dr;
        const bc = nc + dc;
        if (br < 0 || br >= sokobanMap.length || bc < 0 || bc >= sokobanMap[0].length) return;
        if (sokobanMap[br][bc] === '#') return;
        if (sokobanBoxes.some(b => b.r === br && b.c === bc)) return;
        sokobanHistory.push({ player: { ...sokobanPlayer }, boxes: sokobanBoxes.map(b => ({ ...b })), moves: sokobanMoves });
        sokobanBoxes[boxIdx] = { r: br, c: bc };
        sokobanPlayer = { r: nr, c: nc };
        sokobanMoves++;
    } else {
        sokobanHistory.push({ player: { ...sokobanPlayer }, boxes: sokobanBoxes.map(b => ({ ...b })), moves: sokobanMoves });
        sokobanPlayer = { r: nr, c: nc };
        sokobanMoves++;
    }
    renderSokoban();
    checkSokobanWin();
}

function undoSokoban() {
    if (sokobanHistory.length === 0) return;
    const state = sokobanHistory.pop();
    sokobanPlayer = state.player;
    sokobanBoxes = state.boxes;
    sokobanMoves = state.moves;
    sokobanGameOver = false;
    renderSokoban();
    updateSokobanUI();
}

function checkSokobanWin() {
    const allOnTarget = sokobanTargets.every(t => sokobanBoxes.some(b => b.r === t.r && b.c === t.c));
    if (allOnTarget) {
        sokobanGameOver = true;
        if (!sokobanCompleted.includes(sokobanLevel)) {
            sokobanCompleted.push(sokobanLevel);
            localStorage.setItem('sokobanCompleted', JSON.stringify(sokobanCompleted));
        }
        renderLevelGrid();
        if (sokobanLevel < sokobanLevels.length - 1) {
            setTimeout(() => { sokobanLevel++; newSokobanGame(); }, 1500);
            showModal('🎉 恭喜通关！', `关卡 ${sokobanLevel + 1} 完成！步数: ${sokobanMoves}\n即将进入下一关...`, true);
        } else {
            showModal('🎉 全部通关！', `恭喜完成所有 ${sokobanLevels.length} 个关卡！\n总步数: ${sokobanMoves}`, true);
        }
    }
}

function renderSokoban() {
    const grid = document.getElementById('sokoban-grid');
    grid.innerHTML = '';
    const rows = sokobanMap.length;
    const cols = sokobanMap[0].length;
    grid.style.gridTemplateColumns = `repeat(${cols}, clamp(28px, 7vw, 40px))`;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'sokoban-cell';
            const isWall = sokobanMap[r][c] === '#';
            const isTarget = sokobanMap[r][c] === '.';
            const boxHere = sokobanBoxes.findIndex(b => b.r === r && b.c === c);
            const playerHere = sokobanPlayer.r === r && sokobanPlayer.c === c;
            if (isWall) { cell.classList.add('wall'); }
            else if (boxHere !== -1 && isTarget) { cell.classList.add('box-on-target'); cell.textContent = '✓'; }
            else if (boxHere !== -1) { cell.classList.add('box'); cell.textContent = '📦'; }
            else if (playerHere && isTarget) { cell.classList.add('player-on-target'); cell.textContent = '🙂'; }
            else if (playerHere) { cell.classList.add('player'); cell.textContent = '🙂'; }
            else if (isTarget) { cell.classList.add('target'); cell.textContent = '◆'; }
            else { cell.classList.add('floor'); }
            grid.appendChild(cell);
        }
    }
}

function updateSokobanUI() {
    const levelEl = document.getElementById('sokoban-level');
    const movesEl = document.getElementById('sokoban-moves');
    const targetsEl = document.getElementById('sokoban-targets');
    if (levelEl) levelEl.textContent = sokobanLevel + 1;
    if (movesEl) movesEl.textContent = sokobanMoves;
    const completed = sokobanBoxes.filter(b => sokobanTargets.some(t => t.r === b.r && t.c === b.c)).length;
    if (targetsEl) targetsEl.textContent = `${completed}/${sokobanTargets.length}`;
}

function renderLevelGrid() {
    const grid = document.getElementById('level-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < sokobanLevels.length; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.textContent = i + 1;
        if (i === sokobanLevel) btn.classList.add('active');
        if (sokobanCompleted.includes(i)) btn.classList.add('completed');
        btn.onclick = () => setSokobanLevel(i);
        grid.appendChild(btn);
    }
}

function toggleSokobanDrawer() {
    const section = document.getElementById('drawer-levels');
    const btn = document.getElementById('toggle-levels-btn');
    section.classList.toggle('show');
    btn.classList.toggle('active');
    if (section.classList.contains('show')) {
        setTimeout(() => {
            document.addEventListener('touchstart', closeSokobanDrawerOnOutside, { passive: false });
            document.addEventListener('mousedown', closeSokobanDrawerOnOutside);
        }, 50);
    } else {
        document.removeEventListener('touchstart', closeSokobanDrawerOnOutside);
        document.removeEventListener('mousedown', closeSokobanDrawerOnOutside);
    }
}

function closeSokobanDrawerOnOutside(e) {
    const drawer = document.getElementById('drawer-levels');
    const btn = document.getElementById('toggle-levels-btn');
    if (!drawer.contains(e.target) && !btn.contains(e.target)) {
        drawer.classList.remove('show');
        btn.classList.remove('active');
        document.removeEventListener('touchstart', closeSokobanDrawerOnOutside);
        document.removeEventListener('mousedown', closeSokobanDrawerOnOutside);
    }
}

function handleSokobanDpad(e, dir) {
    if (e.cancelable) e.preventDefault();
    const dirs = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
    const [dr, dc] = dirs[dir];
    moveSokobanPlayer(dr, dc);
}

document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': moveSokobanPlayer(-1, 0); break;
        case 'ArrowDown': case 's': case 'S': moveSokobanPlayer(1, 0); break;
        case 'ArrowLeft': case 'a': case 'A': moveSokobanPlayer(0, -1); break;
        case 'ArrowRight': case 'd': case 'D': moveSokobanPlayer(0, 1); break;
        case 'z': case 'Z':
            if (e.ctrlKey || e.metaKey) { e.preventDefault(); undoSokoban(); }
            break;
    }
});

// 关闭弹窗后重置游戏（不刷新页面，避免加载动画）
function closeModal() {
    document.getElementById('game-modal').classList.remove('show');
    resetSokoban();
}

newSokobanGame();
