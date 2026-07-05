import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import fs from "node:fs";
import { build } from "../src/core/build.js";
import type {
	CliArgs,
	Environment,
	RojoTree,
	RotreeConfig,
	RotreeMode,
} from "../src/types.js";

// Virtual filesystem: given a flat list of paths under the source root(s), return
// the immediate children for any directory the builder walks into.
function mockTree(files: string[]): void {
	spyOn(fs, "existsSync").mockReturnValue(true);
	spyOn(fs, "readdirSync").mockImplementation(((dir: string) => {
		const d = String(dir).replace(/\\/g, "/").replace(/\/+$/, "");
		const children = new Map<string, boolean>(); // name -> isDirectory
		for (const f of files) {
			if (!f.startsWith(`${d}/`)) continue;
			const rest = f.slice(d.length + 1);
			const slash = rest.indexOf("/");
			if (slash === -1) children.set(rest, false);
			else children.set(rest.slice(0, slash), true);
		}
		return [...children].map(([name, isDir]) => ({
			name,
			isDirectory: () => isDir,
			isFile: () => !isDir,
		})) as fs.Dirent[];
	}) as any);
}

// Routing is identical across languages — only the build directory and the output
// extension (`.ts`/`.tsx` -> `.luau`) differ. Every integration case runs in both.
const MODES = [
	{ label: "luau", isTsProject: false, build: "build", ext: "lua", out: "lua" },
	{ label: "ts", isTsProject: true, build: "out", ext: "ts", out: "luau" },
] as const;

const baseTree: RojoTree = { name: "test-game", tree: {} };
const cliArgs: CliArgs = {};

for (const mode of MODES) {
	describe(`Builder Integration (${mode.label})`, () => {
		beforeEach(() => {
			mock.restore();
		});

		const targetConfig: RotreeMode = {
			build: mode.build,
			output: "test.project.json",
		};
		const config: RotreeConfig = { source: "src" };
		const env: Environment = {
			isTsProject: mode.isTsProject,
			isDarkluaProject: false,
		};

		it("routes every realm, flattens shared, ignores non-source files", () => {
			mockTree([
				`src/systems/combat.server.${mode.ext}`,
				`src/ui/hud.client.${mode.ext}`,
				`src/data.${mode.ext}`, // no suffix -> shared (default)
				`src/models/rock.rbxm`, // model asset -> never extension-swapped
				`src/notes.txt`, // not a source file -> ignored
			]);

			const result = build(
				targetConfig,
				baseTree,
				config,
				env,
				["src"],
				cliArgs,
			);
			const tree = result.tree.tree as any;

			expect(result.fileCount).toBe(4); // txt excluded

			// server -> ServerScriptService root, suffix stripped, no wrapper
			expect(tree.ServerScriptService.systems.combat.$path).toBe(
				`${mode.build}/systems/combat.server.${mode.out}`,
			);
			// client -> StarterPlayerScripts root, no wrapper
			expect(tree.StarterPlayer.StarterPlayerScripts.ui.hud.$path).toBe(
				`${mode.build}/ui/hud.client.${mode.out}`,
			);
			// shared/default -> ReplicatedStorage root, NO "shared" wrapper
			expect(tree.ReplicatedStorage.data.$path).toBe(
				`${mode.build}/data.${mode.out}`,
			);
			expect(tree.ReplicatedStorage.shared).toBeUndefined();
			// model assets keep their own extension
			expect(tree.ReplicatedStorage.models.rock.$path).toBe(
				`${mode.build}/models/rock.rbxm`,
			);
		});

		it("merges multiple source directories into shared containers", () => {
			mockTree([`src/core/math.${mode.ext}`, `src/chapter1/level.${mode.ext}`]);

			const result = build(
				targetConfig,
				baseTree,
				{ source: ["src/core", "src/chapter1"] },
				env,
				["src/core", "src/chapter1"],
				cliArgs,
			);
			const tree = result.tree.tree as any;

			expect(result.fileCount).toBe(2);
			// sub-path is appended to the build dir for multi-place support
			expect(tree.ReplicatedStorage.math.$path).toBe(
				`${mode.build}/core/math.${mode.out}`,
			);
			expect(tree.ReplicatedStorage.level.$path).toBe(
				`${mode.build}/chapter1/level.${mode.out}`,
			);
		});

		it("routes a folder by its marker file and preserves the folder name", () => {
			mockTree([`src/database/.server`, `src/database/query.${mode.ext}`]);

			const result = build(
				targetConfig,
				baseTree,
				config,
				env,
				["src"],
				cliArgs,
			);
			const tree = result.tree.tree as any;

			expect(result.fileCount).toBe(1); // the .server marker isn't a source file
			expect(tree.ServerScriptService.database.query.$path).toBe(
				`${mode.build}/database/query.${mode.out}`,
			);
		});
	});
}

// Genuinely TypeScript-only concerns that have no Luau equivalent.
describe("Builder Integration (TypeScript-only)", () => {
	beforeEach(() => {
		mock.restore();
	});

	const targetConfig: RotreeMode = {
		build: "out",
		output: "test.project.json",
	};
	const config: RotreeConfig = { source: "src" };
	const env: Environment = { isTsProject: true, isDarkluaProject: false };

	it("swaps .tsx to .luau and ignores .d.ts declarations", () => {
		mockTree([
			`src/ui/app.client.tsx`, // .tsx -> .luau
			`src/types/schema.d.ts`, // declaration -> ignored
		]);

		const result = build(targetConfig, baseTree, config, env, ["src"], cliArgs);
		const tree = result.tree.tree as any;

		expect(result.fileCount).toBe(1); // .d.ts excluded
		expect(tree.StarterPlayer.StarterPlayerScripts.ui.app.$path).toBe(
			"out/ui/app.client.luau",
		);
		expect(tree.ReplicatedStorage?.types).toBeUndefined();
	});
});
