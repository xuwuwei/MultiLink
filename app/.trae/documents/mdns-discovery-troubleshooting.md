# MDNS 服务发现问题排查计划

## 问题现象
应用启动时报错：`[error] - [MDNS] Failed to start discovery: {"code":"UNIMPLEMENTED"}`

## 问题分析

### 1. 文件检查结果

| 文件 | 当前值 | 问题 |
|------|--------|------|
| `capacitor.config.json` | `"ZeroConfPlugin"` | packageClassList 中的名称 |
| `ZeroConfPluginBridge.swift` | `@objc(ZeroConf)` + 类名 `ZeroConfPlugin` | Objective-C 名称是 `ZeroConf` |
| `index.ts` (前端) | `registerPlugin('ZeroConf')` | 注册插件名称是 `ZeroConf` |
| `project.pbxproj` | 文件名 `ZeroConfPluginBridge.swift` | 文件已添加到项目 |

### 2. 问题根源

Capacitor 插件加载机制：
1. `packageClassList` 中的名称用于查找 Swift 类
2. `@objc(XXX)` 注解定义了 Objective-C 运行时名称
3. `registerPlugin('XXX')` 使用 Objective-C 名称调用插件

**当前不一致**：
- `packageClassList` = `"ZeroConfPlugin"` (类名)
- `@objc(ZeroConf)` = Objective-C 名称是 `ZeroConf`
- `registerPlugin('ZeroConf')` = 使用 `ZeroConf`

### 3. 参考 TcpPlugin 的正确配置

TcpPlugin 配置：
- `@objc(TcpPlugin)` - Objective-C 名称
- 类名 `TcpPlugin`
- `packageClassList` = `"TcpPlugin"`
- 前端 `registerPlugin('TcpPlugin')`

**所有名称一致！**

## 修复方案

### 方案 A：统一使用 `ZeroConf` 名称（推荐）

修改 `capacitor.config.json`：
```json
"packageClassList": [
  "HapticsPlugin",
  "StatusBarPlugin", 
  "ZeroConf"
]
```

### 方案 B：统一使用 `ZeroConfPlugin` 名称

1. 修改 iOS Swift 文件：
```swift
@objc(ZeroConfPlugin)
public class ZeroConfPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ZeroConfPlugin"
    public let jsName = "ZeroConfPlugin"
    // ...
}
```

2. 修改前端 `index.ts`：
```typescript
registerPlugin('ZeroConfPlugin')
```

## 执行步骤

### 步骤 1：修改 capacitor.config.json
将 `"ZeroConfPlugin"` 改为 `"ZeroConf"`

### 步骤 2：重新构建和同步
```bash
npm run build && npx cap sync
```

### 步骤 3：在 Xcode 中重新编译运行

### 步骤 4：验证日志
检查是否还有 `UNIMPLEMENTED` 错误

## 其他可能问题

1. **Info.plist 权限**：确保有 Bonjour 服务权限
2. **网络权限**：确保应用有本地网络访问权限
3. **服务类型格式**：确保 `_keyboardn._tcp` 格式正确

## 验证检查清单

- [ ] capacitor.config.json 中 packageClassList 名称正确
- [ ] Swift 文件 @objc 注解名称与前端 registerPlugin 名称一致
- [ ] Swift 文件实现了 CAPBridgedPlugin 协议
- [ ] pluginMethods 正确定义了所有方法
- [ ] 文件已添加到 Xcode 项目的编译目标
