import os
import sys
from pathlib import Path

from PyQt6.QtCore import QUrl
from PyQt6.QtGui import QIcon
from PyQt6.QtPrintSupport import QPrintDialog, QPrinter
from PyQt6.QtWidgets import (
    QApplication,
    QFileDialog,
    QInputDialog,
    QLineEdit,
    QMessageBox,
    QMainWindow,
)
from PyQt6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile, QWebEngineSettings
from PyQt6.QtWebEngineWidgets import QWebEngineView

APP_PASSWORD = "www.175.es"
APP_NAME = "PDF for Hu-Nan Zhu -Power By www.175.es"


def resource_path(relative: str) -> str:
    if getattr(sys, "frozen", False):
        base = Path(sys._MEIPASS)
    else:
        base = Path(__file__).resolve().parent
    return str(base / relative)


def verify_password() -> bool:
    text, ok = QInputDialog.getText(
        None,
        "安全身份验证",
        "请输入软件使用授权密码：",
        QLineEdit.EchoMode.Password,
    )
    if not ok:
        return False
    if text == APP_PASSWORD:
        return True
    QMessageBox.critical(None, "错误", "授权密码错误，软件拒绝访问！")
    return False


class PDFBalloonApp(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle(APP_NAME)
        self.resize(1400, 900)

        icon = resource_path("app.ico")
        if os.path.exists(icon):
            self.setWindowIcon(QIcon(icon))

        # 每次启动使用全新的临时 WebEngine Profile：不读取旧缓存、Cookie、LocalStorage。
        self.profile = QWebEngineProfile(self)
        self.profile.setHttpCacheType(QWebEngineProfile.HttpCacheType.NoCache)
        self.profile.setPersistentCookiesPolicy(
            QWebEngineProfile.PersistentCookiesPolicy.NoPersistentCookies
        )
        self.profile.clearHttpCache()
        self.profile.clearAllVisitedLinks()

        self.page = QWebEnginePage(self.profile, self)
        self.browser = QWebEngineView(self)
        self.browser.setPage(self.page)

        settings = self.browser.settings()
        settings.setAttribute(
            QWebEngineSettings.WebAttribute.LocalContentCanAccessFileUrls, True
        )
        settings.setAttribute(
            QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True
        )
        settings.setAttribute(
            QWebEngineSettings.WebAttribute.LocalStorageEnabled, False
        )
        settings.setAttribute(
            QWebEngineSettings.WebAttribute.FullScreenSupportEnabled, True
        )

        self.profile.downloadRequested.connect(self._on_download_requested)
        self.page.printRequested.connect(self._print_page)
        self.page.loadFinished.connect(self._apply_branding)

        index = Path(resource_path("web/index.html")).resolve()
        if not index.exists():
            QMessageBox.critical(self, "启动失败", f"找不到界面文件：{index}")
            raise RuntimeError("web/index.html missing")

        self.browser.setUrl(QUrl.fromLocalFile(str(index)))
        self.setCentralWidget(self.browser)

    def _apply_branding(self, ok: bool) -> None:
        if not ok:
            return
        name = APP_NAME.replace("\\", "\\\\").replace("'", "\\'")
        js = (
            f"document.title='{name}';"
            f"var b=document.querySelector('.brand');"
            f"if(b) b.textContent='{name}';"
        )
        self.page.runJavaScript(js)

    def _on_download_requested(self, download) -> None:
        """统一接管网页产生的 PDF/PNG 下载，避免 Qt WebEngine 默认下载失败。"""
        suggested = download.suggestedFileName() or "export.bin"
        current_dir = str(Path.home() / "Downloads")
        if not os.path.isdir(current_dir):
            current_dir = str(Path.home())

        if suggested.lower().endswith(".pdf"):
            file_filter = "PDF Files (*.pdf)"
            title = "保存标注后的 PDF"
        elif suggested.lower().endswith(".png"):
            file_filter = "PNG Images (*.png)"
            title = "保存 PNG 图片"
        else:
            file_filter = "All Files (*)"
            title = "保存导出文件"

        path, _ = QFileDialog.getSaveFileName(
            self,
            title,
            os.path.join(current_dir, suggested),
            file_filter,
        )
        if not path:
            download.cancel()
            return

        target = Path(path)
        download.setDownloadDirectory(str(target.parent))
        download.setDownloadFileName(target.name)
        download.accept()

    def _print_page(self) -> None:
        """处理网页 window.print()，直接调用 Windows 原生打印对话框。"""
        printer = QPrinter(QPrinter.PrinterMode.HighResolution)
        dialog = QPrintDialog(printer, self)
        dialog.setWindowTitle("打印 PDF 图纸")
        if dialog.exec() == QPrintDialog.DialogCode.Accepted:
            try:
                # Qt WebEngine 的打印结果保持当前网页渲染内容。
                self.page.print(printer, lambda result: None)
            except TypeError:
                # 兼容部分 PyQt6/QtWebEngine 版本的同步签名。
                try:
                    self.page.print(printer)
                except Exception as exc:
                    QMessageBox.critical(self, "打印失败", str(exc))
            except Exception as exc:
                QMessageBox.critical(self, "打印失败", str(exc))


def main() -> int:
    app = QApplication(sys.argv)
    app.setApplicationName(APP_NAME)
    app.setOrganizationName("PDFBubbleAnnotator")

    icon = resource_path("app.ico")
    if os.path.exists(icon):
        app.setWindowIcon(QIcon(icon))

    if not verify_password():
        return 0

    window = PDFBalloonApp()
    window.showMaximized()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
