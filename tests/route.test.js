const { resolveRoute } = require("../src/core/route");

describe("Router Logic", () => {
    const baseContext = {
        emitLegacyScripts: true,
        isTsProject: false,
        build: "src"
    };

    it("should route to ServerScriptService based on suffix", () => {
        const result = resolveRoute("systems/Combat.server.lua", false, baseContext);
        
        expect(result.targetService).toBe("ServerScriptService");
        expect(result.nodeName).toBe("Combat");
        expect(result.wrapperFolder).toBe("server");
    });

    it("should route to StarterPlayerScripts based on PascalCase suffix", () => {
        const result = resolveRoute("ui/InventoryStarterPlayerScripts.lua", false, baseContext);
        
        expect(result.targetService).toBe("StarterPlayerScripts");
        expect(result.nodeName).toBe("Inventory");
        expect(result.wrapperFolder).toBe("client");
    });

    it("should route to ReplicatedStorage if no explicit suffix or folder is found", () => {
        const result = resolveRoute("utils/Math.lua", false, baseContext);
        
        expect(result.targetService).toBe("ReplicatedStorage");
        expect(result.nodeName).toBe("Math");
        expect(result.wrapperFolder).toBe("shared");
    });

    it("should swap extensions to .luau for TypeScript projects", () => {
        const tsContext = { ...baseContext, isTsProject: true, build: "out" };
        const result = resolveRoute("components/Button.ts", false, tsContext);
        
        expect(result.projectPath).toBe("out/components/Button.luau");
    });

    it("should handle init files correctly", () => {
        const result = resolveRoute("systems/Combat/init.lua", true, baseContext);
        
        expect(result.nodeName).toBe("Combat");
        expect(result.projectPath).toBe("src/systems/Combat");
    });
});