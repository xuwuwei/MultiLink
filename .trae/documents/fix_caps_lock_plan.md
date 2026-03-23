# Caps Lock 大写字母输入修复计划是是晶

## 问题描述

在 Windows 环境下，当 Caps Lock 开启后，点击字母键不会输出大写字母。这是因为：

1. **HID 键盘协议特性**：无论发送 'a' 还是 'A'，HID 码都是一样的（0x04 对应 A 键）
2. **Windows 系统行为**：Windows 会记住 Caps Lock 状态，根据状态决定输出大小写
3. **当前实现问题**：link 端（Rust 后端）只是简单地将 HID 码转换为虚拟键码发送，没有处理 Caps Lock 状态

## 问题分析

### 前端行为 (app/src/components/Keyboard.tsx)

* 键盘组件维护了 `isCapsLockActive` 状态

* 当 Caps Lock 开启且点击字母键时，前端会发送大写字母（如 'A'）

* 但 HID\_CODES 中 'A' 和 'a' 都映射到 0x04

### 后端行为 (link/src/driver.rs)

* `send_key_press` 方法接收 HID 码，转换为虚拟键码（VK）

* 使用 `SendInput` API 发送按键事件

* 没有检查或设置 Caps Lock 状态

### 根本原因

Windows 的 `SendInput` 函数发送按键时，会受当前键盘状态影响（包括 Caps Lock）。
当 Caps Lock 开启时，系统期望接收到 Shift 修饰的按键来产生大写字母。

## 解决方案

### 方案选择：在 link 端发送按键时自动添加 Shift 修饰

当检测到 Caps Lock 开启时，对于字母键自动添加 Shift 修饰键一起发送。

**实现步骤：**

1. **检测 Caps Lock 状态**

   * 使用 Windows API `GetKeyState(VK_CAPITAL)` 检测 Caps Lock 是否开启

   * 在 driver.rs 中添加状态检测函数

2. **修改按键发送逻辑**

   * 在 `send_key_press` 中，如果是字母键（A-Z，HID 0x04-0x1D）且 Caps Lock 开启

   * 同时发送 Shift 键（HID 0xE1）+ 字母键

   * 在 `send_key_release` 中相应处理

3. **确保正确的按键序列**

   * 按下：Shift 按下 → 字母键按下 → 字母键释放 → Shift 释放

   * 或者使用组合键方式同时发送

## 具体修改

### 文件：link/src/driver.rs

1. 添加 Windows API 导入：

   * `GetKeyState` 函数

   * `VK_CAPITAL` 常量 (0x14)

2. 添加辅助函数：

   * `is_caps_lock_on()` - 检测 Caps Lock 状态

   * `is_letter_key(hid_code)` - 判断是否为字母键

3. 修改 `send_key_press`：

   * 如果 Caps Lock 开启且是字母键，同时发送 Shift + 字母

4. 修改 `send_key_release`：

   * 相应处理释放逻辑

### 代码示例

```rust
// 检测 Caps Lock 状态
const VK_CAPITAL: i16 = 0x14;

#[link(name = "user32")]
unsafe extern "system" {
    fn GetKeyState(nVirtKey: i32) -> i16;
}

fn is_caps_lock_on() -> bool {
    unsafe { (GetKeyState(VK_CAPITAL) & 0x0001) != 0 }
}

fn is_letter_key(hid_code: u8) -> bool {
    hid_code >= 0x04 && hid_code <= 0x1D // A-Z
}
```

## 验证计划

1. 编译 link 端代码
2. 在 Windows 上运行
3. 开启 Caps Lock，点击字母键，验证输出为大写
4. 关闭 Caps Lock，点击字母键，验证输出为小写
5. 测试 Shift + 字母组合是否正常工作

