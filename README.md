# PDF Bubble Annotator

> **专业 PDF 图纸气泡序号标注工具｜Windows 免费下载**
>
> 打开 PDF → 添加气泡序号 → 拖动调整 → 矢量方式保存 → 打印/分享。

[![Windows](https://img.shields.io/badge/Windows-10%2F11-blue)](https://www.microsoft.com/windows/)
[![Platform](https://img.shields.io/badge/platform-x64-lightgrey)](#)
[![License](https://img.shields.io/badge/license-see-repository-lightgrey)](#)

## 🖥️ 软件界面

![PDF Bubble Annotator](https://raw.githubusercontent.com/chinamore/PDFBubbleAnnotator/main/assets/screenshot.png)

> 软件截图将随项目版本同步更新。建议使用上面的实际软件界面截图，让用户在下载前快速了解操作方式。

## ✨ 为什么值得使用？

PDF Bubble Annotator 面向工程图纸、技术文件、审图和现场修改标记场景，专门解决在 PDF 上快速添加圆形序号气泡的问题。

### 核心功能

- 📄 **PDF 图纸查看** — 打开多页 PDF，支持上一页/下一页和页码跳转
- 🔴 **气泡序号标注** — 点击页面即可添加序号气泡
- 🖱️ **拖动调整** — 气泡可以直接拖动到准确位置
- ↩️ **撤销 / 删除** — 快速修改错误标注
- 🎨 **气泡样式** — 可调整外圈、填充、字体、字号、边框和透明度
- 🔍 **CAD 式缩放** — 放大、缩小、适合窗口查看图纸
- 📐 **矢量 PDF 输出** — 标注直接写入 PDF 图形内容，不再把整页转换成 PNG，因此放大时不会出现普通位图的马赛克问题
- 🖨️ **打印** — 直接打印处理后的 PDF
- 💾 **智能保存** — 默认使用打开文件所在目录，并建议使用英文文件名 `- Bubble Drawing.pdf`
- 🖼️ **PDF 转图片** — 支持将 PDF 页面批量导出为图片
- 📊 **PDF 转 Excel** — 提取 PDF 文字及页面坐标，并整理为 Excel
- 📝 **PDF 转 Word** — 将 PDF 页面文字整理到 Word 文档
- 🔒 **Windows EXE** — C + WebView2 原生 Windows 宿主，最终以 EXE 形式运行

## 🚀 快速开始

1. 下载最新 Windows 版本。
2. 解压 ZIP。
3. 运行 `PDFBubbleAnnotator.exe`。
4. 点击 **打开 PDF**。
5. 在图纸上点击需要标记的位置。
6. 调整气泡位置和样式。
7. 点击 **保存 PDF**。

## 📥 下载

### Windows x64

👉 **[下载最新版本](https://github.com/chinamore/PDFBubbleAnnotator/releases/latest)**

所有正式版本都会发布到 GitHub Releases，方便全球用户获取最新 Windows 构建版本。

## 🧰 适用场景

- 工程图纸审查
- CAD/PDF 图纸修改标记
- 施工图审图
- 机械设计图纸编号
- 品质检验 / QA 标记
- 技术文件批注
- PDF 图纸返工和问题追踪

## 🔧 技术架构

```text
Windows EXE
    │
    ├── C / Win32 原生宿主
    │
    └── WebView2
          │
          ├── PDF.js       → PDF 查看与渲染
          ├── PDF-Lib      → PDF 矢量输出
          └── Web UI       → 气泡标注、翻页、缩放、转换
```

程序使用你的 `app.ico` 作为 Windows 应用程序图标。

## 📦 项目结构

```text
PDFBubbleAnnotator/
├── main.c
├── resource.rc
├── app.ico
├── PDFBubbleAnnotator.vcxproj
├── web/
│   └── index.html
├── assets/
│   └── screenshot.png
└── .github/
    └── workflows/
```

## 🌍 开源与发布

本项目使用 GitHub 进行源码管理、Windows 自动编译和 Release 发布。欢迎工程师、设计人员、审图人员以及 PDF 工具开发者使用、反馈和改进。

如果这个工具对你有帮助，欢迎在 GitHub 点一个 ⭐，帮助更多有类似需求的人发现它。

## 🐞 问题反馈

发现 Bug、希望增加功能或有 PDF 转换需求，可以直接提交 GitHub Issue：

👉 https://github.com/chinamore/PDFBubbleAnnotator/issues

## 📜 说明

PDF Bubble Annotator 是一个专注于 PDF 图纸气泡序号标注和工程文档处理的 Windows 工具。发布页面中的版本以 GitHub Actions 自动构建结果为准。
