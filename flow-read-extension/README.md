# FlowRead 浏览器阅读插件

FlowRead 是一款专注于“零干扰、高效率”的浏览器阅读插件，提供沉浸式阅读体验和高效的划线采集功能。

## 📋 功能特性

- **沉浸式阅读**：一键隐藏广告、侧边栏，仅保留正文。
- **划线采集**：选中即高亮，自动收集重点。
- **笔记导出**：支持 Markdown 格式一键导出。
- **微信公众号适配**：针对公众号文章的特殊优化。

## 🛠️ 开发环境准备

确保您的电脑已安装：
- [Node.js](https://nodejs.org/) (推荐 v18 或更高版本)
- npm (通常随 Node.js 安装)

## 🚀 安装与运行

### 1. 安装依赖

在项目根目录 (`flow-read-extension`) 打开终端，运行：

```bash
npm install
```

### 2. 启动开发服务器

运行以下命令以启动开发模式（支持热重载）：

```bash
npm run dev
```

启动后，Vite 会在 `dist` 目录下生成构建好的插件文件。

### 3. 在 Chrome 中加载插件

1.  打开 Chrome 浏览器，访问 `chrome://extensions/`。
2.  开启右上角的 **"开发者模式" (Developer mode)** 开关。
3.  点击左上角的 **"加载已解压的扩展程序" (Load unpacked)**。
4.  选择本项目下的 `dist` 目录。

> **注意**：初次运行 `npm run dev` 后才会生成 `dist` 目录。

## 📖 使用说明

1.  **开启阅读模式**：
    - 打开任意文章页面（如微信公众号文章）。
    - 点击浏览器工具栏的 FlowRead 图标（或者是固定在工具栏上的图标）。
    - 页面将进入纯净阅读模式（目前版本仅弹出提示，功能开发中）。

2.  **划线高亮**：
    - 在页面上使用鼠标选中一段文字。
    - 选中的文字将自动高亮（功能开发中）。

## 📁 项目结构

```
flow-read-extension/
├── src/
│   ├── background/     # Service Worker (后台脚本)
│   ├── content/        # Content Scripts (注入页面的脚本)
│   ├── components/     # React 组件
│   ├── utils/          # 工具函数
│   └── manifest.json   # 插件配置文件
├── dist/               # 构建产物 (加载此目录)
└── package.json
```
