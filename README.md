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

---

## 📱 Android 打包（通用说明）

Tauri v2 原生支持将应用编译为 Android APK/AAB。Rust 代码交叉编译为 `arm64-v8a`（或其他架构）的 `.so` 动态库，前端静态文件嵌入 APK 中。

### 前置条件（Android 通用）

| 工具 | 说明 |
|------|------|
| **JDK 17 或 21** | Gradle 构建需要，[JDK 21 下载](https://adoptium.net/) |
| **Android SDK** | 包含 cmdline-tools、platform-tools、build-tools |
| **Android NDK** | 用于 Rust 交叉编译到 Android |
| **Rust Android 目标** | `rustup target add aarch64-linux-android` 等 |
| **cargo-ndk** | Rust 交叉编译工具：`cargo install cargo-ndk` |

### 初始化 Android 项目（一次性的）

```bash
pnpm tauri android init
```

这会生成 `src-tauri/gen/android/` 目录，包含完整的 Android Studio Gradle 项目。

### 编译 Android APK

```bash
pnpm tauri android build --target aarch64
```

> `--target aarch64` 仅编译 ARM64 架构，加快构建速度。如需要完整多架构 APK，去掉此参数。

### 产物路径

| 格式 | 路径 |
|------|------|
| APK (未签名) | `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk` |
| AAB (未签名) | `src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab` |

### 签名 APK

```bash
# 1. 生成密钥（仅首次）
keytool -genkey -v -keystore ~/my-release-key.keystore \
  -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# 2. zipalign 对齐 + apksigner 签名
zipalign -v -p 4 app-universal-release-unsigned.apk app-release-aligned.apk
apksigner sign --ks ~/my-release-key.keystore \
  --ks-key-alias my-key-alias \
  --out app-release-signed.apk \
  app-release-aligned.apk

# 3. 验证签名
apksigner verify --verbose app-release-signed.apk
```

### 安装到设备

```bash
# 连接 Android 设备（开启 USB 调试）
adb install app-release-signed.apk
```

---

## 🐧 Linux 环境 Android 打包

### 1. 安装依赖

```bash
# Rust Android 编译目标
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android

# cargo-ndk（Rust → Android 交叉编译工具）
cargo install cargo-ndk
```

### 2. 安装 Android SDK + NDK

```bash
# 下载 Android 命令行工具
mkdir -p ~/Android/Sdk && cd ~/Android/Sdk
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-11076708_latest.zip
mkdir -p cmdline-tools/latest && mv tools/* cmdline-tools/latest/

# 设置环境变量（写入 ~/.bashrc）
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/26.3.11579264
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# 安装 SDK 组件
sdkmanager "platform-tools" "build-tools;34.0.0" "platforms;android-34"

# 安装 NDK 26.3
sdkmanager "ndk;26.3.11579264"
```

> 国内用户可尝试镜像源：`https://mirrors.bfsu.edu.cn/android/repository/`，但 NDK 等大文件需从 Google 下载。也可直接用 `wget` 下载 NDK：
> ```bash
> wget https://dl.google.com/android/repository/android-ndk-r26d-linux.zip
> unzip android-ndk-r26d-linux.zip -d ~/Android/Sdk/ndk/26.3.11579264/
> ```

### 3. 检查 JDK 版本

Gradle 8.14 需要 **JDK 17~21**，不兼容 JDK 26+。可通过 sdkman 管理多版本 JDK：

```bash
# 使用 sdkman 安装 JDK 21
sdk install java 21.0.7-amzn

# 临时切换 JDK 版本
export JAVA_HOME=$HOME/.sdkman/candidates/java/21.0.7-amzn
```

### 4. 编译

```bash
cd my-games-tauri

export JAVA_HOME=/path/to/jdk-21
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/26.3.11579264

pnpm tauri android build --target aarch64
```

### 5. 签名（Linux）

```bash
export ANDROID_HOME=$HOME/Android/Sdk

UNSIGNED="src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk"

# zipalign 对齐
$ANDROID_HOME/build-tools/34.0.0/zipalign -v -p 4 "$UNSIGNED" app-release-aligned.apk

# apksigner 签名
$ANDROID_HOME/build-tools/34.0.0/apksigner sign \
  --ks ~/my-release-key.keystore \
  --ks-key-alias my-key-alias \
  --ks-pass pass:123456 \
  --out app-release-signed.apk \
  app-release-aligned.apk

# 验证
$ANDROID_HOME/build-tools/34.0.0/apksigner verify --verbose app-release-signed.apk
```

---

## 🪟 Windows 环境 Android 打包

### 1. 安装依赖

```powershell
# Rust Android 编译目标
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android

# cargo-ndk
cargo install cargo-ndk
```

### 2. 安装 Android Studio（推荐）

从 [developer.android.com/studio](https://developer.android.com/studio) 下载并安装 **Android Studio**，安装时勾选：

- ✅ Android SDK
- ✅ Android SDK Platform
- ✅ Android Virtual Device（可选，用于模拟器）
- ✅ Performance (Intel HAXM)（可选）
- ✅ Android NDK

### 3. 配置环境变量

```powershell
# 系统环境变量（管理员 PowerShell）
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', "$env:LOCALAPPDATA\Android\Sdk", 'User')
[System.Environment]::SetEnvironmentVariable('ANDROID_NDK_HOME', "$env:LOCALAPPDATA\Android\Sdk\ndk\26.3.11579264", 'User')

# 将以下路径添加到 PATH
# %ANDROID_HOME%\cmdline-tools\latest\bin
# %ANDROID_HOME%\platform-tools
# %ANDROID_HOME%\build-tools\34.0.0
```

> Android Studio 默认 SDK 路径为 `%LOCALAPPDATA%\Android\Sdk`。

### 4. 安装 JDK

```powershell
# 通过 sdkman 或直接下载 Adoptium JDK 21
# https://adoptium.net/temurin/releases/?version=21

# 设置 JAVA_HOME 环境变量
[System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Eclipse Adoptium\jdk-21.0.7-hotspot', 'User')
```

### 5. 初始化并编译

```powershell
cd my-games-tauri

# 初始化 Android 项目（首次）
pnpm tauri android init

# 编译 APK
pnpm tauri android build --target aarch64
```

### 6. 签名（Windows）

```powershell
# 生成密钥（首次）
keytool -genkey -v -keystore "%USERPROFILE%\my-release-key.keystore" ^
  -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# zipalign + apksigner
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk

"%ANDROID_HOME%\build-tools\34.0.0\zipalign" -v -p 4 ^
  "src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release-unsigned.apk" ^
  app-release-aligned.apk

"%ANDROID_HOME%\build-tools\34.0.0\apksigner" sign ^
  --ks "%USERPROFILE%\my-release-key.keystore" ^
  --ks-key-alias my-key-alias ^
  --out app-release-signed.apk ^
  app-release-aligned.apk

# 验证
"%ANDROID_HOME%\build-tools\34.0.0\apksigner" verify --verbose app-release-signed.apk
```

---

### 常见问题

**Q: Gradle 报 `Unsupported class file major version`？**  
A: JDK 版本过高。Gradle 8.14 需要 JDK 17~21，请使用 JDK 21 而不是 JDK 26+。

**Q: `cargo ndk` 编译失败？**  
A: 确保已设置 `ANDROID_HOME` 和 `ANDROID_NDK_HOME` 环境变量，且 NDK 版本与 Rust 目标兼容。

**Q: APK 安装到手机后闪退？**  
A: 确认 Android 设备 API 版本 ≥ 26（Android 8.0）。可在 `tauri.conf.json` 中配置最低 SDK 版本。

**Q: 国内下载太慢？**  
A: 可使用国内镜像源加速 SDK 下载，但 NDK（~670MB）仍需从 Google 下载，可用 `wget` 断点续传。**Windows 用户建议直接安装 Android Studio**，它内置了 SDK Manager 和 NDK 管理功能。