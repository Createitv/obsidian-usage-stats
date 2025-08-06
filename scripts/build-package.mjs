import esbuild from "esbuild";
import fs from "fs-extra";
import path from "path";
import archiver from "archiver";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// 读取配置文件
async function loadConfig() {
	const packageJsonPath = path.join(projectRoot, "package.json");
	const manifestJsonPath = path.join(projectRoot, "manifest.json");
	
	let packageJson = {};
	let manifestJson = {};
	
	try {
		packageJson = await fs.readJson(packageJsonPath);
	} catch (error) {
		console.warn("⚠️  Could not read package.json:", error.message);
	}
	
	try {
		manifestJson = await fs.readJson(manifestJsonPath);
	} catch (error) {
		console.warn("⚠️  Could not read manifest.json:", error.message);
	}
	
	return { packageJson, manifestJson };
}

// 配置
const config = {
	pluginName: "obsidian-plugin-starter",
	version: "1.0.0",
	distDir: path.join(projectRoot, "dist"),
	buildDir: path.join(projectRoot, "build"),
	sourceDir: projectRoot,
};

// 只包含构建后的文件（不包含源代码）
const includeFiles = [
	"main.js",
	"styles.css",
	"manifest.json",
	"README.md",
	"LICENSE",
	"CHANGELOG.md",
];

// 不包含源代码目录
const includeDirs = [];

/**
 * 构建插件
 */
async function buildPlugin() {
	console.log("🔨 Building plugin...");
	
	try {
		// 清理构建目录
		await fs.remove(config.buildDir);
		await fs.ensureDir(config.buildDir);

		// 使用 esbuild 构建
		const result = await esbuild.build({
			entryPoints: ["src/main.ts"],
			bundle: true,
			external: [
				"obsidian",
				"electron",
				"@codemirror/autocomplete",
				"@codemirror/collab",
				"@codemirror/commands",
				"@codemirror/language",
				"@codemirror/lint",
				"@codemirror/search",
				"@codemirror/state",
				"@codemirror/view",
				"@lezer/common",
				"@lezer/highlight",
				"@lezer/lr",
			],
			format: "cjs",
			target: "es2020",
			logLevel: "info",
			sourcemap: false,
			treeShaking: true,
			outfile: path.join(config.buildDir, "main.js"),
			minify: true,
			drop: ["console"],
			loader: {
				".ttf": "base64",
			},
		});

		console.log("✅ Plugin built successfully");
		return result;
	} catch (error) {
		console.error("❌ Build failed:", error);
		throw error;
	}
}

/**
 * 复制必要文件到构建目录
 */
async function copyFiles() {
	console.log("📁 Copying files...");
	
	try {
		// 复制主要文件
		for (const file of includeFiles) {
			const sourcePath = path.join(config.sourceDir, file);
			const destPath = path.join(config.buildDir, file);
			
			if (await fs.pathExists(sourcePath)) {
				await fs.copy(sourcePath, destPath);
				console.log(`  ✓ Copied ${file}`);
			} else {
				console.log(`  ⚠️  File not found: ${file}`);
			}
		}

		// 复制样式文件（如果存在）
		const stylesSourcePath = path.join(config.sourceDir, "style", "styles.css");
		const stylesDestPath = path.join(config.buildDir, "styles.css");
		
		if (await fs.pathExists(stylesSourcePath)) {
			await fs.copy(stylesSourcePath, stylesDestPath);
			console.log("  ✓ Copied styles.css");
		} else {
			console.log("  ⚠️  styles.css not found");
		}

		console.log("✅ Files copied successfully");
	} catch (error) {
		console.error("❌ Copy failed:", error);
		throw error;
	}
}

/**
 * 创建压缩文件
 */
async function createArchive() {
	console.log("📦 Creating archive...");
	
	try {
		// 确保 dist 目录存在
		await fs.ensureDir(config.distDir);
		
		const archiveName = `${config.pluginName}-v${config.version}.zip`;
		const archivePath = path.join(config.distDir, archiveName);
		
		// 创建写入流
		const output = fs.createWriteStream(archivePath);
		const archive = archiver("zip", {
			zlib: { level: 9 } // 最大压缩级别
		});

		// 监听事件
		output.on("close", () => {
			const size = (archive.pointer() / 1024 / 1024).toFixed(2);
			console.log(`✅ Archive created: ${archiveName} (${size} MB)`);
		});

		archive.on("warning", (err) => {
			if (err.code === "ENOENT") {
				console.warn("⚠️  Archive warning:", err);
			} else {
				throw err;
			}
		});

		archive.on("error", (err) => {
			throw err;
		});

		// 管道输出
		archive.pipe(output);

		// 添加构建目录中的所有文件
		archive.directory(config.buildDir, false);

		// 完成归档
		await archive.finalize();
		
		return archivePath;
	} catch (error) {
		console.error("❌ Archive creation failed:", error);
		throw error;
	}
}

/**
 * 清理构建目录
 */
async function cleanup() {
	console.log("🧹 Cleaning up...");
	
	try {
		await fs.remove(config.buildDir);
		console.log("✅ Cleanup completed");
	} catch (error) {
		console.error("❌ Cleanup failed:", error);
	}
}

/**
 * 显示构建信息
 */
function showBuildInfo() {
	console.log("📋 Build Information:");
	console.log(`  📦 Plugin Name: ${config.pluginName}`);
	console.log(`  📋 Version: ${config.version}`);
	console.log(`  📁 Output Directory: ${config.distDir}`);
	console.log(`  🔨 Build Directory: ${config.buildDir}`);
	console.log(`  📂 Source Directory: ${config.sourceDir}`);
	console.log("");
}

/**
 * 验证构建结果
 */
async function validateBuild() {
	console.log("🔍 Validating build...");
	
	const requiredFiles = ["main.js", "manifest.json"];
	const buildDir = config.buildDir;
	
	for (const file of requiredFiles) {
		const filePath = path.join(buildDir, file);
		if (await fs.pathExists(filePath)) {
			console.log(`  ✓ ${file} exists`);
		} else {
			console.log(`  ❌ ${file} missing`);
			throw new Error(`Required file missing: ${file}`);
		}
	}
	
	console.log("✅ Build validation passed");
}

/**
 * 显示打包内容
 */
async function showPackageContents() {
	console.log("📦 Package contents:");
	
	const buildDir = config.buildDir;
	const files = await fs.readdir(buildDir);
	
	for (const file of files) {
		const filePath = path.join(buildDir, file);
		const stats = await fs.stat(filePath);
		const size = (stats.size / 1024).toFixed(1);
		console.log(`  📄 ${file} (${size} KB)`);
	}
	
	console.log("");
}

/**
 * 主函数
 */
async function main() {
	console.log("🚀 Starting plugin packaging...");
	
	// 加载配置
	const { packageJson, manifestJson } = await loadConfig();
	
	// 更新配置
	if (packageJson.name) {
		config.pluginName = packageJson.name;
	}
	if (packageJson.version) {
		config.version = packageJson.version;
	}
	if (manifestJson.name) {
		config.pluginName = manifestJson.name;
	}
	if (manifestJson.version) {
		config.version = manifestJson.version;
	}
	
	showBuildInfo();
	
	try {
		// 1. 构建插件
		await buildPlugin();
		
		// 2. 复制文件
		await copyFiles();
		
		// 3. 验证构建
		await validateBuild();
		
		// 4. 显示打包内容
		await showPackageContents();
		
		// 5. 创建压缩文件
		const archivePath = await createArchive();
		
		// 6. 清理
		await cleanup();
		
		console.log("\n🎉 Packaging completed successfully!");
		console.log(`📦 Archive: ${path.basename(archivePath)}`);
		console.log(`📁 Location: ${config.distDir}`);
		console.log(`📊 Size: ${(await fs.stat(archivePath)).size / 1024} KB`);
		console.log("\n📋 Note: Only built files are included (no source code)");
		
	} catch (error) {
		console.error("\n❌ Packaging failed:", error);
		process.exit(1);
	}
}

// 运行主函数
main(); 