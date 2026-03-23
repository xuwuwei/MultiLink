# 修复二维码页面 IP 地址和端口显示问题

## 问题描述

用户反馈：二维码页面中的 IP 地址、端口、完整地址都显示为三个点 `...`。

## 问题分析

查看 `tray.rs` 中 `generate_qr_png` 函数的 HTML 模板：

```css
.url {{ 
  font-size: 18px; font-weight: bold; color: #1976d2;
  background: white; padding: 10px 20px; border-radius: 8px;
  margin-top: 8px; word-break: break-all; max-width: 400px; text-align: center; 
}}
```

问题原因：
1. `.url` 类设置了 `max-width: 400px` 限制宽度
2. 虽然 `word-break: break-all` 会换行，但可能被其他样式影响
3. 底部的 `<p>` 标签也有类似问题

## 解决方案

修改 `generate_qr_png` 函数中的 HTML 模板：

1. **移除 `.url` 的 `max-width` 限制** - 让地址完整显示
2. **调整底部 `<p>` 标签样式** - 确保文本不会被截断
3. **添加 `overflow: visible`** - 确保内容可见

## 修改步骤

### 步骤 1: 修改 CSS 样式

修改 `src/tray.rs` 中 `generate_qr_png` 函数的 HTML 模板：

```css
.url {{ 
  font-size: 18px; font-weight: bold; color: #1976d2;
  background: white; padding: 10px 20px; border-radius: 8px;
  margin-top: 8px; word-break: break-all; text-align: center; 
}}
```

移除 `max-width: 400px` 限制。

### 步骤 2: 修改底部段落样式

将底部 `<p>` 标签的样式从内联改为更宽松的样式，确保完整显示：

```html
<p style="margin-top:16px; color:#888; font-size:12px; word-break: break-all;">
  UDP: {url} &nbsp;|&nbsp; 保持与电脑在同一 WiFi 网络
</p>
```

## 预期效果

修改后，二维码页面将完整显示：
- IP 地址（如 `192.168.1.100`）
- 端口（如 `8080`）
- 完整连接地址（如 `http://192.168.1.100:8080`）
