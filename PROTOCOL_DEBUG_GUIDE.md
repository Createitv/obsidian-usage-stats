# 协议处理器调试指南

## 问题现状

当打开URL `obsidian://oauth/callback?code=1a9eebf97313f26cd6f8ab6c84efc235&state=w0v5lr8pr4nssot7qbcrx` 时，终端没有任何日志输出。

## 调试步骤

### 第1步：确认插件已加载
1. 重启Obsidian
2. 打开开发者控制台 (Ctrl+Shift+I 或 Cmd+Option+I)
3. 查看是否有以下日志：
   ```
   [UsageStats] Plugin loaded successfully - starting OAuth handler registration
   [UsageStats] registerOAuthCallbackHandler start
   [UsageStats] OAuth protocol handler registered successfully
   ```

### 第2步：测试协议处理器注册
1. 在Obsidian中按 Ctrl+P (或 Cmd+P) 打开命令面板
2. 搜索并执行：`Test OAuth Protocol Handler`
3. 检查控制台是否有输出

### 第3步：测试URL处理逻辑
1. 执行命令：`Test Protocol URL Processing`
2. 检查控制台输出

### 第4步：检查操作系统协议关联

#### Windows系统
1. 打开注册表编辑器 (regedit)
2. 检查 `HKEY_CLASSES_ROOT\obsidian`
3. 确保指向正确的Obsidian安装路径

#### macOS系统
1. 打开终端，运行：
   ```bash
   /System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister -dump | grep obsidian
   ```
2. 确认Obsidian应用注册了`obsidian://`协议

#### Linux系统
1. 检查 `~/.local/share/applications/` 目录
2. 查看是否有Obsidian的.desktop文件
3. 确认该文件包含协议处理配置

### 第5步：手动测试协议URL

#### 方法1：通过浏览器
1. 在浏览器地址栏输入：
   ```
   obsidian://oauth/callback?code=test123&state=test456
   ```
2. 按Enter执行

#### 方法2：通过系统命令

**Windows:**
```cmd
start "" "obsidian://oauth/callback?code=test123&state=test456"
```

**macOS:**
```bash
open "obsidian://oauth/callback?code=test123&state=test456"
```

**Linux:**
```bash
xdg-open "obsidian://oauth/callback?code=test123&state=test456"
```

### 第6步：检查Obsidian日志

#### 查看Obsidian应用日志
1. 在Obsidian中按 Ctrl+Shift+I 打开开发者工具
2. 切换到Console标签
3. 过滤日志（搜索"UsageStats"）

#### 查看系统日志
**Windows:** 事件查看器
**macOS:** Console.app
**Linux:** journalctl 或 /var/log/

## 可能的问题和解决方案

### 1. 协议未正确注册
**症状**：点击URL时系统提示找不到应用程序
**解决**：重新安装Obsidian或手动注册协议

### 2. 插件未加载
**症状**：没有看到插件加载日志
**解决**：
- 检查插件是否已启用
- 检查插件文件完整性
- 重启Obsidian

### 3. 协议处理器注册失败
**症状**：看到加载日志但没有协议处理器注册成功的日志
**解决**：
- 检查Obsidian版本兼容性
- 查看是否有JavaScript错误

### 4. URL格式问题
**症状**：协议处理器收到的参数不正确
**解决**：
- 确保URL正确编码
- 检查特殊字符处理

### 5. 权限问题
**症状**：协议处理器注册但不触发
**解决**：
- 检查操作系统权限设置
- 以管理员身份运行Obsidian（Windows）

## 预期的正常输出

当一切正常工作时，您应该看到：

```
[UsageStats] Plugin loaded successfully - starting OAuth handler registration
[UsageStats] registerOAuthCallbackHandler start
[UsageStats] OAuth protocol handler registered successfully
[UsageStats] ========== PROTOCOL HANDLER TRIGGERED ==========
[UsageStats] Raw params object: {
  "action": "callback",
  "code": "1a9eebf97313f26cd6f8ab6c84efc235",
  "state": "w0v5lr8pr4nssot7qbcrx"
}
[UsageStats] Protocol handler triggered with params: {...}
[UsageStats] OAuth callback received with action: callback params: {...}
[UsageStats] Processing OAuth callback - state: w0v5lr8pr4nssot7qbcrx code: 1a9eebf97313f26cd6f8ab6c84efc235
```

## 下一步

请按照上述步骤逐一检查，并将每一步的结果（包括控制台输出、错误信息等）发送给我，这样我就能帮您精确定位问题所在。
