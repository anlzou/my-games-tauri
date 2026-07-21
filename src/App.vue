<script setup lang="ts">
import { ref } from "vue";

interface GameItem {
  icon: string;
  name: string;
  desc: string;
  path: string;
}

interface Category {
  icon: string;
  name: string;
  count: number;
  isThree: boolean;
  items: GameItem[];
}

const categories = ref<Category[]>([
  {
    icon: "🎮",
    name: "经典游戏",
    count: 15,
    isThree: false,
    items: [
      { icon: "🔢", name: "数独", desc: "逻辑填数", path: "sudoku.html" },
      { icon: "🐍", name: "贪吃蛇", desc: "经典街机", path: "snake.html" },
      { icon: "🧱", name: "俄罗斯方块", desc: "消除方块", path: "tetris.html" },
      { icon: "💣", name: "扫雷", desc: "推理排雷", path: "minesweeper.html" },
      { icon: "🎲", name: "2048", desc: "数字合并", path: "game2048.html" },
      { icon: "⚫", name: "五子棋", desc: "策略对战", path: "gomoku.html" },
      { icon: "🏓", name: "打砖块", desc: "弹球击碎", path: "breakout.html" },
      { icon: "🃏", name: "记忆翻牌", desc: "考验记忆", path: "memory.html" },
      { icon: "📦", name: "推箱子", desc: "益智解谜", path: "sokoban.html" },
      { icon: "🐹", name: "打地鼠", desc: "快速击打", path: "whackamole.html" },
      { icon: "🐦", name: "飞翔的小鸟", desc: "飞越障碍", path: "flappybird.html" },
      { icon: "🎯", name: "见缝插针", desc: "精准时机", path: "pinball.html" },
      { icon: "🏯", name: "华容道", desc: "滑块解谜", path: "klotski.html" },
      { icon: "🧩", name: "滑块拼图", desc: "拼图还原", path: "puzzle.html" },
      { icon: "🧊", name: "3D魔方", desc: "旋转魔方", path: "rubik.html" },
    ],
  },
  {
    icon: "🎨",
    name: "3D 模型",
    count: 10,
    isThree: true,
    items: [
      { icon: "📦", name: "旋转立方体", desc: "彩色立方体", path: "three/cube.html" },
      { icon: "🔮", name: "发光球体", desc: "粒子光效", path: "three/sphere.html" },
      { icon: "🔄", name: "扭结环", desc: "复杂曲面", path: "three/torus.html" },
      { icon: "🌍", name: "旋转地球", desc: "3D 地球", path: "three/earth.html" },
      { icon: "🏃", name: "骨骼动画", desc: "蒙皮动画", path: "three/skinning.html" },
      { icon: "🏠", name: "GLTF AVIF", desc: "模型与AVIF纹理", path: "three/gltf_avif.html" },
      { icon: "🔄", name: "动画重定向", desc: "重定向到ReadyPlayer.me", path: "three/retargeting_readyplayer.html" },
      { icon: "💎", name: "凸包几何", desc: "随机点云凸包", path: "three/convex_hull.html" },
      { icon: "🏔️", name: "程序化地形", desc: "分形地形生成", path: "three/terrain.html" },
      { icon: "🤖", name: "机器人模型", desc: "3D 机器人", path: "three/robot.html" },
    ],
  },
]);

const expandedCategories = ref<Set<number>>(new Set([0, 1]));

function toggleCategory(index: number) {
  const set = new Set(expandedCategories.value);
  if (set.has(index)) set.delete(index);
  else set.add(index);
  expandedCategories.value = set;
}

const currentGame = ref<{ name: string; path: string } | null>(null);

function openGame(item: GameItem) {
  currentGame.value = { name: item.name, path: `/games/${item.path}` };
}

</script>

<template>
  <div v-if="!currentGame" class="hall-wrapper">
    <div class="hall-header">
      <h1 class="hall-title">🚀 游戏合集</h1>
      <p class="hall-subtitle">选择分类浏览不同的游戏和 3D 模型</p>
    </div>

    <div class="categories">
      <div v-for="(cat, index) in categories" :key="index" class="category"
        :class="{ expanded: expandedCategories.has(index), 'cat-three': cat.isThree }">
        <div class="category-header" @click="toggleCategory(index)">
          <div class="left">
            <span class="cat-icon">{{ cat.icon }}</span>
            <span class="cat-name">{{ cat.name }}</span>
            <span class="cat-count">{{ cat.count }}</span>
          </div>
          <span class="toggle-icon">▼</span>
        </div>
        <div class="category-body" :class="{ show: expandedCategories.has(index) }">
          <div class="category-items">
            <div v-for="(item, i) in cat.items" :key="i" class="cat-item" @click="openGame(item)">
              <span class="item-icon">{{ item.icon }}</span>
              <span class="item-name">{{ item.name }}</span>
              <span class="item-desc">{{ item.desc }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer-info">
      游戏合集 · 共 {{ categories.reduce((s, c) => s + c.items.length, 0) }} 个项目
    </div>
  </div>

  <div v-else class="player-wrapper">
    <iframe class="game-iframe" :src="currentGame.path" frameborder="0" />
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { height: 100%; overflow: hidden; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  color: #eee;
}

.hall-wrapper {
  display: flex; flex-direction: column; align-items: center;
  height: 100%; max-width: 900px; margin: 0 auto; padding: 0 16px;
}
.hall-header { flex-shrink: 0; width: 100%; text-align: center; padding: 24px 0 8px; }
.hall-title {
  font-size: 2em; text-shadow: 0 0 20px rgba(0,200,255,0.5);
  background: linear-gradient(90deg, #00d4ff, #c77dff);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; margin-bottom: 6px;
}
.hall-subtitle { color: #aaa; font-size: 0.95em; }

.categories {
  flex: 1; overflow-y: auto; width: 100%; max-width: 700px;
  padding: 8px 12px 16px; min-height: 0;
}

.category {
  margin-bottom: 12px; border-radius: 16px; overflow: hidden;
  border: 2px solid rgba(0,212,255,0.2);
  transition: border-color 0.3s; background: rgba(0,0,0,0.15);
}
.category.expanded { border-color: rgba(0,212,255,0.4); }
.category.cat-three { border-color: rgba(199,125,255,0.2); }
.category.cat-three.expanded { border-color: rgba(199,125,255,0.4); }

.category-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; cursor: pointer; user-select: none;
  transition: all 0.3s; background: rgba(0,212,255,0.05);
}
.category.cat-three .category-header { background: rgba(199,125,255,0.05); }
.category-header:hover { background: rgba(0,212,255,0.12); }
.category.cat-three .category-header:hover { background: rgba(199,125,255,0.12); }
.category-header .left { display: flex; align-items: center; gap: 10px; }

.cat-icon { font-size: 1.4em; }
.cat-name { font-size: 1.05em; font-weight: bold; color: #eee; }
.cat-count {
  font-size: 0.8em; color: #888;
  background: rgba(0,212,255,0.1); padding: 2px 10px; border-radius: 12px;
}
.category.cat-three .cat-count { background: rgba(199,125,255,0.1); }

.toggle-icon {
  font-size: 1.1em; color: #00d4ff;
  transition: transform 0.3s ease;
}
.category.cat-three .toggle-icon { color: #c77dff; }
.category.expanded .toggle-icon { transform: rotate(180deg); }

.category-body {
  max-height: 0; overflow: hidden;
  transition: max-height 0.4s ease, padding 0.4s ease; padding: 0 20px;
}
.category-body.show { max-height: 2000px; padding: 8px 20px 18px; }

.category-items {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 10px;
}

.cat-item {
  background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.25);
  border-radius: 12px; padding: 12px 8px; text-align: center; cursor: pointer;
  transition: all 0.3s; color: #eee;
  display: flex; flex-direction: column; align-items: center; gap: 5px;
}
.category.cat-three .cat-item {
  background: rgba(199,125,255,0.08); border-color: rgba(199,125,255,0.25);
}
.cat-item:hover {
  background: rgba(0,212,255,0.2); border-color: #00d4ff;
  transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,212,255,0.15);
}
.category.cat-three .cat-item:hover {
  background: rgba(199,125,255,0.2); border-color: #c77dff;
  box-shadow: 0 6px 20px rgba(199,125,255,0.15);
}
.item-icon { font-size: 1.8em; }
.item-name { font-size: 0.8em; font-weight: bold; color: #00d4ff; }
.category.cat-three .item-name { color: #c77dff; }
.item-desc { font-size: 0.65em; color: #888; }

.footer-info {
  flex-shrink: 0; padding: 8px 0 16px; color: #666;
  font-size: 0.8em; text-align: center;
}

.player-wrapper { display: flex; flex-direction: column; height: 100%; }
.player-topbar {
  flex-shrink: 0; display: flex; align-items: center;
  justify-content: space-between; padding: 10px 20px;
  background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.1);
}
.back-btn {
  padding: 6px 16px; border: 1px solid rgba(0,212,255,0.4);
  border-radius: 8px; background: transparent; color: #00d4ff;
  font-size: 0.9em; cursor: pointer; transition: all 0.3s;
}
.back-btn:hover { background: rgba(0,212,255,0.15); border-color: #00d4ff; }
.player-title {
  font-size: 1.1em; font-weight: bold;
  background: linear-gradient(90deg, #00d4ff, #c77dff);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.game-iframe { flex: 1; width: 100%; border: none; background: #000; }
</style>