# RevenueCat 购买系统设置指南

## 1. 安装依赖

```bash
cd app
npm install cordova-plugin-purchases@^6.0.0
npx cap sync
```

## 2. RevenueCat 控制台配置

### 2.1 创建应用
1. 访问 [RevenueCat Dashboard](https://app.revenuecat.com)
2. 创建新项目
3. 添加 iOS 和 Android 应用

### 2.2 配置产品
1. 进入 **Products** 页面
2. 创建产品：
   - **Identifier**: `pro_lifetime`
   - **Product Type**: Non-Consumable (一次性购买)
   - **Price**: 你的定价（如 $4.99）

### 2.3 配置 Entitlement
1. 进入 **Entitlements** 页面
2. 创建 entitlement：
   - **Identifier**: `pro`
   - **Products**: 关联 `pro_lifetime` 产品

### 2.4 配置 App Store Connect
1. 在 App Store Connect 创建 **Non-Consumable** 内购项目
   - **Reference Name**: Pro Lifetime
   - **Product ID**: `pro_lifetime`
   - **Price**: 对应 RevenueCat 设置
2. 添加购买截图（用于审核）
3. 提交审核

### 2.5 配置 Google Play Console
1. 在 Play Console 创建 **一次性商品**
   - **Product ID**: `pro_lifetime`
   - **价格**: 对应设置
2. 添加订阅条款和隐私政策链接
3. 确保应用已签名并上传

### 2.6 连接 RevenueCat
1. 在 RevenueCat 项目中配置：
   - iOS: 添加 App-Specific Shared Secret（从 App Store Connect 获取）
   - Android: 添加 Service Account JSON（从 Google Cloud 获取）

## 3. 获取 API Keys

### iOS API Key
1. RevenueCat Dashboard → Project Settings → API Keys
2. 复制 **Public SDK Key** for iOS
3. 更新 `purchaseService.ts`:
```typescript
const REVENUECAT_API_KEY_IOS = 'your_ios_public_sdk_key';
```

### Android API Key
1. 同样在 API Keys 页面
2. 复制 **Public SDK Key** for Android
3. 更新 `purchaseService.ts`:
```typescript
const REVENUECAT_API_KEY_ANDROID = 'your_android_public_sdk_key';
```

**注意**: 你提供的 `sk_ZqpozrylKpOZgqMvUjbydNTUBQXdt` 看起来像是 **Secret API Key**，但 RevenueCat SDK 需要使用 **Public SDK Key**。

- Secret API Key (以 `sk_` 开头) → 用于服务器端
- Public SDK Key (以 `goog_`, `appl_`, `rc_` 开头) → 用于客户端

## 4. 测试购买

### iOS 沙盒测试
1. 在 App Store Connect → Users and Access → Sandbox Testers
2. 创建沙盒测试账号
3. 在 iOS 设备上登录沙盒账号（设置 → App Store → 沙盒账号）
4. 运行应用进行购买

### Android 测试
1. 在 Play Console → License Testing
2. 添加测试者邮箱
3. 确保应用使用 **签名版本**
4. 测试时不会扣款

## 5. 常见问题

### 购买按钮没反应
- 检查 API Key 是否正确（必须用 Public Key）
- 检查网络连接
- 查看 Xcode/Android Studio 控制台日志

### 产品找不到
- 确保 RevenueCat 中配置的产品 ID 与 App Store/Play Console 一致
- 等待几分钟让 RevenueCat 同步
- 确保应用已发布到 TestFlight/Internal Testing

### 购买后未解锁
- 检查 Entitlement 配置
- 查看 RevenueCat Dashboard 的 Customer 页面
- 检查是否有未完成的交易

## 6. 安全提示

**⚠️ 重要**: 你提供的 API Key (`sk_ZqpozrylKpOZgqMvUjbydNTUBQXdt`) 是 Secret Key，**不应该放在客户端代码中**。

**正确处理**:
- 客户端: 使用 Public SDK Key
- 服务器端: 使用 Secret API Key（用于验证购买、Webhook 等）

如果你只有 Secret Key，在 RevenueCat Dashboard 生成新的 Public SDK Key。
