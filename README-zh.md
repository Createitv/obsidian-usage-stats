中文 | [English](./README.md)

# Obsidian 示例插件
这是一个用于 Obsidian (https://obsidian.md) 的示例插件。

该项目使用 Typescript 提供类型检查和文档支持。
此仓库依赖于最新的插件 API（obsidian.d.ts），它以 Typescript 定义格式提供，并包含描述其功能的 TSDoc 注释。

[![GitHub stars](https://img.shields.io/github/stars/RavenHogWarts/obsidian-plugin-starter?style=flat&label=星标)](https://github.com/RavenHogWarts/obsidian-plugin-starter/stargazers)
[![Total Downloads](https://img.shields.io/github/downloads/RavenHogWarts/obsidian-plugin-starter/total?style=flat&label=总下载量)](https://github.com/RavenHogWarts/obsidian-plugin-starter/releases)
[![GitHub License](https://img.shields.io/github/license/RavenHogWarts/obsidian-plugin-starter?style=flat&label=许可证)](https://github.com/RavenHogWarts/obsidian-plugin-starter/blob/master/LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/RavenHogWarts/obsidian-plugin-starter?style=flat&label=问题)](https://github.com/RavenHogWarts/obsidian-plugin-starter/issues)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/RavenHogWarts/obsidian-plugin-starter?style=flat&label=最后提交)](https://github.com/RavenHogWarts/obsidian-plugin-starter/commits/master)

## 安装
### 手动安装

1. 下载最新版本
2. 将 `main.js`、`styles.css` 和 `manifest.json` 复制到你的仓库插件文件夹中：`<vault>/.obsidian/plugins/obsidian-sample-plugin/`
3. 重新加载 Obsidian
4. 在设置 → 社区插件中启用插件

### BRAT（推荐给测试用户）
1. 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件
2. 在 BRAT 设置中点击“添加测试插件”
3. 输入 `RavenHogWarts/obsidian-sample-plugin`
4. 启用插件

## 开发指南

- 克隆此仓库
- 确保你的 NodeJS 版本至少为 v16 (`node --version`)
- 使用 `npm i` 或 `yarn` 安装依赖
- 使用 `npm run dev` 启动开发模式并进行实时编译
- 运行 `npm run build` 构建插件
- 运行 `npm run build:local` 构建插件并将其复制到您的 vault 插件文件夹（需要在项目根目录创建一个 `.env` 文件并添加：`VAULT_PATH=/path/to/your/vault`）
- 运行 `npm run version` 更新版本号并更新 manifest.json、version.json、package.json
- 运行 `npm run release` 构建插件并更新版本号

## 支持与帮助

如果你遇到任何问题或有建议：
- [在 GitHub 上提交问题](https://github.com/RavenHogWarts/obsidian-plugin-starter/issues)
- [加入讨论](https://github.com/RavenHogWarts/obsidian-plugin-starter/discussions) 提出问题或分享想法

如果你觉得这个插件对你有帮助，可以通过以下方式支持开发：
- 微信/支付宝：[二维码](https://s2.loli.net/2024/05/06/lWBj3ObszUXSV2f.png)

## 许可证

此项目基于 xxx LICENSE 许可 - 详情请参阅 [LICENSE](LICENSE) 文件。

## Star 历史

[![Star 历史图表](https://api.star-history.com/svg?repos=RavenHogWarts/

# 需要修改的文件
在开发或自定义插件时，以下文件可能需要修改：

## [config.yml](./.github/ISSUE_TEMPLATE/config.yml)
- url

## [release.yml](./.github/workflows/release.yml)
- 插件名称 xxx

## [manifest.json](./manifest.json)
- 作者
- 捐赠链接

## [manifest-beta.json](./manifest-beta.json)
- 作者
- 捐赠链接

## [package.json](./package.json)
- 作者
