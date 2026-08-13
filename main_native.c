#include <windows.h>
#include <shlwapi.h>
#include <bcrypt.h>
#include <wchar.h>
#include "WebView2.h"
#pragma comment(lib, "shlwapi.lib")
#pragma comment(lib, "bcrypt.lib")

#define IDI_APP_ICON 101
static HWND g_hwnd=NULL; static ICoreWebView2Controller *g_controller=NULL; static ICoreWebView2 *g_webview=NULL; static wchar_t g_start_page[MAX_PATH*2];
static const BYTE PASSWORD_SHA256[32]={0xd7,0x04,0xb0,0xf4,0xd8,0x37,0x1b,0x9f,0x6d,0xe1,0x4a,0xcf,0x49,0xc7,0x26,0x2f,0xb5,0x5c,0x55,0x4c,0xe6,0x26,0x2a,0x54,0x44,0x23,0x12,0x7a,0xb2,0x0e,0xfa,0x5d};

static BOOL verify_password(void){
    wchar_t input[256]={0};
    if(MessageBoxW(NULL,L"PDF 图纸气泡序号标注工具\n\n请输入授权密码：\n\n密码框将在下一步显示。",L"安全身份验证",MB_OKCANCEL|MB_ICONINFORMATION)!=IDOK) return FALSE;
    int n=GetWindowTextW(NULL,input,256); (void)n;
    /* Native password input dialog implemented with a small modal dialog. */
    HINSTANCE h=GetModuleHandleW(NULL); 
    HWND dlg=CreateWindowExW(WS_EX_DLGMODALFRAME,L"STATIC",L"",WS_POPUP|WS_CAPTION|WS_SYSMENU,0,0,420,150,NULL,NULL,h,NULL);
    if(!dlg) return FALSE;
    return TRUE;
}

/* Use a standard Windows task dialog style password prompt. */
static BOOL password_prompt(void){
    wchar_t input[256]={0};
    /* A simple editable dialog is created dynamically. */
    HINSTANCE h=GetModuleHandleW(NULL);
    HWND dlg=CreateWindowExW(WS_EX_DLGMODALFRAME,L"#32770",L"安全身份验证",WS_POPUP|WS_CAPTION|WS_SYSMENU|WS_VISIBLE,0,0,460,180,NULL,NULL,h,NULL);
    if(!dlg) return FALSE;
    RECT r; GetWindowRect(dlg,&r); int sw=GetSystemMetrics(SM_CXSCREEN), sh=GetSystemMetrics(SM_CYSCREEN); SetWindowPos(dlg,NULL,(sw-460)/2,(sh-180)/2,460,180,SWP_NOZORDER);
    CreateWindowW(L"STATIC",L"请输入软件使用授权密码：",WS_CHILD|WS_VISIBLE,25,25,390,25,dlg,NULL,h,NULL);
    HWND edit=CreateWindowExW(WS_EX_CLIENTEDGE,L"EDIT",L"",WS_CHILD|WS_VISIBLE|ES_PASSWORD|ES_AUTOHSCROLL,25,55,390,28,dlg,NULL,h,NULL);
    HWND ok=CreateWindowW(L"BUTTON",L"确定",WS_CHILD|WS_VISIBLE|BS_DEFPUSHBUTTON,245,105,80,30,dlg,(HMENU)IDOK,h,NULL);
    HWND cancel=CreateWindowW(L"BUTTON",L"取消",WS_CHILD|WS_VISIBLE,335,105,80,30,dlg,(HMENU)IDCANCEL,h,NULL);
    (void)ok; (void)cancel; SendMessageW(edit,EM_SETLIMITTEXT,255,0); SetFocus(edit);
    ShowWindow(dlg,SW_SHOW); UpdateWindow(dlg);
    BOOL result=FALSE; MSG msg; int code=0;
    while(IsWindow(dlg) && GetMessageW(&msg,NULL,0,0)>0){
        if(msg.message==WM_COMMAND && (LOWORD(msg.wParam)==IDOK || LOWORD(msg.wParam)==IDCANCEL)){
            code=LOWORD(msg.wParam); if(code==IDOK) GetWindowTextW(edit,input,256); DestroyWindow(dlg); break;
        }
        TranslateMessage(&msg); DispatchMessageW(&msg);
    }
    if(code!=IDOK) return FALSE;
    int len=WideCharToMultiByte(CP_UTF8,0,input,-1,NULL,0,NULL,NULL); if(len<=0) return FALSE;
    char *utf8=(char*)HeapAlloc(GetProcessHeap(),HEAP_ZERO_MEMORY,(SIZE_T)len); if(!utf8) return FALSE;
    WideCharToMultiByte(CP_UTF8,0,input,-1,utf8,len,NULL,NULL);
    BCRYPT_ALG_HANDLE alg=NULL; BCRYPT_HASH_HANDLE hash=NULL; BYTE digest[32]={0}; DWORD cb=0;
    BOOL good=FALSE;
    if(BCryptOpenAlgorithmProvider(&alg,BCRYPT_SHA256_ALGORITHM,NULL,0)==0 && BCryptCreateHash(alg,&hash,NULL,0,NULL,0,0)==0 && BCryptHashData(hash,(PUCHAR)utf8,(ULONG)(len-1),0)==0 && BCryptFinishHash(hash,digest,32,0)==0) good=(memcmp(digest,PASSWORD_SHA256,32)==0);
    if(hash) BCryptDestroyHash(hash); if(alg) BCryptCloseAlgorithmProvider(alg,0); HeapFree(GetProcessHeap(),0,utf8);
    if(!good) MessageBoxW(NULL,L"授权密码错误，软件拒绝访问！",L"错误",MB_ICONERROR|MB_OK);
    return good;
}

static void get_start_page(void){wchar_t exe[MAX_PATH*2];DWORD n=GetModuleFileNameW(NULL,exe,(DWORD)(sizeof(exe)/sizeof(exe[0])));if(!n||n>=sizeof(exe)/sizeof(exe[0]))return;PathRemoveFileSpecW(exe);swprintf(g_start_page,sizeof(g_start_page)/sizeof(g_start_page[0]),L"file:///%s/web/index.html",exe);for(wchar_t*p=g_start_page;*p;++p)if(*p==L'\\')*p=L'/';}
static void resize_webview(void){if(!g_controller||!g_hwnd)return;RECT rc;GetClientRect(g_hwnd,&rc);ICoreWebView2Controller_put_Bounds(g_controller,rc);}
typedef struct EnvHandler{ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler iface;}EnvHandler;
static HRESULT STDMETHODCALLTYPE Env_QueryInterface(ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler*self,REFIID riid,void**ppv){if(!ppv)return E_POINTER;*ppv=NULL;if(IsEqualIID(riid,&IID_IUnknown)||IsEqualIID(riid,&IID_ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler)){*ppv=self;return S_OK;}return E_NOINTERFACE;}
static ULONG STDMETHODCALLTYPE Env_AddRef(ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler*self){(void)self;return 1;} static ULONG STDMETHODCALLTYPE Env_Release(ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler*self){(void)self;return 1;}
typedef struct ControllerHandler{ICoreWebView2CreateCoreWebView2ControllerCompletedHandler iface;}ControllerHandler;
static HRESULT STDMETHODCALLTYPE Controller_QueryInterface(ICoreWebView2CreateCoreWebView2ControllerCompletedHandler*self,REFIID riid,void**ppv){if(!ppv)return E_POINTER;*ppv=NULL;if(IsEqualIID(riid,&IID_IUnknown)||IsEqualIID(riid,&IID_ICoreWebView2CreateCoreWebView2ControllerCompletedHandler)){*ppv=self;return S_OK;}return E_NOINTERFACE;}
static ULONG STDMETHODCALLTYPE Controller_AddRef(ICoreWebView2CreateCoreWebView2ControllerCompletedHandler*self){(void)self;return 1;} static ULONG STDMETHODCALLTYPE Controller_Release(ICoreWebView2CreateCoreWebView2ControllerCompletedHandler*self){(void)self;return 1;}
static HRESULT STDMETHODCALLTYPE Controller_Invoke(ICoreWebView2CreateCoreWebView2ControllerCompletedHandler*self,HRESULT errorCode,ICoreWebView2Controller*controller){(void)self;if(FAILED(errorCode)||!controller)return errorCode;g_controller=controller;ICoreWebView2Controller_AddRef(g_controller);ICoreWebView2Controller_get_CoreWebView2(g_controller,&g_webview);resize_webview();if(g_webview)ICoreWebView2_Navigate(g_webview,g_start_page);return S_OK;}
static ICoreWebView2CreateCoreWebView2ControllerCompletedHandlerVtbl g_controller_vtbl={Controller_QueryInterface,Controller_AddRef,Controller_Release,Controller_Invoke}; static ControllerHandler g_controller_handler={{&g_controller_vtbl}};
static HRESULT STDMETHODCALLTYPE Env_Invoke(ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler*self,HRESULT errorCode,ICoreWebView2Environment*environment){(void)self;if(FAILED(errorCode)||!environment)return errorCode;return ICoreWebView2Environment_CreateCoreWebView2Controller(environment,g_hwnd,&g_controller_handler.iface);}
static ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandlerVtbl g_env_vtbl={Env_QueryInterface,Env_AddRef,Env_Release,Env_Invoke}; static EnvHandler g_env_handler={{&g_env_vtbl}};
static void init_webview(void){wchar_t userDataFolder[MAX_PATH*2],exe[MAX_PATH*2];DWORD n=GetModuleFileNameW(NULL,exe,(DWORD)(sizeof(exe)/sizeof(exe[0])));if(!n||n>=sizeof(exe)/sizeof(exe[0]))return;PathRemoveFileSpecW(exe);swprintf(userDataFolder,sizeof(userDataFolder)/sizeof(userDataFolder[0]),L"%s\\WebView2Data",exe);HRESULT hr=CreateCoreWebView2EnvironmentWithOptions(NULL,userDataFolder,NULL,&g_env_handler.iface);if(FAILED(hr))MessageBoxW(g_hwnd,L"无法启动 WebView2。请安装 Microsoft Edge WebView2 Runtime。",L"PDF 图纸气泡序号标注工具",MB_ICONERROR|MB_OK);}
static LRESULT CALLBACK wnd_proc(HWND hwnd,UINT msg,WPARAM wParam,LPARAM lParam){switch(msg){case WM_SIZE:resize_webview();return 0;case WM_DESTROY:if(g_webview){ICoreWebView2_Release(g_webview);g_webview=NULL;}if(g_controller){ICoreWebView2Controller_Release(g_controller);g_controller=NULL;}PostQuitMessage(0);return 0;}return DefWindowProcW(hwnd,msg,wParam,lParam);}
int WINAPI wWinMain(HINSTANCE hInstance,HINSTANCE hPrev,PWSTR lpCmdLine,int nCmdShow){(void)hPrev;(void)lpCmdLine;if(!password_prompt())return 0;if(FAILED(CoInitializeEx(NULL,COINIT_APARTMENTTHREADED)))return 1;get_start_page();WNDCLASSEXW wc={0};wc.cbSize=sizeof(wc);wc.hInstance=hInstance;wc.lpfnWndProc=wnd_proc;wc.lpszClassName=L"PDFBubbleAnnotatorWindow";wc.hCursor=LoadCursor(NULL,IDC_ARROW);wc.hIcon=LoadIconW(hInstance,MAKEINTRESOURCEW(IDI_APP_ICON));wc.hIconSm=wc.hIcon;wc.hbrBackground=(HBRUSH)(COLOR_WINDOW+1);RegisterClassExW(&wc);g_hwnd=CreateWindowExW(0,wc.lpszClassName,L"PDF 图纸气泡序号标注工具",WS_OVERLAPPEDWINDOW,CW_USEDEFAULT,CW_USEDEFAULT,1280,900,NULL,NULL,hInstance,NULL);if(!g_hwnd){CoUninitialize();return 1;}ShowWindow(g_hwnd,nCmdShow);UpdateWindow(g_hwnd);init_webview();MSG msg;while(GetMessageW(&msg,NULL,0,0)>0){TranslateMessage(&msg);DispatchMessageW(&msg);}CoUninitialize();return(int)msg.wParam;}
