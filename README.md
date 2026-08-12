# PDF 图纸气泡序号标注工具 — C + WebView2 EXE

已加入用户提供的 `app.ico`，并通过 `resource.rc` 作为 Windows EXE 的程序图标。

## 当前结构

- `main.c`：Windows 原生 C 宿主
- `resource.rc`：将 `app.ico` 编译进 EXE
- `app.ico`：用户提供的图标
- `web/index.html`：原始标注界面
- `PDFBubbleAnnotator.vcxproj`：Visual Studio x64 工程

## 编译环境

- Windows 10/11
- Visual Studio 2022
- Desktop development with C++
- WebView2 Runtime
- NuGet restore

打开 `PDFBubbleAnnotator.vcxproj` 后执行 Restore NuGet Packages，然后选择 `Release | x64` 构建。

> 注意：当前 `index.html` 仍使用 CDN 上的 PDF.js / PDF-Lib，因此运行时需要网络访问这些 CDN。下一阶段可以把这两个 JS 文件改为本地内嵌资源，实现真正离线单目录/单 EXE 发行。
