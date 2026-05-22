const fs = require("fs");
const { getOrCreateNode, sortObject, pruneObject } = require("../src/core/tree");

jest.mock("fs");

describe("Tree Utilities", () => {
	describe("getOrCreateNode", () => {
		it("should create a node with a className if it does not exist", () => {
			const parent = {};
			const result = getOrCreateNode(parent, "MyFolder", "Folder");
			expect(parent.MyFolder).toBeDefined();
			expect(result.$className).toBe("Folder");
		});

		it("should return the existing node if it already exists", () => {
			const parent = { MyFolder: { $path: "src/MyFolder" } };
			const result = getOrCreateNode(parent, "MyFolder", "Folder");
			expect(result).toEqual({ $path: "src/MyFolder" });
		});
	});

	describe("sortObject", () => {
		it("should recursively sort object keys alphabetically", () => {
			const unsorted = {
				Zebra: { B: 1, A: 2 },
				Apple: { D: 4, C: 3 }
			};
			
			const sorted = sortObject(unsorted);
			
			// Check top-level keys
			expect(Object.keys(sorted)).toEqual(["Apple", "Zebra"]);
			// Check nested keys
			expect(Object.keys(sorted.Apple)).toEqual(["C", "D"]);
			expect(Object.keys(sorted.Zebra)).toEqual(["A", "B"]);
		});
	});

	describe("pruneObject", () => {
		it("should remove nodes with invalid paths outside the build directory", () => {
			const buildDir = "out";
			const tree = {
				ValidInBuild: { $path: "out/valid" },
				ValidExternal: { $path: "node_modules/@rbxts" },
				InvalidExternal: { $path: "missing_folder/file" }
			};

			// Tell the mock FS that only "node_modules/@rbxts" exists on disk
			fs.existsSync.mockImplementation((pathStr) => pathStr.includes("@rbxts"));

			const pruned = pruneObject(tree, buildDir);

			expect(pruned.ValidInBuild).toBeDefined(); // Kept because it starts with buildDir
			expect(pruned.ValidExternal).toBeDefined(); // Kept because existsSync returned true
			expect(pruned.InvalidExternal).toBeUndefined(); // Pruned because it doesn't exist
		});
	});
});