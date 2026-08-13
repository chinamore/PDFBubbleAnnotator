@echo off
setlocal
set "SDK=%CD%\WebView2SDK"
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if not exist "%VSWHERE%" exit /b 2
for /f "usebackq delims=" %%I in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do set "VS=%%I"
if not defined VS exit /b 3
call "%VS%\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b 4
if not exist "%SDK%\build\native\Microsoft.Web.WebView2.targets" exit /b 5
msbuild PDFBubbleAnnotator.vcxproj /p:Configuration=Release /p:Platform=x64 /m
exit /b %errorlevel%
