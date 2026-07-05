export interface CliArgs {
	help?: boolean;
	init?: boolean;
	config?: string;
	mode?: string;
	source?: string[];
	template?: string;
	output?: string;
	build?: string;
	watch?: boolean;
	keepRouteNames?: boolean;
	jsx?: string;
}

export interface RotreeMode {
	output: string;
	build: string;
}

export interface RotreeConfig {
	source?: string | string[];
	keepRouteNames?: boolean;
	/** Realm that unrouted `.tsx`/`.jsx` files default to. Defaults to "client". */
	jsx?: string;
	aliases?: Record<string, string>;
	luau?: RotreeMode;
	ts?: RotreeMode;
	darklua?: RotreeMode;
	template?: unknown;
	[key: string]: unknown;
}

export interface Environment {
	isTsProject: boolean;
	isDarkluaProject: boolean;
}

export interface RoutingMaps {
	mergedServices: Record<string, string>;
	lowerCaseMap: Record<string, string>;
	separatorSuffixRegex: RegExp;
	pascalCaseSuffixRegex: RegExp;
	prefixRegex: RegExp;
}

export interface RouteContext extends RotreeMode {
	source: string | string[];
	isTsProject: boolean;
	emitLegacyScripts: boolean;
	name: string;
	routingMaps: RoutingMaps;
	keepRouteNames: boolean;
	jsx: string;
	directoryMarkers?: Record<string, string>;
}

export interface RojoNode {
	$className?: string;
	$path?: string;
	[key: string]: unknown;
}

export interface RojoTree {
	name?: string;
	emitLegacyScripts?: boolean;
	tree: RojoNode;
}

export interface MissingPath {
	parent: RojoNode;
	key: string;
	path: string;
	absolutePath: string;
}

export interface BuildResult {
	output: string;
	tree: RojoTree;
	missingPaths: MissingPath[];
	name: string;
	buildDir: string;
	fileCount: number;
}
