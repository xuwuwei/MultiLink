# WiX MSI 打包指南

## 1. 安装 WiX Toolset

### Windows (推荐)

**方法1：使用 Chocolatey**
```powershell
choco install wixtoolset
```

**方法2：手动下载**
1. 访问 https://github.com/wixtoolset/wix3/releases
2. 下载 `wix311.exe` 或 `wix311-binaries.zip`
3. 安装并确保 `candle.exe` 和 `light.exe` 在 PATH 中

**验证安装**
```powershell
candle -?
light -?
```

## 2. 打包步骤

### 步骤1：构建 Rust 可执行文件

```bash
cd /Users/hf/Desktop/program/keyboardN/link
cargo build --release
```

确认文件存在：`target\release\MultiLinkServer.exe`

### 步骤2：编译 WiX 源文件

```bash
cd /Users/hf/Desktop/program/keyboardN/link/wix

candle main.wxs -out MultiLinkServer.wixobj
```

### 步骤3：链接生成 MSI

```bash
light MultiLinkServer.wixobj -out MultiLinkServer.msi
```

### 完整命令（PowerShell）

```powershell
cd C:\Users\hf\Desktop\program\keyboardN\link

# 构建 Rust
cargo build --release

# 编译 WiX
cd wix
candle main.wxs -out MultiLinkServer.wixobj

# 生成 MSI
light MultiLinkServer.wixobj -out MultiLinkServer.msi

# 验证安装包
ls MultiLinkServer.msi
```

## 3. 常见问题

### 问题1：找不到 candle/light 命令

```powershell
# 临时添加到 PATH（根据实际安装路径调整）
$env:PATH += ";C:\Program Files (x86)\WiX Toolset v3.11\bin"
```

### 问题2：缺少 license.rtf

```powershell
# 创建一个简单的 license.rtf
echo "MIT License" > license.rtf
```

### 问题3：快捷方式不显示

1. 检查文件路径是否正确
2. 使用日志查看详细错误：
   ```powershell
   msiexec /i MultiLinkServer.msi /l*v install.log
   ```
3. 查看日志文件中的错误信息

### 问题4：GUID 冲突

如果是正式发布，需要生成唯一的 GUID：

```powershell
# PowerShell
[guid]::NewGuid().ToString()
```

替换 `main.wxs` 中的 GUID。

## 4. 测试安装

### 安装
```powershell
msiexec /i MultiLinkServer.msi
```

### 静默安装（无界面）
```powershell
msiexec /i MultiLinkServer.msi /quiet /norestart
```

### 卸载
```powershell
msiexec /x MultiLinkServer.msi
```

或从 "添加或删除程序" 中卸载。

## 5. 安装后检查清单

安装完成后，检查以下内容：

- [ ] 桌面出现 "MultiLinkServer" 快捷方式
- [ ] 开始菜单 -> MultiLink 文件夹中有快捷方式
- [ ] 任务管理器 -> 启动 中有 MultiLinkServer
- [ ] 程序自动运行（安装完成后）

## 6. 高级：自定义图标

要为快捷方式添加图标：

1. 准备图标文件 `icon.ico`（放在 wix 目录）
2. 在 `main.wxs` 的 Product 标签内添加：
   ```xml
   <Icon Id="AppIcon.ico" SourceFile="icon.ico" />
   <Property Id="ARPPRODUCTICON" Value="AppIcon.ico" />
   ```
3. 修改 Shortcut 标签添加：`Icon="AppIcon.ico"`

## 7. 自动化脚本

创建 `build.ps1`：

```powershell
#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"

$projectDir = "C:\Users\hf\Desktop\program\keyboardN\link"
$wixDir = "$projectDir\wix"

# Build Rust
cd $projectDir
cargo build --release

# Build MSI
cd $wixDir
candle main.wxs -out MultiLinkServer.wixobj
light MultiLinkServer.wixobj -out MultiLinkServer.msi

Write-Host "✅ Build complete: $wixDir\MultiLinkServer.msi" -ForegroundColor Green
```

运行：
```powershell
.\build.ps1
```
