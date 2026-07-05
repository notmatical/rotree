import fs from "node:fs";
import path from "node:path";
import chokidar from "chokidar";
import { parseCliArgs, printHelp } from "./cli.js";
import {
	getEnvironment,
	loadAndValidateConfig,
	loadProjectTree,
	resolveActiveModes,
	resolveConfigPath,
} from "./config.js";
import { defaultConfig } from "./constants.js";
import { execute } from "./core/execute.js";
import { formatError } from "./util.js";

async function main(): Promise<void> {
	const cliArgs = parseCliArgs();

	if (cliArgs.help) {
		printHelp();
		process.exit(0);
	}

	if (cliArgs.init) {
		const targetPath = path.resolve(process.cwd(), ".rotree.json");

		if (fs.existsSync(targetPath)) {
			console.error(
				`\nA .rotree.json file already exists in this directory.\n`,
			);
			process.exit(1);
		}

		fs.writeFileSync(targetPath, JSON.stringify(defaultConfig, null, "\t"));
		console.log(`\nSuccess! Created .rotree.json in the current directory.\n`);
		process.exit(0);
	}

	const configPath = resolveConfigPath(cliArgs.config);
	const { config, hasConfig } = loadAndValidateConfig(configPath);

	const rawSources = cliArgs.source || config.source || ["src"];
	const sourceDirs = Array.isArray(rawSources) ? rawSources : [rawSources];

	const sourcePaths = sourceDirs.map((s) => {
		const sourcePath = path.resolve(process.cwd(), s);
		if (!fs.existsSync(sourcePath)) {
			throw new Error(`Source directory not found: ${sourcePath}`);
		}
		return sourcePath;
	});

	const env = getEnvironment();
	const activeModes = resolveActiveModes(config, hasConfig, cliArgs.mode, env);
	const baseProjectTree = loadProjectTree(cliArgs.template, config.template);

	execute(sourcePaths, env, activeModes, baseProjectTree, config, cliArgs);

	if (cliArgs.watch) {
		console.log(
			`Rotree watching for file changes in: "${sourceDirs.join(", ")}"... (Press Ctrl+C to stop)`,
		);
		let debounceTimeout: NodeJS.Timeout;

		const watcher = chokidar.watch(sourcePaths, {
			persistent: true,
			ignoreInitial: true,
			ignored: /(^|\/|\\)\../,
		});

		watcher.on("all", () => {
			clearTimeout(debounceTimeout);
			debounceTimeout = setTimeout(() => {
				// Keep the watcher alive across failed rebuilds; report and wait for the next change.
				try {
					execute(
						sourcePaths,
						env,
						activeModes,
						baseProjectTree,
						config,
						cliArgs,
					);
				} catch (error) {
					console.error(`\nBuild Failed: ${formatError(error)}\n`);
				}
			}, 100);
		});

		watcher.on("error", (error) => console.error(`Error in watcher: ${error}`));

		await new Promise(() => {}); // Keep alive
	}
}

export default function run(): void {
	main().catch((error) => {
		console.error(`\nBuild Failed: ${formatError(error)}\n`);
		process.exit(1);
	});
}
