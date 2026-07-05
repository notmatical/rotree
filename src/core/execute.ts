import fs from "node:fs";
import path from "node:path";
import type {
	CliArgs,
	Environment,
	RojoTree,
	RotreeConfig,
	RotreeMode,
} from "../types.js";
import { build } from "./build.js";

export function execute(
	sourcePaths: string[],
	env: Environment,
	activeModes: RotreeMode[],
	baseProjectTree: RojoTree,
	config: RotreeConfig,
	cliArgs: CliArgs,
): void {
	for (const targetConfig of activeModes) {
		const buildResult = build(
			targetConfig,
			baseProjectTree,
			config,
			env,
			sourcePaths,
			cliArgs,
		);

		// Add stub files so Rojo and the roblox-ts compiler don't crash
		if (buildResult.missingPaths.length > 0) {
			for (const item of buildResult.missingPaths) {
				const ext = path.extname(item.absolutePath).toLowerCase();
				if (ext === ".luau" || ext === ".lua") {
					const dir = path.dirname(item.absolutePath);
					if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
					fs.writeFileSync(item.absolutePath, "");
				} else {
					delete item.parent[item.key];
				}
			}
		}

		const finalContent = JSON.stringify(buildResult.tree, null, 2);
		let shouldWrite = true;

		if (fs.existsSync(buildResult.output)) {
			const existingContent = fs.readFileSync(buildResult.output, "utf-8");
			if (existingContent === finalContent) shouldWrite = false;
		}

		if (shouldWrite) {
			fs.writeFileSync(buildResult.output, finalContent);
			console.log(`\nSuccess! Generated Rojo tree for "${buildResult.name}"`);
			console.log(`   Build:     ${buildResult.buildDir}`);
			console.log(`   Processed: ${buildResult.fileCount} source files`);
			console.log(`   Output:    ${buildResult.output}\n`);
		}
	}
}
