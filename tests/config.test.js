const { resolveActiveModes } = require("../src/config");
const { fallbackConfig } = require("../src/constants");

describe("Configuration Resolution", () => {
	const defaultEnv = { isTsProject: false, isDarkluaProject: false };

	it("should fallback to luau if no config exists and environment is standard", () => {
		const modes = resolveActiveModes({}, false, null, defaultEnv);
		expect(modes).toHaveLength(1);
		expect(modes[0].build).toBe(fallbackConfig.luau.build);
	});

	it("should auto-detect TypeScript and use ts defaults", () => {
		const tsEnv = { isTsProject: true, isDarkluaProject: false };
		const modes = resolveActiveModes({}, false, null, tsEnv);
		
		expect(modes).toHaveLength(1);
		expect(modes[0].build).toBe(fallbackConfig.ts.build);
	});

	it("should throw an error if a requested CLI mode does not exist", () => {
		const customConfig = { myCustomMode: { build: "dist", output: "custom.json" } };
		
		expect(() => {
			resolveActiveModes(customConfig, true, "nonExistentMode", defaultEnv);
		}).toThrow('Mode "nonExistentMode" is not defined in your config file.');
	});

	it("should successfully load a custom CLI mode", () => {
		const customConfig = { myCustomMode: { build: "dist", output: "custom.json" } };
		const modes = resolveActiveModes(customConfig, true, "myCustomMode", defaultEnv);
		
		expect(modes).toHaveLength(1);
		expect(modes[0].build).toBe("dist");
	});
});