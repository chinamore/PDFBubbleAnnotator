import os
import sys
from pathlib import Path

from PyQt6.QtCore import QUrl
from PyQt6.QtGui import QIcon
from PyQt6.QtWidgets import QApplication, QFileDialog, QInputDialog, QLineEdit, QMessageBox, QMainWindow
from PyQt6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile, QWebEngineSettings
from PyQt6.QtWebEngineWidgets import QWebEngineView

APP_PASSWORD = "www.175.es"
APP_NAME = "PDF for Hu-Nan Zhu -Power By www.175.es"


def resource_path(relative: str) -> str:
    base = Path(sys._MEIPASS) if getattr(sys, "frozen", False) else Path(__file__).resolve().parent
    return str(base / relative)


def verify_password() -> bool:
    text, ok = QInputDialog.getText(None, "安全身份验证", "请输入软件使用授权密码：", QLineEdit.EchoMode.Password)
    if ok and text == APP_PASSWORD:
        return True
    if ok:
        QMessageBox.critical(None, "错误", "授权密码错误，软件拒绝访问！")
    return False


class PDFBalloonApp(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle(APP_NAME)
        self.resize(1400, 900)
        self.current_file_path = ""
        self.current_dir = ""

        icon = resource_path("app.ico")
        if os.path.exists(icon):
            self.setWindowIcon(QIcon(icon))

        # 每次启动使用临时 profile，清除旧缓存/访问记录，避免旧网页残留。
        self.profile = QWebEngineProfile(self)
        self.profile.setHttpCacheType(QWebEngineProfile.HttpCacheType.NoCache)
        self.profile.setPersistentCookiesPolicy(QWebEngineProfile.PersistentCookiesPolicy.NoPersistentCookies)
        self.profile.clearHttpCache()
        self.profile.clearAllVisitedLinks()

        self.page = QWebEnginePage(self.profile, self)
        self.browser = QWebEngineView(self)
        self.browser.setPage(self.page)
        settings = self.browser.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessFileUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, False)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, False)
        settings.setAttribute(QWebEngineSettings.WebAttribute.FullScreenSupportEnabled, True)
        self.profile.downloadRequested.connect(self._on_download_requested)

        index = Path(resource_path("web/index.html")).resolve()
        if not index.exists():
            QMessageBox.critical(self, "启动失败", f"找不到界面文件：{index}")
            raise RuntimeError("web/index.html missing")
        self.browser.setUrl(QUrl.fromLocalFile(str(index)))
        self.setCentralWidget(self.browser)

    def _on_download_requested(self, download) -> None:
        """导出文件默认保存到当前打开 PDF 的同一文件夹；取消则不创建文件。"""
        suggested = os.path.basename(download.suggestedFileName() or "export.bin")
        save_dir = self.current_dir if self.current_dir and os.path.isdir(self.current_dir) else str(Path.home() / "Downloads")
        if not os.path.isdir(save_dir):
            save_dir = str(Path.home())

        # 同名文件自动编号，避免覆盖原文件。
        target = Path(save_dir) / suggested
        if target.exists():
            stem, suffix = target.stem, target.suffix
            n = 1
            while True:
                candidate = Path(save_dir) / f"{stem} ({n}){suffix}"
                if not candidate.exists():
                    target = candidate
                    break
                n += 1

        download.setDownloadDirectory(str(target.parent))
        download.setDownloadFileName(target.name)
        download.accept()

    def closeEvent(self, event) -> None:
        try:
            self.profile.clearHttpCache()
            self.profile.clearAllVisitedLinks()
        except Exception:
            pass
        super().closeEvent(event)


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
