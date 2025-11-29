; RegenBrowser NSIS Installer Script
; Creates zero-click .exe installer with auto-setup

!define APP_NAME "RegenBrowser"
!define APP_VERSION "0.1.0"
!define APP_PUBLISHER "Regen Team"
!define APP_EXE "RegenBrowser.exe"
!define OLLAMA_URL "https://ollama.com/download/OllamaSetup.exe"

Name "${APP_NAME}"
OutFile "${APP_EXE}"
InstallDir "$PROGRAMFILES\${APP_NAME}"
RequestExecutionLevel admin

; Modern UI
!include "MUI2.nsh"

; Installer pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages
!insertmacro MUI_LANGUAGE "English"

; Installer sections
Section "MainSection" SEC01
    SetOutPath "$INSTDIR"
    
    ; Copy all app files
    File /r "..\dist\*"
    File /r "..\src-tauri\target\release\${APP_EXE}"
    
    ; Create desktop shortcut
    CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}"
    
    ; Create start menu shortcut
    CreateDirectory "$SMPROGRAMS\${APP_NAME}"
    CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}"
    CreateShortcut "$SMPROGRAMS\${APP_NAME}\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
    
    ; Check if Ollama is installed
    ReadRegStr $0 HKLM "SOFTWARE\Ollama" "InstallPath"
    IfErrors 0 OllamaFound
    
    ; Download and install Ollama if not found
    MessageBox MB_YESNO "Ollama is not installed. Download and install it now?" IDYES DownloadOllama IDNO SkipOllama
    
    DownloadOllama:
        NSISdl::download "${OLLAMA_URL}" "$TEMP\OllamaSetup.exe"
        Pop $R0
        StrCmp $R0 "success" 0 OllamaDownloadFailed
        ExecWait "$TEMP\OllamaSetup.exe"
        Goto OllamaInstalled
        
    OllamaDownloadFailed:
        MessageBox MB_OK "Failed to download Ollama. Please install it manually from https://ollama.com"
        Goto SkipOllama
        
    OllamaFound:
    OllamaInstalled:
        ; Auto-start Ollama service
        ExecWait 'ollama serve'
        
    SkipOllama:
        ; Pull required model in background
        Exec '"$INSTDIR\${APP_EXE}"' ; Start app (it will pull model on first launch)
    
    ; Write registry for uninstaller
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${APP_PUBLISHER}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${APP_VERSION}"
    
    ; Create uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

; Uninstaller
Section "Uninstall"
    Delete "$INSTDIR\Uninstall.exe"
    Delete "$DESKTOP\${APP_NAME}.lnk"
    RMDir /r "$SMPROGRAMS\${APP_NAME}"
    RMDir /r "$INSTDIR"
    
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
SectionEnd

