import base64, os, sys, tempfile
from pathlib import Path
from PyQt6.QtCore import QObject, QUrl, pyqtSlot
from PyQt6.QtGui import QDesktopServices, QIcon
from PyQt6.QtWidgets import QApplication, QFileDialog, QInputDialog, QLineEdit, QMessageBox, QMainWindow
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile, QWebEngineSettings
from PyQt6.QtWebEngineWidgets import QWebEngineView
APP_PASSWORD="www.175.es"; APP_NAME="PDF for Hu-Nan Zhu -Power By www.175.es"
def resource_path(relative):
    base=Path(sys._MEIPASS) if getattr(sys,"frozen",False) else Path(__file__).resolve().parent
    return str(base/relative)
def verify_password():
    text,ok=QInputDialog.getText(None,"安全身份验证","请输入软件使用授权密码：",QLineEdit.EchoMode.Password)
    if ok and text==APP_PASSWORD:return True
    if ok:QMessageBox.critical(None,"错误","授权密码错误，软件拒绝访问！")
    return False
class NativeBridge(QObject):
    def __init__(self,window):super().__init__();self.window=window
    @pyqtSlot()
    def selectPdfFile(self):
        start=self.window.current_dir or str(Path.home());path,_=QFileDialog.getOpenFileName(self.window,"选择图纸文件",start,"CAD/PDF/Image Files (*.pdf *.dxf *.dwg *.png *.jpg *.jpeg *.webp *.bmp *.svg)")
        if not path:return
        self.window.current_file_path=path;self.window.current_dir=str(Path(path).parent)
        encoded=base64.b64encode(Path(path).read_bytes()).decode("ascii");name=Path(path).name.replace("\\","\\\\").replace("'","\\'")
        self.window.page.runJavaScript(f"window.onNativePdfLoaded('{encoded}','{name}');")
    @pyqtSlot(str,str)
    def printPdf(self,base64Data,fileName):
        try:
            raw=base64.b64decode(base64Data);safe_name=Path(fileName or "print.pdf").name
            if not safe_name.lower().endswith(".pdf"):safe_name+=".pdf"
            path=Path(tempfile.gettempdir())/("PDFBubbleAnnotator_Print_"+safe_name);path.write_bytes(raw)
            if sys.platform.startswith("win"):os.startfile(str(path),"print")
            else:QDesktopServices.openUrl(QUrl.fromLocalFile(str(path)))
            self.window.page.runJavaScript("window.onNativePrintStarted&&window.onNativePrintStarted();")
        except Exception as e:
            msg=str(e).replace("\\","\\\\").replace("'","\\'");self.window.page.runJavaScript(f"window.onNativePrintError&&window.onNativePrintError('{msg}');")
    @pyqtSlot(str)
    def openFolder(self,path):
        try:
            folder=Path(path).resolve() if path else Path(self.window.current_dir or Path.home())
            if not folder.exists():folder=folder.parent
            QDesktopServices.openUrl(QUrl.fromLocalFile(str(folder)))
        except Exception:pass
    @pyqtSlot()
    def openCurrentFolder(self):self.openFolder(self.window.current_dir)
class PDFBalloonApp(QMainWindow):
    def __init__(self):
        super().__init__();self.setWindowTitle(APP_NAME);self.resize(1400,900);self.current_file_path="";self.current_dir=""
        icon=resource_path("app.ico")
        if os.path.exists(icon):self.setWindowIcon(QIcon(icon))
        self.profile=QWebEngineProfile(self);self.profile.setHttpCacheType(QWebEngineProfile.HttpCacheType.NoCache);self.profile.setPersistentCookiesPolicy(QWebEngineProfile.PersistentCookiesPolicy.NoPersistentCookies);self.profile.clearHttpCache();self.profile.clearAllVisitedLinks()
        self.page=QWebEnginePage(self.profile,self);self.browser=QWebEngineView(self);self.browser.setPage(self.page);settings=self.browser.settings();settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessFileUrls,True);settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls,False);settings.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled,False)
        self.channel=QWebChannel(self.page);self.bridge=NativeBridge(self);self.channel.registerObject("nativeBridge",self.bridge);self.page.setWebChannel(self.channel);self.profile.downloadRequested.connect(self._on_download_requested);self.page.loadFinished.connect(self._inject_runtime_fix)
        index=Path(resource_path("web/index.html")).resolve()
        if not index.exists():QMessageBox.critical(self,"启动失败",f"找不到界面文件：{index}");raise RuntimeError("web/index.html missing")
        self.browser.setUrl(QUrl.fromLocalFile(str(index)));self.setCentralWidget(self.browser)
    def _inject_runtime_fix(self,ok):
        if not ok:return
        try:
            for filename in ("runtime_fix.js","feature_suite.js","measurement_suite.js","annotation_suite.js","local_zoom.js","cad_export.js","drawing_suite.js","3d_cad_suite.js","3d_advanced.js","sketcher_restore.js","freecad_shell.js"):
                patch=Path(resource_path("web"))/filename
                if patch.exists():self.page.runJavaScript(patch.read_text(encoding="utf-8"))
        except Exception as e:print("runtime fix injection failed:",e)
    def _on_download_requested(self,download):
        suggested=os.path.basename(download.suggestedFileName() or "export.bin");save_dir=self.current_dir if self.current_dir and os.path.isdir(self.current_dir) else str(Path.home()/"Downloads")
        if not os.path.isdir(save_dir):save_dir=str(Path.home())
        target=Path(save_dir)/suggested
        if target.exists():
            stem,suffix=target.stem,target.suffix;n=1
            while True:
                candidate=Path(save_dir)/f"{stem} ({n}){suffix}"
                if not candidate.exists():target=candidate;break
                n+=1
        download.setDownloadDirectory(str(target.parent));download.setDownloadFileName(target.name);download.accept();path_js=str(target).replace("\\","\\\\").replace("'","\\'");name_js=target.name.replace("\\","\\\\").replace("'","\\'");self.page.runJavaScript(f"window.onNativeDownloadSaved&&window.onNativeDownloadSaved('{path_js}','{name_js}');")
    def closeEvent(self,event):
        try:self.profile.clearHttpCache();self.profile.clearAllVisitedLinks()
        except Exception:pass
        super().closeEvent(event)
def main():
    app=QApplication(sys.argv);app.setApplicationName(APP_NAME);app.setOrganizationName("PDFBubbleAnnotator");icon=resource_path("app.ico")
    if os.path.exists(icon):app.setWindowIcon(QIcon(icon))
    if not verify_password():return 0
    window=PDFBalloonApp();window.showMaximized();return app.exec()
if __name__=="__main__":raise SystemExit(main())
