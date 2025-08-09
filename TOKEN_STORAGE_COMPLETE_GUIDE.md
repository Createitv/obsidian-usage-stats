# 🔐 完整的Token信息存储指南

## 📋 概述

现在你的插件已经配置为**完整存储**所有的OAuth token信息，包括原始响应数据、token类型、作用域等详细信息。

## 🔧 存储的Token信息

### 基本Token信息
```typescript
{
  accessToken: "your_access_token",
  refreshToken: "your_refresh_token", 
  tokenExpiresAt: 1754818325717,
  tokenType: "Bearer",
  tokenScope: "read,write,upload"
}
```

### 完整的原始响应
```typescript
{
  tokenResponse: {
    access_token: "your_access_token",
    token_type: "Bearer", 
    expires_in: 2592000,
    refresh_token: "your_refresh_token",
    scope: "read,write,upload",
    received_at: 1754731925717  // 接收时间戳
  }
}
```

## 📊 存储架构

### 完整的认证数据结构
```json
{
  "version": "1.0.0",
  "auth": {
    "isAuthenticated": true,
    
    // 基本Token信息
    "accessToken": "697967ed27b04ced3b607e8593bd44e865ca164027ff604723df0a3aebba5a08",
    "refreshToken": "refresh_token_if_available",
    "tokenExpiresAt": 1754818325717,
    "tokenType": "Bearer",
    "tokenScope": "read,write,upload",
    
    // 原始Token响应（完整保存）
    "tokenResponse": {
      "access_token": "697967ed27b04ced3b607e8593bd44e865ca164027ff604723df0a3aebba5a08",
      "token_type": "Bearer",
      "expires_in": 2592000,
      "scope": "read,write,upload",
      "received_at": 1754731925717
    },
    
    // 用户信息
    "userInfo": {
      "email": "xfy150150@gmail.com",
      "nickname": "Pang Huang"
    },
    
    // 元数据
    "lastLoginTime": 1754731925717,
    "loginCount": 1,
    "version": "1.0.0"
  }
}
```

## 🚀 工作流程

### 1. OAuth成功后的完整存储流程
```
OAuth成功 → 
获取Token响应 → 
调用saveTokenResponse() → 
存储完整Token信息 → 
保存用户信息 → 
验证存储完整性 → ✅
```

### 2. 插件重新加载后的恢复流程
```
插件启动 → 
加载认证数据 → 
恢复Token信息 → 
设置HTTP客户端 → 
验证Token有效性 → ✅
```

## 🛠️ 新增功能

### 1. 完整Token存储方法
```typescript
// 保存完整的OAuth响应
await this.authStorage.saveTokenResponse(tokenResponse);
```

### 2. Token信息查询方法
```typescript
// 获取详细的Token信息
const tokenInfo = await this.authStorage.getTokenInfo();
console.log(tokenInfo);
// {
//   accessToken: "...",
//   refreshToken: "...",
//   tokenType: "Bearer",
//   scope: "read,write,upload", 
//   expiresAt: Date,
//   isExpired: false,
//   originalResponse: { ... }
// }
```

### 3. 存储统计信息
```typescript
// 获取存储统计
const stats = await this.authStorage.getStorageStats();
console.log(stats);
// {
//   hasAuth: true,
//   userEmail: "user@example.com",
//   tokenType: "Bearer",
//   tokenScope: "read,write,upload",
//   tokenExpiry: Date,
//   ...
// }
```

## 🔍 调试命令

### 1. 基本认证状态检查
命令：`Check Authentication Status`
- 显示认证状态概览
- 验证缓存完整性

### 2. 完整Token信息显示
命令：`Debug: Show Complete Token Information`
- 显示所有Token详细信息
- 显示原始OAuth响应
- 显示Token类型和作用域

### 3. 开发模式缓存恢复  
命令：`Dev: Recover Authentication Cache`
- 强制重新加载认证数据
- 修复可能的缓存问题

## 📝 使用示例

### 在代码中获取Token信息
```typescript
// 获取当前Token
const tokenInfo = await this.authStorage.getTokenInfo();

if (tokenInfo && !tokenInfo.isExpired) {
  console.log(`Using ${tokenInfo.tokenType} token with scope: ${tokenInfo.scope}`);
  // 使用Token进行API调用
} else {
  console.log("Token expired or not available");
  // 需要重新认证
}
```

### 检查存储的完整性
```typescript
// 验证认证数据完整性
const isValid = await this.authStorage.verifyIntegrity();
console.log("Auth data integrity:", isValid ? "✅ Valid" : "❌ Invalid");
```

## 🎯 预期的日志输出

### OAuth成功时
```
AuthService: Processing token response...
AuthService: Storing complete token data...
AuthStorage: Saving complete token response...
AuthStorage: Token data prepared: {
  hasAccessToken: true,
  hasRefreshToken: false,
  tokenType: "Bearer", 
  scope: "read,write,upload",
  expiresAt: "2025-09-08T17:32:05.717Z"
}
AuthService: ✅ Complete token data stored successfully
AuthService: Stored token details: {
  tokenType: "Bearer",
  scope: "read,write,upload", 
  hasRefreshToken: false,
  expiresAt: "2025-09-08T17:32:05.717Z",
  isExpired: false
}
```

### 插件重新启动时
```
Plugin startup: Checking authentication status...
AuthService: Loading stored auth from AuthStorage...
AuthService: Found auth data, restoring session...
AuthService: ✅ Auth session restored successfully
Plugin startup: Auth storage stats: {
  hasAuth: true,
  userEmail: "xfy150150@gmail.com",
  tokenType: "Bearer",
  tokenScope: "read,write,upload"
}
```

## ✅ 完整性检查

现在你的Token信息包含：

1. ✅ **Access Token** - 完整存储
2. ✅ **Refresh Token** - 如果可用
3. ✅ **Token类型** - "Bearer"
4. ✅ **作用域** - "read,write,upload"
5. ✅ **过期时间** - 精确时间戳
6. ✅ **原始响应** - 完整的OAuth响应数据
7. ✅ **接收时间** - Token获取的时间戳
8. ✅ **用户信息** - 邮箱、昵称等

## 🎉 现在的优势

1. **完整性** - 所有Token相关信息都被保存
2. **可追溯性** - 保留原始OAuth响应数据
3. **调试友好** - 详细的日志和调试命令
4. **持久化** - 重新启动后完全恢复所有信息
5. **类型安全** - 完整的TypeScript类型定义

你的Token信息现在被**完整**且**安全**地存储在Obsidian插件的官方数据文件中！🚀
