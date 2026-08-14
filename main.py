import os
import sys
from pathlib import Path

from PyQt6.QtCore import QUrl
from PyQt6.QtGui import QIcon
from PyQt6.QtWidgets import QApplication, QInputDialog, QLineEdit, QMessageBox, QMainWindow
from PyQt6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile, QWebEngineSettings
from PyQt6.QtWebEngineWidgets import QWebEngineView

APP_PASSWORD = "www.175.es"
APP_NAME = "PDF 图纸气泡序号标注工具"


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
        self.setWindowTitle(f"{APP_NAME} - Offline Edition")
        self.resize(1400, 900)

        icon = resource_path("app.ico")
        if os.path.exists(icon):
            self.setWindowIcon(QIcon(icon))

        # 独立、临时 WebEngine Profile：不复用旧缓存、LocalStorage 或历史记录。
        # 这样每次启动都会从打包后的 web/index.html 重新加载，避免旧版本 UI 残留。
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

        # 页面内的下载（PDF/PNG）仍交给 WebEngine 的下载处理器，
        # HTML 自己负责默认文件名和格式。
        self.profile.downloadRequested.connect(self._on_download_requested)
        self.page.printRequested.connect(self._print_page)

        index = Path(resource_path("web/index.html")).resolve()
        if not index.exists():
            QMessageBox.critical(self, "启动失败", f"找不到界面文件：{index}")
            raise RuntimeError("web/index.html missing")

        self.browser.setUrl(QUrl.fromLocalFile(str(index)))
        self.setCentralWidget(self.browser)

    def _on_download_requested(self, download) -> None:
        # 接受网页产生的下载请求；WebEngine 会使用临时文件目录，
        # 不需要额外的本地 HTTP 服务。
        download.accept()

    def _print_page(self) -> None:
        # 页面内已有打印窗口/浏览器打印流程；这里保留原生 printRequested 钩子，
        # 不强制覆盖用户的打印设置。
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
