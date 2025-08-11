# Obtime - Obsidian 使用时间统计

[English](README.md) | [中文](README_CN.md)

一个强大的 Obsidian 时间追踪插件，帮助您监控和分析笔记习惯，提供详细统计数据和美观的图表。

## ✨ 功能特性

### 📊 时间追踪
- **自动追踪**: 无需手动干预，无缝追踪 Obsidian 中的使用时间
- **会话管理**: 记录个人学习/工作会话的开始和结束时间
- **文件级追踪**: 监控特定笔记和文件的使用时间
- **实时更新**: 在状态栏中查看当前会话进度

### 📈 数据分析与可视化
- **美观图表**: 显示每日、每周和每月使用模式的交互式图表
- **详细统计**: 全面的分析数据，包括总时间、平均会话长度和生产力趋势
- **自定义日期范围**: 筛选和分析任意时间段的数据
- **导出功能**: 导出使用数据以供进一步分析

### 🔄 数据同步
- **云端同步**: 通过 SaaS 后端在多设备间同步使用数据
- **本地存储**: 所有数据首先存储在本地，确保隐私和离线访问
- **自动备份**: 定期数据同步以防止数据丢失
- **跨平台**: 在 Windows、macOS 和 Linux 上无缝工作

### ⚙️ 自定义设置
- **灵活设置**: 自定义追踪行为和显示偏好
- **隐私控制**: 选择要同步的数据和要保留在本地的内容
- **通知设置**: 配置提醒和通知
- **主题集成**: 自动适配您的 Obsidian 主题

## 🚀 安装方法

### 从 Obsidian 社区插件安装
1. 打开 Obsidian 设置
2. 进入社区插件
3. 关闭安全模式
4. 点击浏览并搜索 "Obtime"
5. 点击安装，然后启用

### 手动安装
1. 从 [GitHub Releases](https://github.com/createitv/obsidian-usage-stats/releases) 下载最新版本
2. 将插件文件夹解压到您的 Obsidian 库的插件文件夹中
3. 在 Obsidian 设置 > 社区插件中启用插件

## 📖 使用说明

### 开始使用
1. **启用追踪**: 插件启用后自动开始追踪
2. **查看状态**: 检查状态栏中的当前会话信息
3. **打开仪表板**: 使用命令面板或点击插件图标打开主视图

### 主要功能

#### 时间追踪仪表板
- 查看您的每日、每周和每月使用统计
- 查看当前会话进度和今日总时间
- 访问详细图表和分析

#### 会话管理
- 如需要可手动开始/停止追踪
- 查看活动会话信息
- 回顾历史会话数据

#### 数据导出
- 以各种格式导出使用数据
- 与生产力工具共享统计信息
- 备份您的追踪历史

### 命令
- `Obtime: 打开仪表板` - 打开主统计视图
- `Obtime: 开始追踪` - 手动开始新会话
- `Obtime: 停止追踪` - 结束当前会话
- `Obtime: 导出数据` - 导出您的使用统计

## 🛠️ 配置选项

### 常规设置
- **自动开始追踪**: 打开 Obsidian 时自动开始追踪
- **会话超时**: 设置会话被视为非活动状态前的等待时间
- **数据保留**: 配置保留历史数据的时间

### 隐私设置
- **同步偏好**: 选择要与云端同步的数据
- **仅本地存储**: 如果首选，保持所有数据本地
- **数据共享**: 控制共享的分析数据

### 显示设置
- **状态栏格式**: 自定义状态栏中显示的内容
- **图表主题**: 选择图表颜色和样式
- **通知偏好**: 设置提醒和通知

## 🔧 开发指南

### 环境要求
- Node.js 18.x 或更高版本
- TypeScript 知识
- Obsidian 插件开发经验

### 环境搭建
```bash
# 克隆仓库
git clone https://github.com/createitv/obsidian-usage-stats.git
cd obsidian-usage-stats

# 安装依赖
pnpm install

# 开始开发
pnpm dev
```

### 构建
```bash
# 生产环境构建
pnpm build

# 创建插件包
pnpm package
```

## 🤝 贡献指南

我们欢迎贡献！请查看我们的 [贡献指南](CONTRIBUTING.md) 了解详情。

### 开发工作流程
1. Fork 仓库
2. 创建功能分支
3. 进行更改
4. 如适用添加测试
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- 基于 [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api) 构建
- 图表由现代 Web 技术提供支持
- 图标来自 [Lucide React](https://lucide.dev/)

## 📞 支持

- **问题反馈**: [GitHub Issues](https://github.com/createitv/obsidian-usage-stats/issues)
- **讨论交流**: [GitHub Discussions](https://github.com/createitv/obsidian-usage-stats/discussions)
- **邮件联系**: [通过 GitHub 联系](https://github.com/createitv)

## 🔄 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解完整的更改和更新列表。

---

**为 Obsidian 社区用心制作 ❤️**
