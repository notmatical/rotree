import { describe, expect, it } from "bun:test";
import { generateRoutingMaps } from "../src/constants.js";
import { resolveRoute } from "../src/core/route.js";
import type { RouteContext } from "../src/types.js";

describe("Router Logic", () => {
	const baseContext: RouteContext = {
		source: "src",
		build: "src",
		output: "test.project.json",
		name: "test-game",
		emitLegacyScripts: true,
		isTsProject: false,
		keepRouteNames: false,
		jsx: "client",
		routingMaps: generateRoutingMaps(),
	};

	it("should route to ServerScriptService based on suffix", () => {
		const result = resolveRoute(
			"systems/Combat.server.lua",
			false,
			baseContext,
		);

		expect(result.targetService).toBe("ServerScriptService");
		expect(result.nodeName).toBe("Combat");
		expect(result.wrapperFolder).toBe("server");
	});

	it("should route to StarterPlayerScripts based on PascalCase suffix", () => {
		const result = resolveRoute(
			"ui/InventoryStarterPlayerScripts.lua",
			false,
			baseContext,
		);

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
		const tsContext: RouteContext = {
			...baseContext,
			isTsProject: true,
			build: "out",
		};
		const result = resolveRoute("components/Button.ts", false, tsContext);

		expect(result.projectPath).toBe("out/components/Button.luau");
	});

	it("should handle init files correctly", () => {
		const result = resolveRoute("systems/Combat/init.lua", true, baseContext);

		expect(result.nodeName).toBe("Combat");
		expect(result.projectPath).toBe("src/systems/Combat");
	});

	it("should support custom config aliases for suffixes and overriding default mappings", () => {
		const customContext: RouteContext = {
			...baseContext,
			routingMaps: generateRoutingMaps({
				Controller: "StarterPlayerScripts",
				server: "ReplicatedStorage",
			}),
		};

		const result1 = resolveRoute(
			"ui/PlayerController.lua",
			false,
			customContext,
		);
		expect(result1.targetService).toBe("StarterPlayerScripts");
		// Role/custom aliases are descriptive and kept (not stripped).
		expect(result1.nodeName).toBe("PlayerController");
		expect(result1.wrapperFolder).toBe("client");

		const result2 = resolveRoute(
			"systems/Combat.server.lua",
			false,
			customContext,
		);
		expect(result2.targetService).toBe("ReplicatedStorage");
		expect(result2.nodeName).toBe("Combat");
	});

	it("should retain routing suffixes in nodeName when keepRouteNames is true, except for .server and .client", () => {
		const keepSuffixContext: RouteContext = {
			...baseContext,
			keepRouteNames: true,
		};

		const result1 = resolveRoute(
			"systems/Combat.server.lua",
			false,
			keepSuffixContext,
		);
		expect(result1.targetService).toBe("ServerScriptService");
		expect(result1.nodeName).toBe("Combat");
		expect(result1.wrapperFolder).toBe("server");

		const result2 = resolveRoute(
			"systems/Combat_server.lua",
			false,
			keepSuffixContext,
		);
		expect(result2.targetService).toBe("ServerScriptService");
		expect(result2.nodeName).toBe("Combat_server");

		const customContext: RouteContext = {
			...keepSuffixContext,
			routingMaps: generateRoutingMaps({ Controller: "StarterPlayerScripts" }),
		};
		const result3 = resolveRoute(
			"ui/PlayerController.lua",
			false,
			customContext,
		);
		expect(result3.targetService).toBe("StarterPlayerScripts");
		expect(result3.nodeName).toBe("PlayerController");
	});

	it("should route correctly based on separator prefix", () => {
		const result = resolveRoute(
			"systems/server.Combat.lua",
			false,
			baseContext,
		);

		expect(result.targetService).toBe("ServerScriptService");
		expect(result.nodeName).toBe("Combat");
		expect(result.wrapperFolder).toBe("server");
	});

	it("should route correctly based on pascalcase/no-separator prefix", () => {
		const result = resolveRoute("ui/ClientHud.ts", false, baseContext);

		expect(result.targetService).toBe("StarterPlayerScripts");
		expect(result.nodeName).toBe("Hud");
		expect(result.wrapperFolder).toBe("client");
	});

	it("should strip both prefix and separator from the node name", () => {
		const result = resolveRoute(
			"systems/server_Combat.lua",
			false,
			baseContext,
		);

		expect(result.targetService).toBe("ServerScriptService");
		expect(result.nodeName).toBe("Combat");
	});
});

describe("Marker File Routing", () => {
	const baseContext: RouteContext = {
		source: "src",
		build: "src",
		output: "test.project.json",
		name: "test-game",
		emitLegacyScripts: true,
		isTsProject: false,
		keepRouteNames: false,
		jsx: "client",
		routingMaps: generateRoutingMaps(),
		directoryMarkers: {},
	};

	it("should route based on a root marker file", () => {
		const context: RouteContext = {
			...baseContext,
			directoryMarkers: { "": "server" },
		};
		const result = resolveRoute("Combat.lua", false, context);

		expect(result.targetService).toBe("ServerScriptService");
		expect(result.wrapperFolder).toBe("server");
	});

	it("should route based on a directory marker file and preserve the folder name", () => {
		const context: RouteContext = {
			...baseContext,
			directoryMarkers: { AntiCheat: "server" },
		};
		const result = resolveRoute("AntiCheat/scanner.lua", false, context);

		expect(result.targetService).toBe("ServerScriptService");
		expect(result.virtualParts).toContain("AntiCheat");
	});

	it("should prioritize file suffix over a directory marker", () => {
		const context: RouteContext = {
			...baseContext,
			directoryMarkers: { network: "shared" },
		};
		const result = resolveRoute("network/api.server.lua", false, context);
		expect(result.targetService).toBe("ServerScriptService");
		expect(result.wrapperFolder).toBe("server");
	});

	it("should prioritize directory marker over a routing folder name and strip the folder name", () => {
		const context: RouteContext = {
			...baseContext,
			directoryMarkers: { client: "server" },
		};
		const result = resolveRoute("client/main.lua", false, context);

		expect(result.targetService).toBe("ServerScriptService");
		expect(result.virtualParts).not.toContain("client");
	});
});

describe("Routing (Last Is King)", () => {
	const baseContext: RouteContext = {
		source: "src",
		build: "src",
		output: "test.project.json",
		name: "test-game",
		emitLegacyScripts: true,
		isTsProject: false,
		keepRouteNames: false,
		jsx: "client",
		routingMaps: generateRoutingMaps(),
		directoryMarkers: {},
	};

	it("Deepest folder keyword wins over shallow folder keyword", () => {
		const context: RouteContext = { ...baseContext };
		const result = resolveRoute(
			"client/systems/server/main.lua",
			false,
			context,
		);

		expect(result.targetService).toBe("ServerScriptService");
	});

	it("Deep folder marker wins over shallow root marker", () => {
		const context: RouteContext = {
			...baseContext,
			directoryMarkers: { "": "client", systems: "server" },
		};
		const result = resolveRoute("systems/main.lua", false, context);

		expect(result.targetService).toBe("ServerScriptService");
	});

	it("Folder marker wins over folder keyword", () => {
		const context: RouteContext = {
			...baseContext,
			directoryMarkers: { client: "server" },
		};
		const result = resolveRoute("client/main.lua", false, context);

		expect(result.targetService).toBe("ServerScriptService");
	});

	it("File suffix wins over folder marker", () => {
		const context: RouteContext = {
			...baseContext,
			directoryMarkers: { network: "shared" },
		};
		const result = resolveRoute("network/api.server.lua", false, context);

		expect(result.targetService).toBe("ServerScriptService");
		expect(result.wrapperFolder).toBe("server");
	});

	it("File suffix wins over folder keyword", () => {
		const context: RouteContext = { ...baseContext };
		const result = resolveRoute("client/ui/button.server.lua", false, context);

		expect(result.targetService).toBe("ServerScriptService");
		expect(result.wrapperFolder).toBe("server");
	});

	it("File prefix wins over root marker", () => {
		const context: RouteContext = {
			...baseContext,
			directoryMarkers: { "": "client" },
		};
		const result = resolveRoute("server.combat.lua", false, context);

		expect(result.targetService).toBe("ServerScriptService");
		expect(result.wrapperFolder).toBe("server");
	});

	it("Deepest keyword wins, all keywords are stripped, no virtual parts left", () => {
		const context: RouteContext = { ...baseContext };
		const result = resolveRoute(
			"server/client/shared/test.lua",
			false,
			context,
		);

		expect(result.targetService).toBe("ReplicatedStorage");
		expect(result.wrapperFolder).toBe("shared");
		expect(result.virtualParts).toEqual([]);
		expect(result.nodeName).toBe("test");
	});

	it("Deepest keyword wins, standard folders in between are preserved", () => {
		const context: RouteContext = { ...baseContext };
		const result = resolveRoute(
			"server/inventory/shared/test.lua",
			false,
			context,
		);

		expect(result.targetService).toBe("ReplicatedStorage");
		expect(result.wrapperFolder).toBe("shared");
		expect(result.virtualParts).toEqual(["inventory"]);
		expect(result.nodeName).toBe("test");
	});
});

describe("Wrapper Flattening", () => {
	const baseContext: RouteContext = {
		source: "src",
		build: "src",
		output: "test.project.json",
		name: "test-game",
		emitLegacyScripts: true,
		isTsProject: false,
		keepRouteNames: false,
		jsx: "client",
		routingMaps: generateRoutingMaps(),
		directoryMarkers: {},
	};

	it("shared/default code drops to the ReplicatedStorage root (no wrapper)", () => {
		const result = resolveRoute("utils/math.lua", false, baseContext);

		expect(result.targetService).toBe("ReplicatedStorage");
		expect(result.wrapperFolder).toBe("shared");
		expect(result.useWrapper).toBe(false);
	});

	it("server code drops to the ServerScriptService root (no wrapper)", () => {
		const result = resolveRoute(
			"systems/combat.server.lua",
			false,
			baseContext,
		);

		expect(result.targetService).toBe("ServerScriptService");
		expect(result.useWrapper).toBe(false);
	});

	it("client code redirected into ReplicatedStorage keeps its wrapper", () => {
		const context: RouteContext = { ...baseContext, emitLegacyScripts: false };
		const result = resolveRoute("ui/hud.client.lua", false, context);

		// emitLegacyScripts:false moves client scripts into ReplicatedStorage, where the
		// "client" wrapper prevents collisions with shared modules.
		expect(result.targetService).toBe("ReplicatedStorage");
		expect(result.wrapperFolder).toBe("client");
		expect(result.useWrapper).toBe(true);
	});
});

describe("Role Convention", () => {
	const baseContext: RouteContext = {
		source: "src",
		build: "out",
		output: "test.project.json",
		name: "test-game",
		emitLegacyScripts: true,
		isTsProject: true,
		keepRouteNames: false,
		jsx: "client",
		routingMaps: generateRoutingMaps(),
		directoryMarkers: {},
	};

	it("routes .service to the server, keeping the descriptive name", () => {
		const result = resolveRoute(
			"modules/player/player.service.ts",
			false,
			baseContext,
		);
		expect(result.targetService).toBe("ServerScriptService");
		expect(result.nodeName).toBe("player.service");
	});

	it("routes .controller to the client, keeping the name", () => {
		const result = resolveRoute(
			"modules/input/input.controller.ts",
			false,
			baseContext,
		);
		expect(result.targetService).toBe("StarterPlayerScripts");
		expect(result.nodeName).toBe("input.controller");
	});

	it("routes .component to the client", () => {
		const result = resolveRoute("ui/button.component.tsx", false, baseContext);
		expect(result.targetService).toBe("StarterPlayerScripts");
		expect(result.nodeName).toBe("button.component");
	});

	it("defaults an unrouted .tsx file to the client (jsx)", () => {
		const result = resolveRoute("ui/app.tsx", false, baseContext);
		expect(result.targetService).toBe("StarterPlayerScripts");
		expect(result.nodeName).toBe("app");
	});

	it("lets an explicit signal override the jsx default", () => {
		const result = resolveRoute("shared/widget.tsx", false, baseContext);
		expect(result.targetService).toBe("ReplicatedStorage");
	});

	it("keeps role suffixes but strips the .server entry suffix", () => {
		const role = resolveRoute("modules/x/thing.service.ts", false, baseContext);
		expect(role.nodeName).toBe("thing.service");

		const entry = resolveRoute("main.server.ts", false, baseContext);
		expect(entry.nodeName).toBe("main");
	});

	it("sends realm-neutral roles to shared by default", () => {
		const result = resolveRoute("modules/x/game.const.ts", false, baseContext);
		expect(result.targetService).toBe("ReplicatedStorage");
		expect(result.nodeName).toBe("game.const");
	});

	it("honors jsx set to shared", () => {
		const context: RouteContext = { ...baseContext, jsx: "shared" };
		const result = resolveRoute("ui/app.tsx", false, context);
		expect(result.targetService).toBe("ReplicatedStorage");
	});
});
