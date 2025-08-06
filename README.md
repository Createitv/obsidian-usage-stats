# Obsidian Plugin Starter

一个现代化的 Obsidian 插件模板，具有模块化架构和丰富的视图界面功能。

## 功能特性

### 🎯 核心功能

-   **模块化架构**: 清晰的代码组织结构，易于维护和扩展
-   **插件视图**: 完整的侧边栏视图界面，支持多视图管理
-   **现代化 UI**: 基于 Obsidian 设计系统的美观界面
-   **国际化支持**: 内置 i18n 支持，可轻松添加多语言

### 🖥️ 视图功能

-   **多视图管理**: 创建、编辑、删除多个视图
-   **实时编辑**: 直接在界面中编辑视图内容
-   **视图切换**: 快速在不同视图间切换
-   **数据持久化**: 自动保存视图数据

### ⚙️ 设置系统

-   **完整设置界面**: 分类清晰的设置选项
-   **实时预览**: 设置更改立即生效
-   **默认值管理**: 智能的默认设置处理

### 🎮 命令系统

-   **多种命令类型**: 简单命令、编辑器命令、复杂命令
-   **条件执行**: 基于应用状态的智能命令执行
-   **快捷键支持**: 完整的键盘快捷键支持

## 项目结构

```
src/
├── main.ts                 # 主插件文件
├── types.ts               # 类型定义
├── index.ts               # 导出索引
├── components/            # UI 组件
│   ├── PluginView.ts     # 插件视图组件
│   ├── Modal.ts          # 模态框组件
│   └── SettingsTab.ts    # 设置标签页
├── commands/              # 命令管理
│   └── CommandManager.ts  # 命令管理器
└── i18n/                 # 国际化
    ├── i18n.ts           # i18n 核心
    ├── types.ts          # i18n 类型
    └── locales/          # 语言文件
        ├── en.ts         # 英文
        ├── zh.ts         # 中文
        └── zh-TW.ts      # 繁体中文
```

## 开发指南

### 添加新功能

1. **添加新组件**:

    ```typescript
    // src/components/NewComponent.ts
    export class NewComponent {
    	// 组件实现
    }
    ```

2. **添加新命令**:

    ```typescript
    // src/commands/CommandManager.ts
    this.plugin.addCommand({
    	id: "new-command",
    	name: "New Command",
    	callback: () => {
    		// 命令实现
    	},
    });
    ```

3. **添加新设置**:
    ```typescript
    // src/types.ts
    interface MyPluginSettings {
    	newSetting: string;
    }
    ```

### 样式定制

所有样式都在 `style/` 目录中：

-   `styles.css`: 基础样式
-   `view-styles.css`: 视图相关样式

### 国际化

在 `src/i18n/locales/` 中添加新的语言文件：

```typescript
// src/i18n/locales/ja.ts
export default {
	"plugin.name": "プラグイン名",
	"plugin.description": "プラグインの説明",
};
```

## 使用方法

### 安装插件

1. 下载插件文件
2. 将插件文件夹放入 Obsidian 插件目录
3. 在 Obsidian 中启用插件

### 基本操作

1. **打开插件视图**: 点击左侧工具栏的骰子图标
2. **添加新视图**: 在插件视图中点击 "Add New View" 按钮
3. **编辑视图**: 点击视图列表中的项目进行编辑
4. **删除视图**: 点击视图项目右侧的 "×" 按钮

### 命令面板

-   `Open Plugin View`: 打开插件视图
-   `Toggle Plugin View`: 切换插件视图显示
-   `Add New View`: 添加新视图
-   `Open sample modal (simple)`: 打开简单模态框
-   `Sample editor command`: 执行编辑器命令

## 技术栈

-   **TypeScript**: 类型安全的 JavaScript
-   **Obsidian API**: 官方插件 API
-   **CSS Variables**: 主题适配的样式系统
-   **模块化架构**: 清晰的代码组织

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 更新日志

### v1.0.0

-   初始版本
-   模块化架构重构
-   完整的视图界面功能
-   现代化 UI 设计
-   国际化支持
