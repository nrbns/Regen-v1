; NSIS Installer Script for RegenBrowser with Ollama Auto-Install
; This creates a one-click installer that downloads and installs Ollama automatically

!include "MUI2.nsh"
!include "FileFunc.nsh"

; Installer Information
Name "RegenBrowser"
OutFile "RegenBrowser-Setup.exe"
InstallDir "$PROGRAMFILES\RegenBrowser"
InstallDirRegKey HKCU "Software\RegenBrowser" ""
RequestExecutionLevel admin

; UI Configuration
!define MUI_ICON "public\logo.png"
!define MUI_UNICON "public\logo.png"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "public\logo.png"
!define MUI_WELCOMEPAGE_TITLE "Welcome to RegenBrowser"
!define MUI_WELCOMEPAGE_TEXT "The AI-powered browser that works offline.$\r$\n$\r$\nThis installer will set up RegenBrowser and download your AI brain (Ollama + models)."
!define MUI_FINISHPAGE_TITLE "Installation Complete!"
!define MUI_FINISHPAGE_TEXT "RegenBrowser is ready to use. Your AI brain is downloading in the background."

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; Installer Sections
Section "RegenBrowser" SecMain
  SectionIn RO
  
  SetOutPath "$INSTDIR"
  
  ; Install main application files
  File /r "dist-web\*"
  File "package.json"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\RegenBrowser"
  CreateShortcut "$SMPROGRAMS\RegenBrowser\RegenBrowser.lnk" "$INSTDIR\RegenBrowser.exe"
  CreateShortcut "$DESKTOP\RegenBrowser.lnk" "$INSTDIR\RegenBrowser.exe"
  CreateShortcut "$SMPROGRAMS\RegenBrowser\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  
  ; Write registry
  WriteRegStr HKCU "Software\RegenBrowser" "" $INSTDIR
  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

Section "Ollama AI Engine" SecOllama
  DetailPrint "Checking for Ollama installation..."
  
  ; Check if Ollama is already installed
  ReadRegStr $0 HKLM "SOFTWARE\Ollama" "InstallPath"
  StrCmp $0 "" 0 OllamaInstalled
  
  DetailPrint "Ollama not found. Downloading installer..."
  
  ; Download Ollama installer
  inetc::get "https://ollama.com/download/windows" "$TEMP\ollama-installer.exe" /END
  Pop $0
  StrCmp $0 "OK" 0 DownloadFailed
  
  DetailPrint "Installing Ollama (this may take a few minutes)..."
  ExecWait '"$TEMP\ollama-installer.exe" /S' $0
  StrCmp $0 "0" 0 InstallFailed
  
  DetailPrint "Ollama installed successfully!"
  Goto OllamaInstalled
  
  DownloadFailed:
    MessageBox MB_ICONEXCLAMATION "Failed to download Ollama. You can install it manually from ollama.com"
    Goto EndOllama
  
  InstallFailed:
    MessageBox MB_ICONEXCLAMATION "Failed to install Ollama. You can install it manually from ollama.com"
    Goto EndOllama
  
  OllamaInstalled:
    DetailPrint "Ollama is ready. Models will download on first launch."
  
  EndOllama:
    ; Clean up
    Delete "$TEMP\ollama-installer.exe"
SectionEnd

; Uninstaller
Section "Uninstall"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"
  RMDir /r "$SMPROGRAMS\RegenBrowser"
  Delete "$DESKTOP\RegenBrowser.lnk"
  DeleteRegKey HKCU "Software\RegenBrowser"
SectionEnd

; Section Descriptions
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecMain} "RegenBrowser application files"
  !insertmacro MUI_DESCRIPTION_TEXT ${SecOllama} "Ollama AI engine (required for offline AI features)"
!insertmacro MUI_FUNCTION_DESCRIPTION_END

