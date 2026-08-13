# PDF Bubble Annotator

> **专业 PDF / 工程图纸批注工作台｜Windows x64**
>
> 打开图纸 → 标注 → 测量 → 统计 → 矢量 PDF 导出。

[![Windows](https://img.shields.io/badge/Windows-10%2F11-blue)](https://www.microsoft.com/windows/)
[![Platform](https://img.shields.io/badge/platform-x64-lightgrey)](#)

## 🖥️ 新版工作台

v0.2 开始，界面从“单一 PDF 气泡工具”重组为 CAD 风格工程图工作台：顶部采用常用功能 Ribbon，左侧为工具箱和统计，中间为图纸画布，右侧为属性/标注列表。

截图会在稳定版 EXE 发布后同步到 `assets/screenshot.png`，避免使用非真实界面图片误导用户。

## ✨ 当前版本

### 图纸浏览

- 📄 多页 PDF 查看
- ◀ ▶ 上一页 / 下一页 / 页码跳转
- 🔍 适合窗口、放大、缩小
- 🖨️ 打印
- 💾 矢量方式导出标注 PDF
- 💾 默认建议保存到原 PDF 所在目录
- 🇬🇧 导出文件默认命名 `- Bubble Drawing.pdf`

### 标注

- 🔴 顺序编号气泡
- 🖱️ 选择、移动、复制、删除
- ↶ 撤销 / ↷ 重做
- ☁ 云线工具入口
- ↗ 引线工具入口
- T 多行文字工具入口
- 📐 长度 / 面积 / 半径 / 角度工具入口
- 🎨 标注颜色、大小、边框、字号
- 📋 标注列表与数量统计
- 📊 标注统计 CSV 导出

### 文档处理

- 📝 PDF 文字提取
- 🖼️ PDF 页面图片导出入口
- ⇄ 版本对比工作区入口
- 灰显原图辅助查找
- 图层显示/隐藏工作区

> **说明：** v0.2 已完成工作台和工具架构重组。部分 CAD 几何工具目前是 UI/数据入口，下一阶段会接入真实几何计算；不会把“按钮存在”冒充成完整 CAD 功能。

## 🧭 CAD 功能路线图

你提出的 40 项工程图功能将按阶段落地，而不是一次性堆叠到界面里。

### Phase 1 — PDF 工程图工作台

- 批量导出
- 网页式快速看图
- 标注分类/统计
- 标注复制/移动
- 云线、引线、多行文字
- 连续测量
- 半径/角度/圆/点到直线测量
- 面积/异形面积
- 查找文字与结果导出
- 原图灰显
- 快捷键自定义

### Phase 2 — 2D CAD

- DXF 打开/查看
- DWG 兼容路线
- CAD 矢量缩放
- 图层管理
- 布局 / 模型空间
- 外部参照
- 图纸版本转换
- 一键分图
- 图形数量统计
- CAD → PDF

### Phase 3 — 3D CAD

优先支持：

- STEP / STP
- STL
- IGES / IGS
- OBJ

目标：旋转、缩放、平移、标准视图、模型位置标注以及当前视角 PDF 出图。

### Phase 4 — 工程数据工具

- PDF → 图片
- PDF → Excel
- PDF → Word
- PDF 表格提取
- 文字提取
- 测量结果统计
- 批量导入 / 导出
- 天正 T3 转换路线研究
- 展开面积 / 偏移等工程计算

### Phase 5 — 专业 CAD 兼容

- DWG 深度兼容
- DWF / DWFX
- SolidWorks / Inventor / CATIA / Creo / NX 等格式路线评估
- OCR 与扫描图纸识别

## 🚀 快速开始

1. 前往 **[Latest Release](https://github.com/chinamore/PDFBubbleAnnotator/releases/latest)**。
2. 下载最新 `PDFBubbleAnnotator-Windows-x64.zip`。
3. 解压并运行 `PDFBubbleAnnotator.exe`。
4. 打开 PDF 图纸。
5. 使用顶部工具栏添加气泡、测量或批注。
6. 使用 **导出 PDF** 生成矢量标注文件。

## 📥 发布与下载

### Windows x64

👉 **[下载最新正式版本](https://github.com/chinamore/PDFBubbleAnnotator/releases/latest)**

正式版本统一发布到 GitHub Releases。每次稳定构建通过 Windows x64 CI 后再进入 Release，避免把未验证的构建提供给用户。

## 🧱 技术架构

```text
Windows EXE
    │
    ├── C / Win32 原生宿主
    │
    └── WebView2
          │
          ├── PDF.js  → PDF 查看 / 渲染
          ├── PDF-Lib → PDF 矢量输出
          └── Web UI  → 工具栏 / 标注 / 测量 / 统计

未来
    ├── 2D CAD Engine → DXF / DWG / DWF
    └── 3D Engine      → STEP / IGES / STL / OBJ
```

程序使用项目提供的 `app.ico` 作为 Windows 应用图标。

## 📦 项目结构

```text
PDFBubbleAnnotator/
├── main.c
├── main_native.c
├── resource.rc
├── app.ico
├── PDFBubbleAnnotator.vcxproj
├── web/
│   ├── index.html
│   └── converter.data
└── .github/workflows/
```

## 🌍 开源项目

项目目标不是只做一个“PDF 加气泡”的小工具，而是逐步建设一个轻量、易用、面向工程图纸的 Windows 工作台。

欢迎工程师、设计人员、审图人员和开发者参与测试、提交 Issue、建议新格式和贡献代码。

如果项目对你有帮助，欢迎在 GitHub 点 ⭐，帮助更多有类似需求的人发现它。

## 🐞 问题反馈

👉 [提交 Issue](https://github.com/chinamore/PDFBubbleAnnotator/issues)

## 📜 版本说明

当前工作台版本：**v0.2**。

版本发布以 GitHub Actions 的 Windows x64 构建和 GitHub Releases 页面为准。
