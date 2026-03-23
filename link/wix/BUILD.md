# WiX MSI 构建指南

## 前置要求

1. 安装 WiX Toolset v3.x
2. 确保 `candle.exe` 和 `light.exe` 在 PATH 中

## 构建步骤

### 1. 首先构建 Rust 项目

```bash
cd /Users/hf/Desktop/program/keyboardN/link
cargo build --release
```

确保 `target\release\MultiLinkServer.exe` 存在。

### 2. 生成 GUID（首次使用）

如果这是第一次构建，需要生成 UpgradeCode：

```powershell
[guid]::NewGuid().ToString()
```

将输出的 GUID 替换 `main.wxs` 中的 `UpgradeCode`。

### 3. 编译 WiX 文件

```bash
cd /Users/hf/Desktop/program/keyboardN/link/wix
candle main.wxs
```

这应该会生成 `main.wixobj`。

### 4. 链接生成 MSI

```bash
light main.wixobj -o MultiLinkServer.msi
```

生成的 `MultiLinkServer.msi` 就是最终的安装包。

## 安装包功能

- **桌面快捷方式**：安装后会自动创建
- **开始菜单**：会在开始菜单的 "MultiLink" 文件夹中创建快捷方式
- **开机启动**：默认启用开机启动（HKLM 注册表）
- **自动运行**：安装完成后会自动启动程序

## 故障排除

### 快捷方式没有出现

1. 确认安装时选择了 "Everyone"（所有用户）
2. 检查安装日志：`msiexec /i MultiLinkServer.msi /l*v install.log`
3. 确认 `.exe` 文件路径正确

### 构建错误

- 确保 WiX Toolset v3 已正确安装
- 检查 `main.wxs` 中的文件路径是否与你的系统匹配

## 文件说明

- `main.wxs` - WiX 源文件（已配置好快捷方式、注册表等）
- `license.rtf` - 许可协议（可选，没有会报错）
