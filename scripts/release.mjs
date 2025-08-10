#!/usr/bin/env node

/**
 * Release Script for Obsidian Usage Stats Plugin
 *
 * 这个脚本帮助创建新的发布版本，包括：
 * - 更新版本号
 * - 创建 git tag
 * - 推送到 GitHub 触发自动发布
 */

import fs from 'fs-extra'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.join(__dirname, '..')

// 获取命令行参数
const args = process.argv.slice(2)
const versionArg = args[0]

if (!versionArg) {
	console.error('❌ 请提供版本号')
	console.log('用法: npm run release <version>')
	console.log('示例: npm run release 1.0.1')
	console.log('      npm run release patch   (自动递增补丁版本)')
	console.log('      npm run release minor   (自动递增次版本)')
	console.log('      npm run release major   (自动递增主版本)')
	process.exit(1)
}

// 检查工作目录是否干净
function checkWorkingDirectory() {
	try {
		const status = execSync('git status --porcelain', { encoding: 'utf8' })
		if (status.trim()) {
			console.error('❌ 工作目录不干净，请先提交所有更改')
			console.log('未提交的文件:')
			console.log(status)
			process.exit(1)
		}
	} catch (error) {
		console.error('❌ 无法检查 git 状态:', error.message)
		process.exit(1)
	}
}

// 获取当前版本
function getCurrentVersion() {
	const manifestPath = path.join(projectRoot, 'manifest.json')
	const manifest = fs.readJsonSync(manifestPath)
	return manifest.version
}

// 计算新版本号
function calculateNewVersion(current, type) {
	const parts = current.split('.').map(Number)

	switch (type) {
		case 'patch':
			parts[2]++
			break
		case 'minor':
			parts[1]++
			parts[2] = 0
			break
		case 'major':
			parts[0]++
			parts[1] = 0
			parts[2] = 0
			break
		default:
			// 直接指定版本号
			return type
	}

	return parts.join('.')
}

// 更新版本号
function updateVersion(newVersion) {
	console.log(`📝 更新版本号到 ${newVersion}`)

	// 更新 manifest.json
	const manifestPath = path.join(projectRoot, 'manifest.json')
	const manifest = fs.readJsonSync(manifestPath)
	manifest.version = newVersion
	fs.writeJsonSync(manifestPath, manifest, { spaces: '\t' })

	// 更新 package.json
	const packagePath = path.join(projectRoot, 'package.json')
	const packageJson = fs.readJsonSync(packagePath)
	packageJson.version = newVersion
	fs.writeJsonSync(packagePath, packageJson, { spaces: '\t' })

	console.log('✅ 版本号更新完成')
}

// 构建插件
function buildPlugin() {
	console.log('🔨 构建插件...')
	try {
		execSync('npm run package', { stdio: 'inherit', cwd: projectRoot })
		console.log('✅ 插件构建完成')
	} catch (error) {
		console.error('❌ 构建失败:', error.message)
		process.exit(1)
	}
}

// 创建提交和标签
function createCommitAndTag(version) {
	console.log('📝 创建提交和标签...')

	try {
		// 添加更改的文件
		execSync('git add manifest.json package.json', { cwd: projectRoot })

		// 创建提交
		execSync(`git commit -m "chore: bump version to ${version}"`, {
			cwd: projectRoot,
		})

		// 创建标签
		execSync(`git tag -a ${version} -m "Release ${version}"`, {
			cwd: projectRoot,
		})

		console.log('✅ 提交和标签创建完成')
	} catch (error) {
		console.error('❌ 创建提交和标签失败:', error.message)
		process.exit(1)
	}
}

// 推送到远程仓库
function pushToRemote(version) {
	console.log('🚀 推送到远程仓库...')

	try {
		// 推送提交
		execSync('git push', { cwd: projectRoot })

		// 推送标签
		execSync(`git push origin ${version}`, { cwd: projectRoot })

		console.log('✅ 推送完成')
	} catch (error) {
		console.error('❌ 推送失败:', error.message)
		console.log('你可以手动推送:')
		console.log(`git push && git push origin ${version}`)
		process.exit(1)
	}
}

// 主流程
async function main() {
	console.log('🚀 开始发布流程...')

	// 检查工作目录
	checkWorkingDirectory()

	// 获取当前版本
	const currentVersion = getCurrentVersion()
	console.log(`📋 当前版本: ${currentVersion}`)

	// 计算新版本
	const newVersion = calculateNewVersion(currentVersion, versionArg)
	console.log(`🎯 新版本: ${newVersion}`)

	// 确认发布
	if (process.env.CI !== 'true') {
		const readline = await import('readline')
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		})

		const answer = await new Promise((resolve) => {
			rl.question(`确认发布版本 ${newVersion}? (y/N): `, resolve)
		})

		rl.close()

		if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
			console.log('❌ 发布已取消')
			process.exit(0)
		}
	}

	// 更新版本号
	updateVersion(newVersion)

	// 构建插件
	buildPlugin()

	// 创建提交和标签
	createCommitAndTag(newVersion)

	// 推送到远程仓库
	pushToRemote(newVersion)

	console.log('🎉 发布流程完成!')
	console.log(`✨ 版本 ${newVersion} 已推送到 GitHub`)
	console.log('🔄 GitHub Actions 将自动构建和发布 Release')
	console.log(`🔗 查看发布进度: https://github.com/${getRepoInfo()}/actions`)
}

// 获取仓库信息
function getRepoInfo() {
	try {
		const remote = execSync('git remote get-url origin', {
			encoding: 'utf8',
		}).trim()
		const match = remote.match(/github\.com[:/](.+)\.git$/)
		return match ? match[1] : 'createitv/your-repo'
	} catch {
		return 'createitv/your-repo'
	}
}

// 运行主流程
main().catch((error) => {
	console.error('❌ 发布失败:', error)
	process.exit(1)
})
