# 🚀 游戏合集 (Game Collection)

基于 **Tauri v2 + Vue 3 + TypeScript** 的桌面游戏合集应用，集成了一系列经典网页小游戏和 Three.js 3D 演示。

## ✨ 功能

- 🎮 **15 款经典游戏**：数独、贪吃蛇、俄罗斯方块、扫雷、2048、五子棋、打砖块、记忆翻牌、推箱子、打地鼠、飞翔的小鸟、见缝插针、华容道、滑块拼图、3D魔方
- 🎨 **10 个 3D 演示**：旋转立方体、发光球体、扭结环、旋转地球、骨骼动画、GLTF 模型、动画重定向、凸包几何、程序化地形、机器人模型
- 🖥️ **原生桌面应用**：基于 Tauri，跨平台（Windows / macOS / Linux）

## 📁 项目结构

```
my-games-tauri/
├── src/                    # Vue 3 前端
│   ├── App.vue             # 游戏大厅（分类菜单 + iframe 播放器）
│   ├── main.ts             # Vue 入口
│   └── vite-env.d.ts       # 类型声明
├── public/
│   └── games/              # 📦 游戏静态文件（HTML/CSS/JS）
│       ├── index.html      # 原项目入口
│       ├── sudoku.html     # 各游戏独立 HTML
│       ├── assets/         # 游戏公共资源（CSS/JS/模型）
│       └── three/          # Three.js 3D 演示
├── src-tauri/              # Tauri Rust 后端
│   ├── src/
│   │   ├── lib.rs          # Tauri 应用入口
│   │   └── main.rs         # 主函数
│   ├── Cargo.toml
│   └── tauri.conf.json     # Tauri 配置
├── index.html              # Vite 入口
├── vite.config.ts
├── package.json
└── README.md
```

## 📋 前置条件

| 工具 | 版本要求 | 安装方式 |
|------|---------|---------|
| **Node.js** | >= 18 | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 任意 | `npm install -g pnpm` |
| **Rust** | 最新稳定版 | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh` |

### Windows 系统依赖

1. **安装 Microsoft Visual Studio Build Tools**（C++ 编译环境）
   - 下载 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - 安装时勾选 **"使用 C++ 的桌面开发"**（Desktop development with C++）
   - 确保包含 **Windows 10/11 SDK**

2. **安装 WebView2**（Windows 10 以下系统需要）
   - Windows 10 (1803+) / Windows 11 已内置 WebView2
   - 旧系统请从 [Microsoft WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) 下载安装

3. **安装 Rust 工具链**（以管理员身份运行 PowerShell）
   ```powershell
   # 下载并安装 Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

   # 确保安装 Visual Studio 后，添加 MSVC 工具链
   rustup default stable-msvc
   ```

### Linux 系统依赖

```bash
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl wget file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libcairo2-dev \
  libpango1.0-dev \
  libgdk-pixbuf-2.0-dev \
  libatk1.0-dev \
  libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev
```

## 🚀 运行

### 所有平台通用

```bash
# 1. 安装前端依赖
pnpm install

# 2. 启动开发模式
pnpm run tauri:dev
```

### Windows 下注意事项

- **终端选择**：建议使用 **PowerShell** 或 **Windows Terminal**，确保以普通用户（非管理员）身份运行
- **首次编译较慢**：Rust 需要下载并编译所有依赖，首次运行可能需要 5-15 分钟
- **杀毒软件**：若编译缓慢，可暂时将项目目录添加至杀毒软件排除列表
- **中文路径**：确保项目路径**不包含中文字符**，否则可能导致 Rust 编译报错

### 可用命令

| 命令 | 说明 |
|------|------|
| `pnpm run tauri:dev` | ✅ **开发运行（推荐）** — 启动 Vite 热重载 + Tauri 桌面窗口 |
| `pnpm run dev` | 仅启动 Vite 前端开发服务器（浏览器预览） |
| `pnpm run build` | 构建前端代码 |
| `pnpm tauri build` | ✅ 构建桌面应用安装包（Windows: `.msi` / `.exe`；Linux: `.deb` / `.AppImage`；macOS: `.dmg`） |

> **Linux 注意**：若 VS Code 以 Snap 包方式安装，从 VS Code 内置终端运行 `pnpm tauri dev` 会因 Snap 环境与系统 glibc 冲突而报错。已添加 `tauri:dev` 脚本自动修复此问题。如果在普通终端（非 VS Code 终端）中运行，直接使用 `pnpm tauri dev` 即可。

## 🎮 使用说明

1. 启动后显示**游戏大厅**，包含两个折叠分类：
   - **🎮 经典游戏**（15 款）—— 点击即玩
   - **🎨 3D 模型**（10 个）—— Three.js 交互演示
2. 点击任意游戏，将在**内嵌 iframe** 中运行
3. 关闭窗口即可退出应用

## 🛠️ 技术栈

- **桌面框架**：[Tauri v2](https://v2.tauri.app/)
- **前端框架**：[Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**：[Vite](https://vite.dev/)
- **包管理**：[pnpm](https://pnpm.io/)
- **3D 引擎**：[Three.js](https://threejs.org/)
- **后端语言**：[Rust](https://www.rust-lang.org/)