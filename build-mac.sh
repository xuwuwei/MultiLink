#!/bin/bash

# RemotePadServer macOS 打包脚本
# 构建通用二进制（同时支持 Intel 和 Apple Silicon）

set -e

echo "=========================================="
echo "RemotePadServer macOS 打包脚本"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ] || [ ! -d "src-tauri" ]; then
    echo "错误: 请在 link 目录下运行此脚本"
    exit 1
fi

echo "[1/5] 安装 npm 依赖..."
npm ci

echo ""
echo "[2/5] 检查 Rust 目标..."
rustup target add x86_64-apple-darwin aarch64-apple-darwin 2>/dev/null || echo "目标已安装"

echo ""
echo "[3/5] 安装 Tauri CLI（如未安装）..."
if ! command -v cargo-tauri &> /dev/null; then
    cargo install tauri-cli --version "^2.0.0" --locked
else
    echo "Tauri CLI 已安装"
fi

echo ""
echo "[4/5] 构建通用 macOS 应用..."
echo "    这可能需要几分钟时间..."
cargo tauri build --target universal-apple-darwin

echo ""
echo "[5/5] 验证构建结果..."
APP_PATH="target/universal-apple-darwin/release/bundle/macos/RemotePadServer.app"
DMG_PATH="target/universal-apple-darwin/release/bundle/dmg"

if [ -d "$APP_PATH" ]; then
    echo "    ✓ 应用包: $APP_PATH"
    echo "    ✓ 架构信息:"
    lipo -info "$APP_PATH/Contents/MacOS/RemotePadServer" | sed 's/^/      /'
else
    echo "    ✗ 应用包未找到"
    exit 1
fi

if [ -d "$DMG_PATH" ]; then
    echo "    ✓ DMG 目录: $DMG_PATH"
    ls -lh "$DMG_PATH"/*.dmg 2>/dev/null | awk '{print "      " $9 " (" $5 ")"}'
fi

echo ""
echo "=========================================="
echo "打包完成！"
echo "=========================================="
echo ""
echo "DMG 文件位置:"
echo "  $DMG_PATH/RemotePadServer_0.1.0_universal.dmg"
echo ""
echo "可以直接分发此 DMG 文件，它同时支持 Intel 和 Apple Silicon Mac"
