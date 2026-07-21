# 项目合集

一个包含 **14 款经典小游戏** + **4 个 3D 模型** 的纯前端网页项目集合，支持桌面端和移动端游玩。

## 项目结构

```
my-games/
├── index.html              # 入口页/主大厅（分类折叠菜单）
├── sudoku.html             # 数独
├── snake.html              # 贪吃蛇
├── tetris.html             # 俄罗斯方块
├── minesweeper.html        # 扫雷
├── game2048.html           # 2048
├── gomoku.html             # 五子棋
├── breakout.html           # 打砖块
├── memory.html             # 记忆翻牌
├── sokoban.html            # 推箱子
├── whackamole.html         # 打地鼠
├── flappybird.html         # 飞翔的小鸟
├── pinball.html            # 见缝插针
├── klotski.html            # 华容道
├── puzzle.html             # 滑块拼图
├── three/                  # 3D 模型模块
│   ├── index.html          # 3D 模型画廊入口
│   ├── cube.html           # 旋转立方体
│   ├── sphere.html         # 发光球体
│   ├── torus.html          # 扭结环
│   └── earth.html          # 旋转地球
├── assets/
│   ├── css/
│   │   ├── common.css      # 公共样式（导航、布局、模态框、响应式）
│   │   ├── three.css       # 3D 模型页样式
│   │   └── [game].css      # 各游戏样式
│   ├── js/
│   │   ├── common.js       # 公共脚本（导航、计时器、模态框、规则、模块系统）
│   │   ├── [game].js       # 各游戏逻辑
│   │   └── three/
│   │       ├── models.js   # 3D 模型通用配置（场景、相机、渲染器、动画循环）
│   │       ├── cube.js     # 旋转立方体
│   │       ├── sphere.js   # 发光球体
│   │       ├── torus.js    # 扭结环
│   │       └── earth.js    # 旋转地球（Canvas 生成纹理）
│   └── images/             # 图片资源（预留）
└── README.md
```

## 模块介绍

### 🎮 经典游戏（14款）

| 游戏 | 文件 | 描述 |
|------|------|------|
| 🔢 数独 | `sudoku.html` | 经典9×9数独，支持4种难度（简单/中等/困难/专家） |
| 🐍 贪吃蛇 | `snake.html` | 控制小蛇吃食物，支持4种速度，手机端虚拟方向键 |
| 🧱 俄罗斯方块 | `tetris.html` | 经典方块消除，支持等级系统与计分 |
| 💣 扫雷 | `minesweeper.html` | 经典扫雷，支持3种难度与标记模式 |
| 🎲 2048 | `game2048.html` | 数字合并游戏，支持3×3/4×4/5×5三种棋盘 |
| ⚫ 五子棋 | `gomoku.html` | 双人对战或人机对战（简单AI），15×15棋盘 |
| 🏓 打砖块 | `breakout.html` | 弹球击碎砖块，支持4种难度与暂停 |
| 🃏 记忆翻牌 | `memory.html` | 翻牌配对，支持3×4/4×4/4×6三种难度 |
| 📦 推箱子 | `sokoban.html` | 经典推箱子，共15关，支持撤销与关卡选择 |
| 🐹 打地鼠 | `whackamole.html` | 快速击打冒出的地鼠，躲避炸弹，支持4种难度 |
| 🐦 飞翔的小鸟 | `flappybird.html` | 点击控制小鸟飞越管道障碍，3种难度，最高分本地保存 |
| 🎯 见缝插针 | `pinball.html` | 在旋转圆盘上精准插针，支持3种难度与关卡递增 |
| 🏯 华容道 | `klotski.html` | 经典横刀立马布局，支持5种主题与步数统计 |
| 🧩 滑块拼图 | `puzzle.html` | 滑动还原拼图，3种数学生成主题，4种难度，支持拖拽操作 |

### 🎨 3D 模型展示（4款，基于 Three.js）

| 模型 | 文件 | 描述 |
|------|------|------|
| 📦 旋转立方体 | `three/cube.html` | 六面彩色立方体，带边缘线框与星空背景 |
| 🔮 发光球体 | `three/sphere.html` | 带呼吸光效与粒子环的蓝色球体 |
| 🔄 扭结环 | `three/torus.html` | 紫色扭结曲面，线框叠加与环绕粒子 |
| 🌍 旋转地球 | `three/earth.html` | Canvas 2D 生成纹理的3D地球，带大气辉光 |

## 运行方式

1. 直接在浏览器中打开 `index.html` 文件
2. 或使用任意静态文件服务器（如 VS Code Live Server）

```bash
# 使用 Python 简单 HTTP 服务器
python -m http.server 8080

# 或使用 Node.js 的 http-server
npx http-server -p 8080
```

然后在浏览器中访问 `http://localhost:8080`

## 技术特点

- **纯前端实现**：无需后端，所有逻辑均在浏览器中运行
- **模块化架构**：按功能分类组织，支持动态扩展新模块
- **分类折叠菜单**：主大厅使用可折叠分类结构，便于浏览大量项目
- **响应式设计**：适配桌面端和移动端，移动端有侧边栏导航
- **通用布局系统**：公共侧边栏、模块选择器、计时器、模态框、规则说明统一管理
- **本地存储**：部分游戏使用 localStorage 保存最高分/通关记录，分类展开状态持久化
- **键盘+触摸双支持**：同时支持键盘操作和触摸屏操作
- **Canvas 数学绘图**：滑块拼图使用 Canvas 2D API 实时生成精美主题图像
- **Three.js 3D 渲染**：使用 Three.js 库实现 3D 模型展示，支持拖拽旋转和缩放
- **页面过渡动画**：模块间切换时有平滑的加载过渡效果

## 浏览器兼容性

- Chrome / Edge / Firefox / Safari 最新版本
- iOS Safari / Android Chrome
