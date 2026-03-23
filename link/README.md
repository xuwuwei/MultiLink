# Keyboard Server - PC端键盘/触摸板模拟器

这是一个在PC（Mac/Windows）上运行的服务器程序，配合Pad App使用，将Pad模拟为键盘和触摸板。

## 功能特性

### 已实现功能
- **键盘模拟**: 接收网络事件并模拟键盘按键
- **触摸板模拟**: 接收触摸事件并模拟鼠标移动
- **网络通信**: 支持UDP和TCP协议
- **mDNS服务**: 自动发现局域网内的服务
- **抖动缓冲**: 优化网络延迟导致的按键抖动
- **防抖处理**: 避免重复按键
- **命令行菜单**: 交互式菜单显示IP、二维码、开机启动等选项

### GUI功能（待启用）
当前版本由于网络限制使用简化实现，安装以下依赖后可启用完整GUI：

1. **系统托盘图标** - 在任务栏显示图标和菜单
2. **二维码显示** - 生成连接二维码供手机扫描
3. **开机启动** - 设置程序开机自启动
4. **帮助页面** - 打开使用教程

## 安装依赖（启用完整功能）

当网络可用时，运行以下命令安装GUI依赖：

```bash
# 添加依赖
cargo add local-ip-address qrcode image auto-launch webbrowser

# 可选：添加系统托盘支持（Windows/Linux）
cargo add tray-icon winit

# 或者使用 Cargo.toml.full
mv Cargo.toml.full Cargo.toml
```

## 构建运行

### 基本运行（当前版本）
```bash
cargo run
```

### 发布构建
```bash
cargo build --release
```

### 开机启动模式运行
```bash
./keyboard --auto-start
# 或
./keyboard -a
```

## 使用方法

1. **启动程序**
   ```bash
   cargo run
   ```

2. **查看连接信息**
   - 程序启动后会显示IP地址和端口
   - 默认端口：UDP 8080, TCP 8081

3. **扫描二维码连接**
   - 在菜单中选择选项2生成二维码
   - 或选择选项3打开二维码图片
   - 用Pad App扫描二维码即可连接

4. **设置开机启动**
   - 在菜单中选择选项4切换开机启动状态

5. **退出程序**
   - 按 `Ctrl+C`
   - 或在菜单中选择选项6

## 项目结构

```
keyboard/
├── Cargo.toml          # 项目配置
├── Cargo.toml.full     # 完整配置（带GUI依赖）
├── src/
│   ├── main.rs         # 程序入口
│   ├── driver.rs       # Windows/Mac键盘鼠标驱动
│   ├── network.rs      # 网络通信(UDP/TCP)
│   ├── buffer.rs       # 抖动缓冲和防抖
│   ├── mdns.rs         # mDNS服务发现
│   ├── hid.rs          # HID键盘报告定义
│   ├── scancode.rs     # 扫描码转换
│   ├── tray.rs         # 简化版系统托盘
│   ├── tray_full.rs    # 完整版系统托盘（待启用）
│   └── auto_start.rs   # 开机启动管理
└── README.md
```

## 通信协议

### 键盘事件
```json
{
  "event": {
    "KeyDown": 4    // HID键码
  },
  "timestamp": 1234567890
}
```

### 文本输入
```json
{
  "event": {
    "Text": "Hello World"
  },
  "timestamp": 1234567890
}
```

### 鼠标移动
```json
{
  "event": {
    "MouseMove": [10, -5]  // x, y 相对移动
  },
  "timestamp": 1234567890
}
```

## 开机启动实现

### Windows
- 使用注册表：`HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
- 或使用 `auto-launch` crate

### macOS
- 使用 LaunchAgent：`~/Library/LaunchAgents/`
- 或使用 `auto-launch` crate

## 平台支持

- ✅ Windows（已实现 SendInput API）
- 🔄 macOS（需要添加 CGEvent API 实现）
- ⏳ Linux（待实现）

## 添加Mac支持

在 `driver.rs` 中添加Mac实现：

```rust
#[cfg(target_os = "macos")]
mod macos {
    use core_graphics::event::{CGEvent, CGEventType, CGKeyCode};
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

    pub fn send_key(key_code: u16, down: bool) {
        let source = CGEventSource::new(CGEventSourceStateID::HIDSystemState).unwrap();
        let event_type = if down {
            CGEventType::KeyDown
        } else {
            CGEventType::KeyUp
        };

        let event = CGEvent::new_keyboard_event(source, key_code as CGKeyCode, down).unwrap();
        event.post(core_graphics::event::CGEventTapLocation::HID);
    }
}
```

## 下一步开发

1. 安装GUI依赖启用完整系统托盘
2. 添加Mac平台驱动支持
3. 创建安装程序（Windows installer / Mac dmg）
4. 添加更完善的错误处理
5. 实现加密通信（TLS）

## 许可证

MIT License
