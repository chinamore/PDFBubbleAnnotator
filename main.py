import os
import sys
from pathlib import Path

from PyQt6.QtCore import QUrl
from PyQt6.QtGui import QIcon
from PyQt6.QtWidgets import QApplication, QInputDialog, QLineEdit, QMessageBox, QMainWindow
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

        # 独立、临时 WebEngine Profile：不复用旧缓存、LocalStorage 或历史记录。
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
            QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, False
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
        # 强制把网页标题、顶部品牌以及 Web 页面标题统一为正式名称，
        # 防止旧版 HTML 中残留的 PDF Bubble Annotator 文案再次显示。
        name = APP_NAME.replace("\\", "\\\\").replace("'", "\\'")
        js = f"document.title='{name}'; var b=document.querySelector('.brand'); if(b) b.textContent='{name}';"
        self.page.runJavaScript(js)

    def _on_download_requested(self, download) -> None:
        download.accept()

    def _print_page(self) -> None:
        return


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
