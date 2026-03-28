@echo off
echo Building MultiLinkServer MSI...

cd /d "%~dp0"

REM Set WiX path (adjust if installed elsewhere)
if exist "C:\Program Files (x86)\WiX Toolset v3.11\bin" (
    set "WIX=C:\Program Files (x86)\WiX Toolset v3.11"
)

REM Clean old files
if exist *.wixobj del *.wixobj
if exist *.msi del *.msi

REM Compile
echo Compiling...
"%WIX%\bin\candle.exe" main.wxs -ext WixUIExtension
if errorlevel 1 goto error

REM Link
echo Linking...
"%WIX%\bin\light.exe" main.wixobj -o MultiLinkServer.msi -ext WixUIExtension
if errorlevel 1 goto error

echo Build successful: MultiLinkServer.msi
goto end

:error
echo Build failed!
exit /b 1

:end
