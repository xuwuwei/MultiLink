1.双击tray 把界面制定 
2.默认app不是开机启动状态，需要开机启动，如果用户设置了，就按用户的来
3.把当前的icon设置的白一点，需要重新生成



1.把app/production/logo2.jpg替换为app的icon
2.在app前端设置里增加反馈按钮，点击后在弹窗打开 https://tally.so/r/aQGVKB

3.隐藏Pro按钮，
4.底部显示admob的测试广告，并且可以关闭（下次进来还会显示出来）

5.把app名keyboardN改成MultiLink: Remote Keyboard
6.把教程icon点击后用系统浏览器打开 https://xuwuwei.github.io/keyboard-help/
7.production/index.html 把mac和windows下载地址替换了


8.app的连接教程，
1.安装客户端 增加mac和windows的下载地址
2.把默认端口改成8333

9.没有发现mdns，也没有弹出教程


10.给连接教程增加 复制下载链接的按钮
11.当没有连接的时候，默认链接教程没有弹出来。局域网有服务，但是没有发现也排查下。
12 当没有连接的时候，用户点击no connection按钮也弹出教程弹窗。
13.statusbar 没有设置完全透明
14.当主题是浅色的时候，statusbar设置为light，当主题是深色，statusbar设置为dark
15.浅色主题的按键广播使用深色波浪。


16.index.html把语言补全


1.每10秒要检查mdns是否有新服务客户端打开

 
1.弹出教程弹窗就会报错
2.iphone上触控板弹出，需要有 完整的mask，触控板不要单独的背景色，触控板的背景也是mask
3.在iphone上有震动，为什么没有声音了，按道理声音和震动都应该有（根据配置来）



10.retro主题，添加设备icon 是白色的，跟主题不搭
11.广告关闭后，每5分钟弹出一次。
12.iphone上触控板弹出，需要有 完整的mask，目前只显示一半模糊mask
13.在iphone上有震动，为什么没有声音了
14.在 连接教程 这几个字后面增加 详细教程(高亮) 点击后浏览器打开 https://xuwuwei.github.io/keyboard-help/
15.因为有两个下载地址，所以需要两个复制地址按钮。
16.顶部的小窗口采用led数字和翻牌显示
17.当主题是浅色的时候，statusbar设置为dark，当主题是深色，statusbar设置为light
18.配置wix打包windows的MultiLinkServer的开机启动和桌面快捷方式
既然你提到了 **vix**，我理解你可能是在使用 **Wix Toolset**（通过 `cargo-wix` 插件）来为 Rust 程序生成 Windows 安装包（`.msi`）。

在 Windows 上实现“开机自启动”和“桌面快捷方式”，核心逻辑不在 Rust 代码里，而是在 **WiX 的 XML 配置文件 (`.wxs`)** 中定义。

---

### 1. 准备工作
首先，确保你安装了 `cargo-wix` 插件：
```bash
cargo install cargo-wix
# 初始化 wix 目录和 main.wxs 文件
cargo wix init
```

---

### 2. 配置桌面快捷方式
打开 `wix/main.wxs`，你需要找到 `Directory` 结构，并添加 `DesktopFolder` 的引用，然后在 `Component` 中定义快捷方式。

```xml
<Directory Id="TARGETDIR" Name="SourceDir">
    <Directory Id="ProgramFilesFolder">
        <Directory Id="INSTALLDIR" Name="YourAppName" />
    </Directory>
    <Directory Id="DesktopFolder" Name="Desktop" /> </Directory>

<Component Id="MainExecutable" Guid="*">
    <File Id="ExeFile" Source="target\release\your_app.exe" KeyPath="yes">
        <Shortcut Id="DesktopShortcut"
                  Directory="DesktopFolder"
                  Name="Your App Name"
                  WorkingDirectory="INSTALLDIR"
                  Advertise="yes"
                  Icon="AppIcon.exe" />
    </File>
</Component>
```

---

### 3. 配置开机自启动
Windows 的开机启动通常通过写入注册表 `Run` 键值实现。在同一个 `Component` 下添加以下代码：

```xml
<Component Id="AppAutoStart" Guid="你的唯一GUID">
    <RegistryValue Root="HKCU" 
                   Key="Software\Microsoft\Windows\CurrentVersion\Run" 
                   Name="YourAppName" 
                   Value="[INSTALLDIR]your_app.exe" 
                   Type="string" 
                   KeyPath="yes" />
</Component>
```

**注意：** 记得在底部的 `<Feature>` 标签中引用这个 `ComponentId`：
```xml
<Feature Id="MainProgram" Title="Installation" Level="1">
    <ComponentRef Id="MainExecutable" />
    <ComponentRef Id="AppAutoStart" />
</Feature>
```

---

### 4. 执行打包
配置完成后，直接运行命令即可生成安装包：
```bash
cargo wix
```
生成的 `.msi` 文件在安装后，会自动在桌面生成图标，并在用户登录 Windows 时自动启动程序。

---

### 5. 进阶建议：Rust 代码内控制
如果你希望用户可以在软件的“设置”界面里勾选是否开机启动（而不是强制安装时写入），建议不要在 WiX 里写死，而是使用 Rust 库 [**auto-launch**](https://crates.io/crates/auto-launch)。

**代码示例：**
```rust
use auto_launch::AutoLaunchBuilder;

fn main() {
    let app_path = std::env::current_exe().unwrap().to_str().unwrap().to_string();
    
    let auto = AutoLaunchBuilder::new()
        .set_app_name("MyRustApp")
        .set_app_path(&app_path)
        .build()
        .unwrap();

    // 启用开机启动
    auto.enable().unwrap(); 
}
```
