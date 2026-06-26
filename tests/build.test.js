const fs = require("fs");
const { build } = require("../src/core/build");

jest.mock("fs");

describe("Builder Integration", () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it("should successfully build a tree and ignore non-Roblox files", () => {
		fs.existsSync.mockReturnValue(true);

		fs.readdirSync.mockImplementation((dir) => {
			const normalizedDir = dir.replace(/\\/g, "/");
			
			// Root source directory
			if (normalizedDir.endsWith("src")) {
				return [
					{ name: "systems", isDirectory: () => true, isFile: () => false },
					{ name: "ui", isDirectory: () => true, isFile: () => false },
					{ name: "ignoreMe.txt", isDirectory: () => false, isFile: () => true }, // Should be skipped
					{ name: "Weapon.rbxm", isDirectory: () => false, isFile: () => true }   // Should be processed
				];
			}
			
			// Nested server systems folder
			if (normalizedDir.endsWith("systems")) {
				return [
					{ name: "Combat.server.lua", isDirectory: () => false, isFile: () => true }
				];
			}

			// Nested UI folder with an init file
			if (normalizedDir.endsWith("ui")) {
				return [
					{ name: "init.lua", isDirectory: () => false, isFile: () => true },
					{ name: "Button.lua", isDirectory: () => false, isFile: () => true } // Should be skipped because init.lua claims the folder!
				];
			}

			return [];
		});

		// Setup mock env
		const targetConfig = { build: "out", output: "test.project.json" };
		const baseTree = { name: "test-game", tree: {} };
		const config = { source: "src" };
		const env = { isTsProject: false };
		const cliArgs = {};

		// Execute the build
		const result = build(targetConfig, baseTree, config, env, ["src"], cliArgs);

		expect(result.fileCount).toBe(3); 
		
		expect(result.name).toBe("test-game");
		expect(result.buildDir).toBe("out");
		expect(result.output).toBe("test.project.json");

		// Combat.server.lua should land in ServerScriptService.server.systems.Combat
		expect(result.tree.tree.ServerScriptService.server.systems.Combat).toBeDefined();
		expect(result.tree.tree.ServerScriptService.server.systems.Combat.$path).toBe("out/systems/Combat.server.lua");

		// Weapon.rbxm should land in ReplicatedStorage.shared.Weapon
		expect(result.tree.tree.ReplicatedStorage.shared.Weapon).toBeDefined();
		expect(result.tree.tree.ReplicatedStorage.shared.Weapon.$path).toBe("out/Weapon.rbxm");

		// ui/init.lua should claim the entire folder under ReplicatedStorage.shared.ui
		expect(result.tree.tree.ReplicatedStorage.shared.ui).toBeDefined();
		expect(result.tree.tree.ReplicatedStorage.shared.ui.$path).toBe("out/ui");
	});

	it("should successfully merge files from multiple source directories into single containers", () => {
		fs.existsSync.mockReturnValue(true);

		fs.readdirSync.mockImplementation((dir) => {
			const normalizedDir = dir.replace(/\\/g, "/");
			
			if (normalizedDir.endsWith("src/core")) {
				return [{ name: "CoreMath.lua", isDirectory: () => false, isFile: () => true }];
			}
			
			if (normalizedDir.endsWith("src/chapter1")) {
				return [{ name: "LevelData.lua", isDirectory: () => false, isFile: () => true }];
			}

			return [];
		});

		const targetConfig = { build: "out", output: "test.project.json" };
		const baseTree = { name: "test-game", tree: {} };
		const config = { source: ["src/core", "src/chapter1"] };
		const env = { isTsProject: false };
		const cliArgs = {};

		const result = build(targetConfig, baseTree, config, env, ["src/core", "src/chapter1"], cliArgs);

		expect(result.fileCount).toBe(2); 

		// Both files should be merged into ReplicatedStorage.shared
		expect(result.tree.tree.ReplicatedStorage.shared.CoreMath).toBeDefined();
		expect(result.tree.tree.ReplicatedStorage.shared.LevelData).toBeDefined();
		
		// Paths should correctly map relative to their respective base folders
		expect(result.tree.tree.ReplicatedStorage.shared.CoreMath.$path).toBe("out/core/CoreMath.lua");
		expect(result.tree.tree.ReplicatedStorage.shared.LevelData.$path).toBe("out/chapter1/LevelData.lua");
	});

	it("should route files based on marker files instead of folder names", () => {
		fs.existsSync.mockReturnValue(true);

		fs.readdirSync.mockImplementation((dir) => {
			const normalizedDir = dir.replace(/\\/g, "/");
			
			if (normalizedDir.endsWith("src")) {
				return [
					{ name: "Database", isDirectory: () => true, isFile: () => false },
				];
			}
			
			if (normalizedDir.endsWith("Database")) {
				return [
					{ name: ".server", isDirectory: () => false, isFile: () => true },
					{ name: "query.lua", isDirectory: () => false, isFile: () => true }
				];
			}

			return [];
		});

		const targetConfig = { build: "out", output: "test.project.json" };
		const baseTree = { name: "test-game", tree: {} };
		const config = { source: "src" };
		const env = { isTsProject: false };
		const cliArgs = {};

		const result = build(targetConfig, baseTree, config, env, ["src"], cliArgs);

		expect(result.fileCount).toBe(1); // query.lua (marker file is skipped in count)
		
		// The Database folder should route to ServerScriptService because of the .server file.
		// Additionally, "Database" should be kept as a folder because it was mapped by a marker.
		expect(result.tree.tree.ServerScriptService.server.Database.query).toBeDefined();
		expect(result.tree.tree.ServerScriptService.server.Database.query.$path).toBe("out/Database/query.lua");
	});
});