# 🏗️ Obsidian 插件认证数据存储最佳实践指南

## 📋 概述

这个指南解释了如何在 Obsidian 插件中**正确**存储用户认证信息和 token，避免常见的存储陷阱。

## ❌ 常见问题

### 问题1：使用 localStorage
```typescript
// ❌ 错误做法 - 使用 localStorage
localStorage.setItem('oauth_token', token);
```

**问题**：
- localStorage 在插件重新加载时可能被清空
- 不是 Obsidian 插件的官方存储方式
- 开发模式下经常丢失数据

### 问题2：直接存储在插件设置中
```typescript
// ❌ 错误做法 - 直接在设置中存储敏感信息
this.settings.accessToken = token; // 不安全
```

**问题**：
- 敏感信息暴露在配置文件中
- 没有适当的加密和隔离

## ✅ 正确的解决方案

### 1. 使用新的 AuthStorage 系统

我们创建了一个专门的 `AuthStorage` 类来处理认证数据：

```typescript
// ✅ 正确做法
import { AuthStorage } from "./storage/AuthStorage";

// 在插件初始化时
this.authStorage = new AuthStorage(this);

// 保存认证数据
await this.authStorage.saveAuthData({
    isAuthenticated: true,
    accessToken: token,
    userInfo: userInfo
});
```

### 2. 存储架构

```json
{
  "version": "1.0.0",
  "lastUpdated": 1754731925717,
  "auth": {
    "isAuthenticated": true,
    "accessToken": "your_access_token",
    "refreshToken": "your_refresh_token", 
    "tokenExpiresAt": 1754818325717,
    "userInfo": {
      "email": "user@example.com",
      "nickname": "User Name"
    },
    "lastLoginTime": 1754731925717,
    "loginCount": 1,
    "version": "1.0.0"
  },
  "dailyStats": { /* 其他插件数据 */ }
}
```

## 🔧 实现步骤

### 第1步：创建 AuthStorage 类

已经创建在 `src/storage/AuthStorage.ts`，提供：
- `saveAuthData()` - 保存认证数据
- `getAuthData()` - 读取认证数据  
- `clearAuthData()` - 清除认证数据
- `verifyIntegrity()` - 验证数据完整性

### 第2步：更新 AuthService

```typescript
export class AuthService extends Component {
    private authStorage: AuthStorage;
    
    constructor(authStorage: AuthStorage, legacyStorageAdapter?: any) {
        super();
        this.authStorage = authStorage;
        // 保留旧适配器用于数据迁移
        this.legacyStorageAdapter = legacyStorageAdapter;
    }
}
```

### 第3步：在主插件中初始化

```typescript
async onload() {
    // 初始化新的存储系统
    this.authStorage = new AuthStorage(this);
    
    // 传递给 AuthService
    this.authService = new AuthService(this.authStorage, legacyAdapter);
}
```

## 🔄 数据迁移

系统会自动从旧的存储方式迁移到新系统：

```typescript
private async migrateFromLegacyStorage(): Promise<void> {
    // 从 localStorage 或旧的 authStorage 读取数据
    const oldToken = await this.legacyStorageAdapter.getItem('oauth_access_token');
    
    if (oldToken) {
        // 迁移到新系统
        await this.authStorage.saveAuthData({
            accessToken: oldToken,
            // ... 其他数据
        });
        
        // 清理旧数据
        await this.clearLegacyStorage();
    }
}
```

## 📊 存储位置

### 开发模式
```
.obsidian/plugins/obsidian-usage-stats/data.json
```

### 生产模式 
```
<vault>/.obsidian/plugins/obsidian-usage-stats/data.json
```

## 🛠️ 调试命令

提供了两个调试命令：

1. **Check Authentication Status** - 检查完整认证状态
2. **Dev: Recover Authentication Cache** - 手动恢复缓存（开发模式）

## 🔍 验证方法

### 检查存储是否成功
```bash
# 查看插件数据文件
cat .obsidian/plugins/obsidian-usage-stats/data.json | jq '.auth'
```

### 预期输出
```json
{
  "isAuthenticated": true,
  "accessToken": "your_token_here",
  "userInfo": {
    "email": "user@example.com",
    "nickname": "User Name"
  },
  "version": "1.0.0"
}
```

## 🚀 优势

1. **持久化**：数据保存在 Obsidian 官方插件数据文件中
2. **隔离性**：认证数据独立存储，不影响其他插件功能
3. **版本控制**：支持数据格式版本管理和迁移
4. **完整性检查**：自动验证数据完整性
5. **开发友好**：提供调试命令和详细日志

## 📝 最佳实践

1. **立即保存**：认证成功后立即保存数据
2. **验证存储**：保存后验证数据是否正确写入
3. **错误处理**：妥善处理存储失败的情况
4. **定期检查**：定期验证认证数据的有效性
5. **清理机制**：提供清理无效数据的方法

## 🎯 解决的问题

- ✅ **开发模式下数据丢失** - 使用 Obsidian 官方存储 API
- ✅ **数据隔离** - 独立的认证数据存储区域  
- ✅ **版本兼容** - 支持数据格式升级和迁移
- ✅ **调试困难** - 提供详细日志和调试命令
- ✅ **数据安全** - 合理的数据存储结构

现在你的用户信息和 token 将稳定地存储在 Obsidian 中，不会因为开发模式重载而丢失！🎉
