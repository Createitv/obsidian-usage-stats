# 完整的OAuth认证流程指南

## 🎉 恭喜！协议处理器已经正常工作

根据您的日志，协议处理器现在可以正确接收回调URL了：
```
[UsageStats] Processing OAuth callback - state: kann0mmfhgdqve1l3qkkgf code: bcdfe61c8060b0b10233d1442ce9277e
```

## ❌ 当前问题

"Missing code verifier" 错误的原因是：您直接打开了回调URL，而没有先通过插件启动OAuth流程。

## ✅ 正确的OAuth流程

### 第1步：通过插件启动OAuth
**重要**：必须通过插件设置页面启动OAuth流程

1. 打开Obsidian设置 (Ctrl+, 或 Cmd+,)
2. 找到 "Usage Statistics" 插件设置
3. 在 "Cloud Synchronization" 部分
4. 点击 **"Login"** 按钮

这一步会：
- 生成 code verifier 和 code challenge
- 将 code verifier 保存到本地存储
- 打开浏览器进行授权

### 第2步：在浏览器中完成授权
1. 浏览器会自动打开授权页面
2. 输入您的用户名和密码
3. 点击授权/同意按钮
4. 浏览器会自动跳转到 `obsidian://oauth/callback?code=xxx&state=xxx`

### 第3步：插件自动处理回调
- Obsidian会自动接收回调URL
- 插件会使用之前保存的code verifier来交换token
- 获取用户信息并保存到插件中

## 🧪 测试方法

### 方法1：使用插件设置（推荐）
1. 重启Obsidian确保新代码生效
2. 打开插件设置
3. 点击"Login"按钮
4. 完成浏览器授权

### 方法2：使用调试命令
1. 按 Ctrl+P (或 Cmd+P) 打开命令面板
2. 搜索并执行 `Test Complete OAuth Flow`
3. 完成浏览器授权

## 📋 预期的完整日志输出

### 启动OAuth时：
```
[UsageStats] Step 1: Starting authentication...
[UsageStats] Step 2: OAuth flow started. Please complete authorization in browser.
[UsageStats] Step 3: After authorization, the callback URL will be automatically handled.
```

### 回调处理时：
```
[UsageStats] Protocol handler triggered with params: {code: "xxx", state: "xxx", action: "oauth/callback"}
[UsageStats] Processing OAuth callback - state: xxx code: xxx
AuthService: Code verifier found: true
AuthService: Exchanging code for token...
AuthService: Token exchange request to: http://localhost:3000/api/oauth/token
AuthService: Token exchange response status: 200
AuthService: Token exchange successful, received data keys: ["access_token", "refresh_token", ...]
AuthService: Fetching user info...
Login successful! Data synchronized with cloud service.
```

## 🔧 调试检查清单

### 如果启动OAuth失败：
- [ ] 检查Obtime服务是否在 http://localhost:3000 运行
- [ ] 检查网络连接
- [ ] 查看控制台错误信息

### 如果code verifier仍然missing：
- [ ] 确保您是通过插件启动的OAuth，而不是直接打开URL
- [ ] 检查localStorage中是否有 `oauth_code_verifier`
- [ ] 确保从启动到回调之间没有重启Obsidian

### 如果token交换失败：
- [ ] 检查authorization code是否过期（通常10分钟有效）
- [ ] 检查Obtime服务器状态
- [ ] 验证client credentials配置

## 🎯 下一步操作

请按照正确的流程操作：

1. **重新构建插件**：
   ```bash
   npm run build
   ```

2. **重启Obsidian**

3. **正确启动OAuth**：
   - 打开插件设置
   - 点击"Login"按钮
   - 或者使用命令 `Test Complete OAuth Flow`

4. **在浏览器中完成授权**

5. **查看完整的日志输出**

## 💡 提示

- 不要直接打开 `obsidian://oauth/callback?code=xxx` URL
- 必须先通过插件启动OAuth流程
- 确保Obtime服务正在运行
- 保持Obsidian开启直到完成整个流程

现在请尝试正确的流程，应该就能成功完成OAuth认证了！
