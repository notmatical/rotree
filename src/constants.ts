import type { RotreeConfig, RoutingMaps } from "./types.js";

// Config keys that are settings, not build modes. Any other object key is treated as a mode.
export const RESERVED_CONFIG_KEYS = [
	"source",
	"template",
	"aliases",
	"keepRouteNames",
] as const;

// Built-in build modes shipped with Rotree.
export const BUILTIN_MODES = ["luau", "ts", "darklua"] as const;

export const defaultConfig: RotreeConfig = {
	source: ["src"],
	keepRouteNames: false,
	aliases: {},
	luau: {
		output: "default.project.json",
		build: "src",
	},
	ts: {
		output: "default.project.json",
		build: "out",
	},
	darklua: {
		output: "build.project.json",
		build: "dist",
	},
	template: {
		name: "roblox-project",
		globIgnorePaths: ["**/package.json", "**/tsconfig.json"],
		tree: {
			$className: "DataModel",
			ServerScriptService: {
				ServerPackages: {
					$path: "ServerPackages",
				},
			},
			ReplicatedStorage: {
				rbxts_include: {
					$path: "include",
					node_modules: {
						$className: "Folder",
						"@rbxts": {
							$path: "node_modules/@rbxts",
						},
					},
				},
				Packages: {
					$path: "Packages",
				},
			},
		},
	},
};

export const services: Record<string, string> = {
	Server: "ServerScriptService",
	Client: "StarterPlayerScripts",
	Shared: "ReplicatedStorage",
	ServerScriptService: "ServerScriptService",
	ReplicatedStorage: "ReplicatedStorage",
	ReplicatedFirst: "ReplicatedFirst",
	ServerStorage: "ServerStorage",
	StarterGui: "StarterGui",
	StarterPack: "StarterPack",
	StarterPlayerScripts: "StarterPlayerScripts",
	StarterCharacterScripts: "StarterCharacterScripts",
	// Role aliases — descriptive suffixes that imply a realm. These are KEPT in the
	// node name (see strippedKeywords), so `player.service` stays `player.service`
	// and roblox-ts imports resolve.
	Service: "ServerScriptService",
	Controller: "StarterPlayerScripts",
	Component: "StarterPlayerScripts",
};

// Structural realm/service keywords are stripped from node names (e.g. `main.server`
// -> `main`). Role aliases and any custom aliases are descriptive and are kept as-is.
export const strippedKeywords = new Set<string>([
	"server",
	"client",
	"shared",
	"serverscriptservice",
	"replicatedstorage",
	"replicatedfirst",
	"serverstorage",
	"startergui",
	"starterpack",
	"starterplayerscripts",
	"startercharacterscripts",
]);

export const serviceParents: Record<string, string> = {
	StarterPlayerScripts: "StarterPlayer",
	StarterCharacterScripts: "StarterPlayer",
};

export const serverContainers = new Set<string>([
	"ServerScriptService",
	"ServerStorage",
]);

export const clientContainers = new Set<string>([
	"StarterPlayer",
	"StarterPlayerScripts",
	"StarterCharacterScripts",
	"StarterGui",
	"StarterPack",
	"ReplicatedFirst",
]);

export const serviceAliases = new Set<string>(["server", "client", "shared"]);

export function generateRoutingMaps(
	customAliases: Record<string, string> = {},
): RoutingMaps {
	const mergedServices = { ...services, ...customAliases };
	const lowerCaseMap = Object.fromEntries(
		Object.entries(mergedServices).map(([k, v]) => [k.toLowerCase(), v]),
	);

	const mergedKeys = Object.keys(mergedServices).sort(
		(a, b) => b.length - a.length,
	);
	const lowerKeys = Object.keys(lowerCaseMap).sort(
		(a, b) => b.length - a.length,
	);

	const separatorSuffixRegex = new RegExp(
		`[\\.\\-_](${lowerKeys.join("|")})$`,
		"i",
	);
	const pascalCaseSuffixRegex = new RegExp(`(${mergedKeys.join("|")})$`);
	const prefixRegex = new RegExp(`^(${lowerKeys.join("|")})([\\.\\-_]?)`, "i");

	return {
		mergedServices,
		lowerCaseMap,
		separatorSuffixRegex,
		pascalCaseSuffixRegex,
		prefixRegex,
	};
}
