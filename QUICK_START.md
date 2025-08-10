# 🚀 快速开始指南

Obsidian 使用统计插件的完整构建和发布指南。

## 📦 项目结构

```
obsidian-usage-stats/
├── src/                     # 源代码
│   ├── main.ts             # 插件入口
│   ├── components/         # UI 组件
│   ├── core/               # 核心逻辑
│   ├── storage/            # 数据存储
│   ├── ui/                 # 用户界面
│   └── i18n/               # 国际化
├── style/                  # 样式文件
├── scripts/                # 构建脚本
│   ├── build-package.mjs   # 打包脚本
│   ├── release.mjs         # 发布脚本
│   └── esbuild.config.mjs  # esbuild 配置
├── .github/workflows/      # GitHub Actions
│   ├── ci.yml              # 持续集成
│   └── release.yml         # 自动发布
├── dist/                   # 构建输出（不提交到 git）
└── package.json            # 项目配置
```

## 🛠️ 开发工作流

### 1. 环境设置

```bash
# 克隆项目
git clone <repository-url>
cd obsidian-usage-stats

# 安装依赖
npm install

# 开发模式（自动重新构建）
npm run dev
```

### 2. 构建命令

```bash
# 开发模式构建（保留调试信息）
npm run package:dev

# 生产模式构建（压缩优化）
npm run package

# 构建到指定目录
npm run package:dist
```

### 3. 代码质量

```bash
# 运行 ESLint
npm run lint

# 自动修复代码风格
npm run lint:fix

# TypeScript 类型检查
npx tsc --noEmit --skipLibCheck
```

## 🚀 发布流程

### 自动发布（推荐）

```bash
# 发布补丁版本 (1.0.0 → 1.0.1)
npm run release:patch

# 发布次版本 (1.0.0 → 1.1.0) 
npm run release:minor

# 发布主版本 (1.0.0 → 2.0.0)
npm run release:major

# 发布指定版本
npm run release 1.2.3
```

发布脚本会自动：
- ✅ 检查代码状态
- ✅ 更新版本号
- ✅ 构建项目
- ✅ 创建 Git 标签
- ✅ 推送到 GitHub
- ✅ 触发自动发布

### GitHub Actions 自动化

推送标签后，GitHub Actions 会自动：
- 🔨 构建插件
- 📦 创建发布包
- 🚀 发布到 GitHub Releases
- 📝 生成发布说明

## 📋 可用脚本

| 命令 | 描述 |
|------|------|
| `npm run dev` | 开发模式，自动重新构建 |
| `npm run build` | 标准构建（TypeScript + esbuild） |
| `npm run package` | 生产模式打包 |
| `npm run package:dev` | 开发模式打包 |
| `npm run package:dist` | 打包到 dist 目录 |
| `npm run release` | 发布指定版本 |
| `npm run release:patch` | 发布补丁版本 |
| `npm run release:minor` | 发布次版本 |
| `npm run release:major` | 发布主版本 |
| `npm run lint` | 代码检查 |
| `npm run lint:fix` | 自动修复代码 |

## 🎯 插件安装

构建完成后，可以通过以下方式安装：

### 手动安装

1. 运行 `npm run package`
2. 复制 `dist/` 目录内容到：
   ```
   {Obsidian Vault}/.obsidian/plugins/obsidian-usage-stats/
   ```
3. 在 Obsidian 设置中启用插件

### 从 GitHub Releases 安装

1. 访问 [Releases 页面](https://github.com/createitv/obsidian-usage-stats/releases)
2. 下载最新的 `.zip` 文件
3. 解压到 Obsidian 插件目录
4. 启用插件

## 🔧 配置文件

### `manifest.json`
```json
{
  "id": "obsidian-usage-statistic",
  "name": "Obtime", 
  "version": "1.0.1",
  "minAppVersion": "1.8.0",
  "description": "Track time spent in Obsidian...",
  "author": "林逍遥",
  "isDesktopOnly": true
}
```

### `package.json`
包含项目依赖、脚本命令和构建配置。

### `tsconfig.json`
TypeScript 编译配置。

## 🐛 故障排除

### 构建失败

```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 清理构建输出
rm -rf dist main.js styles.css

# 重新构建
npm run package
```

### 发布失败

```bash
# 检查 Git 状态
git status

# 确保工作目录干净
git add . && git commit -m "fix: pending changes"

# 重新发布
npm run release:patch
```

### GitHub Actions 失败

1. 检查 Actions 页面的错误日志
2. 确保 `package.json` 中的依赖正确
3. 验证构建脚本在本地正常运行

## 📈 性能优化

- ✅ esbuild 极速构建
- ✅ 代码压缩和树摇
- ✅ CSS 预处理和优化
- ✅ 自动移除 console.log
- ✅ 源码映射（开发模式）

## 🔗 相关链接

- [Obsidian 插件开发文档](https://docs.obsidian.md/Plugins)
- [esbuild 文档](https://esbuild.github.io/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [语义化版本规范](https://semver.org/lang/zh-CN/)

---

🎉 现在你可以开始开发和发布 Obsidian 插件了！
