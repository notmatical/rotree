const { parseCliArgs } = require("../src/cli");

describe("CLI Argument Parsing", () => {
	it("should parse full flags correctly", () => {
		const args = ["--mode", "ts", "--source", "my_src", "--watch"];
		const options = parseCliArgs(args);
		
		expect(options.mode).toBe("ts");
		expect(options.source).toBe("my_src");
		expect(options.watch).toBe(true);
	});

	it("should parse short aliases correctly", () => {
		const args = ["-m", "luau", "-s", "other_src", "-w"];
		const options = parseCliArgs(args);
		
		expect(options.mode).toBe("luau");
		expect(options.source).toBe("other_src");
		expect(options.watch).toBe(true);
	});

	it("should return undefined for omitted flags", () => {
		const args = ["--mode", "darklua"];
		const options = parseCliArgs(args);
		
		expect(options.mode).toBe("darklua");
		expect(options.watch).toBeUndefined();
	});
});