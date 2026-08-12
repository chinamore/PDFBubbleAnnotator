import sys
import os
import threading
from http.server import SimpleHTTPRequestHandler, HTTPServer
from PyQt6.QtCore import QUrl, QObject, pyqtSlot
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QFileDialog, QInputDialog, QLineEdit, QMessageBox
)
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineSettings, QWebEngineProfile
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtGui import QIcon

# -------------------------------------------------------------
# 🔒 设置你的自定义授权密码
# -------------------------------------------------------------
APP_PASSWORD = "www.175.es"


def get_resource_path(relative_path):
    """获取打包运行时的绝对资源路径（兼容 PyInstaller 临时目录）"""
    if getattr(sys, 'frozen', False):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)


class QuietHTTPRequestHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def start_local_server(port=28099):
    base_dir = get_resource_path("")
    os.chdir(base_dir)
    server = HTTPServer(('127.0.0.1', port), QuietHTTPRequestHandler)
    server.serve_forever()


class NativeBridge(QObject):
    def __init__(self, main_window):
        super().__init__()
        self.main_window = main_window

    @pyqtSlot()
    def selectPdfFile(self):
        start_dir = self.main_window.current_dir or ""
        file_path, _ = QFileDialog.getOpenFileName(
            self.main_window,
            "选择 PDF 图纸文件",
            start_dir,
            "PDF Files (*.pdf)"
        )
        if file_path:
            self.main_window.current_dir = os.path.dirname(file_path)
            self.main_window.current_file_path = file_path

            import base64
            with open(file_path, "rb") as f:
                encoded_data = base64.b64encode(f.read()).decode('utf-8')

            file_name = os.path.basename(file_path)
            js_code = f"window.onNativePdfLoaded('{encoded_data}', '{file_name}');"
            self.main_window.browser.page().runJavaScript(js_code)


class PDFBalloonApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("PDF 图纸气泡序号标注工具 - 桌面专业版")

        # 加载解压路径下的图标
        ico_path = get_resource_path("app.ico")
        if os.path.exists(ico_path):
            self.setWindowIcon(QIcon(ico_path))

        self.setGeometry(100, 100, 1400, 900)
        self.current_dir = ""
        self.current_file_path = ""

        self.browser = QWebEngineView()
        settings = self.browser.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessFileUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, True)

        self.channel = QWebChannel()
        self.bridge = NativeBridge(self)
        self.channel.registerObject("nativeBridge", self.bridge)
        self.browser.page().setWebChannel(self.channel)

        profile = QWebEngineProfile.defaultProfile()
        profile.downloadRequested.connect(self.on_download_requested)
        self.browser.setUrl(QUrl("http://127.0.0.1:28099/index.html"))
        self.setCentralWidget(self.browser)

    def on_download_requested(self, download_item):
        suggested_name = download_item.suggestedFileName()
        default_save_path = os.path.join(self.current_dir, suggested_name) if self.current_dir else suggested_name

        file_path, _ = QFileDialog.getSaveFileName(
            self,
            "保存标注后的 PDF 图纸",
            default_save_path,
            "PDF Files (*.pdf)"
        )

        if file_path:
            self.current_dir = os.path.dirname(file_path)
            download_item.setDownloadDirectory(self.current_dir)
            download_item.setDownloadFileName(os.path.basename(file_path))
            download_item.accept()


# 🔑 启动时的身份验证逻辑
def verify_password():
    text, ok = QInputDialog.getText(
        None,
        "安全身份验证",
        "请输入软件使用授权密码：",
        QLineEdit.EchoMode.Password
    )
    if ok and text == APP_PASSWORD:
        return True
    elif ok:
        QMessageBox.critical(None, "错误", "授权密码错误，软件拒绝访问！")
        return False
    else:
        return False


if __name__ == "__main__":
    app = QApplication(sys.argv)

    # 给全局 app 设置图标（作用于密码验证框与任务栏）
    ico_path = get_resource_path("app.ico")
    if os.path.exists(ico_path):
        app.setWindowIcon(QIcon(ico_path))

    # 1. 弹出密码验证
    if not verify_password():
        sys.exit(0)

    # 2. 验证成功，后台启动静态服务器
    server_thread = threading.Thread(target=start_local_server, daemon=True)
    server_thread.start()

    # 3. 显示主软件窗口
    window = PDFBalloonApp()
    window.showMaximized()
    sys.exit(app.exec())
