import path from "node:path";
import {
	clientContainers,
	serverContainers,
	serviceAliases,
	strippedKeywords,
} from "../constants.js";
import type { RouteContext } from "../types.js";
import { toPosix } from "./tree.js";

export interface RouteResolution {
	targetService: string;
	wrapperFolder: string;
	useWrapper: boolean;
	virtualParts: string[];
	nodeName: string;
	projectPath: string;
}

export function resolveRoute(
	relativePath: string,
	isInit: boolean,
	context: RouteContext,
): RouteResolution {
	const {
		emitLegacyScripts,
		isTsProject,
		build,
		routingMaps,
		keepRouteNames,
		jsx,
		directoryMarkers,
	} = context;
	const {
		mergedServices,
		lowerCaseMap,
		separatorSuffixRegex,
		pascalCaseSuffixRegex,
		prefixRegex,
	} = routingMaps;

	const parts = relativePath.split(/[\\/]/);
	const filename = parts.pop()!;
	const basename = path.basename(filename, path.extname(filename));
	const virtualParts: string[] = [];

	let targetService = "ReplicatedStorage";
	let lastRouteKeyword: string | null = null;
	let environment: string | null = null;
	let routed = false; // did any explicit signal (folder/marker/affix) fire?

	// Marker routing
	if (directoryMarkers?.[""]) {
		const rootMarker = directoryMarkers[""];
		targetService = lowerCaseMap[rootMarker];
		lastRouteKeyword = rootMarker;
		routed = true;
		if (serviceAliases.has(rootMarker)) environment = rootMarker;
	}

	// Folder routing
	let currentPath = "";
	for (const part of parts) {
		currentPath = currentPath ? `${currentPath}/${part}` : part;

		const lowerPart = part.toLowerCase();
		const matchedService = lowerCaseMap[lowerPart];
		const marker = directoryMarkers ? directoryMarkers[currentPath] : undefined;

		if (marker) {
			targetService = lowerCaseMap[marker];
			lastRouteKeyword = marker;
			routed = true;
			if (serviceAliases.has(marker)) environment = marker;

			// Strip if the folder name is also a routing keyword
			if (!matchedService) {
				virtualParts.push(part);
			}
		} else if (matchedService) {
			targetService = matchedService;
			lastRouteKeyword = lowerPart;
			routed = true;
			if (serviceAliases.has(lowerPart)) environment = lowerPart;
		} else {
			virtualParts.push(part);
		}
	}

	let matchedLength = 0;
	let matchedKeyword = "";
	let mappedService: string | null = null;
	let isPrefix = false;

	const sepSuffixMatch = basename.match(separatorSuffixRegex);
	const pascalSuffixMatch = basename.match(pascalCaseSuffixRegex);
	const prefixMatch = basename.match(prefixRegex);

	// Affix routing
	if (sepSuffixMatch) {
		const suffix = sepSuffixMatch[1].toLowerCase();
		matchedKeyword = suffix;
		mappedService = lowerCaseMap[suffix];
		matchedLength = sepSuffixMatch[0].length;
		if (!isInit && serviceAliases.has(suffix)) {
			environment = suffix;
		}
	} else if (pascalSuffixMatch) {
		const suffix = pascalSuffixMatch[1].toLowerCase();
		matchedKeyword = suffix;
		mappedService = mergedServices[pascalSuffixMatch[1]];
		matchedLength = pascalSuffixMatch[0].length;
		if (!isInit && serviceAliases.has(suffix)) {
			environment = suffix;
		}
	} else if (prefixMatch) {
		const prefix = prefixMatch[1].toLowerCase();
		matchedKeyword = prefix;
		mappedService = lowerCaseMap[prefix];
		matchedLength = prefixMatch[0].length;
		if (!isInit && serviceAliases.has(prefix)) {
			environment = prefix;
		}
		isPrefix = true;
	}

	if (mappedService) {
		targetService = mappedService;
		routed = true;
	}

	// jsx default: an unrouted .tsx/.jsx file falls to the configured realm (client).
	if (!routed && /\.(tsx|jsx)$/i.test(filename)) {
		const jsxService = lowerCaseMap[jsx.toLowerCase()];
		if (jsxService) {
			targetService = jsxService;
			routed = true;
		}
	}

	// Resolve namespace wrapper folder
	let wrapperFolder = "shared";
	if (serverContainers.has(targetService)) wrapperFolder = "server";
	else if (clientContainers.has(targetService)) wrapperFolder = "client";
	else if (environment) wrapperFolder = environment;

	// Scripts with non-legacy RunContext run incorrectly in StarterPlayer container
	const isStarterPlayerContainer =
		targetService === "StarterPlayerScripts" ||
		targetService === "StarterCharacterScripts";
	if (emitLegacyScripts === false && isStarterPlayerContainer) {
		targetService = "ReplicatedStorage";
	}

	// Shared/default code drops straight to the service root — no redundant wrapper.
	// A wrapper is only kept when non-shared code is redirected into a shared service
	// (e.g. emitLegacyScripts:false moves client scripts into ReplicatedStorage, where a
	// "client" wrapper keeps them from colliding with shared modules). Dedicated
	// single-environment services never wrap. Computed after the redirect above.
	const useWrapper =
		wrapperFolder !== "shared" &&
		!(
			serverContainers.has(targetService) || clientContainers.has(targetService)
		);

	let nodeName = basename;
	let projectPath: string;

	if (isInit) {
		const folderRelativePath = path.dirname(relativePath);
		projectPath = toPosix(path.join(build, folderRelativePath));
		if (virtualParts.length > 0) nodeName = virtualParts.pop()!;
		else nodeName = lastRouteKeyword ? lastRouteKeyword : "source";
	} else {
		let compiledRelativePath = relativePath;
		if (isTsProject) {
			const compiledFilename = filename.replace(/\.tsx?$/i, ".luau");
			compiledRelativePath = path.join(
				path.dirname(relativePath),
				compiledFilename,
			);
		}
		projectPath = toPosix(path.join(build, compiledRelativePath));

		if (mappedService) {
			// Rojo needs the exact '.server'/'.client' dot-suffixes stripped for script
			// types. Other structural realm keywords are stripped too (unless
			// keepRouteNames). Role aliases (service/controller/...) and custom aliases are
			// descriptive, so they're kept — `player.service` stays `player.service`.
			const exactDot = sepSuffixMatch ? sepSuffixMatch[0].toLowerCase() : "";
			const forceStrip = exactDot === ".server" || exactDot === ".client";
			const shouldStrip =
				forceStrip || (strippedKeywords.has(matchedKeyword) && !keepRouteNames);

			if (shouldStrip) {
				if (isPrefix) {
					nodeName = basename.slice(matchedLength);
				} else {
					nodeName = basename.slice(0, -matchedLength);
				}
			}
		}
	}

	return {
		targetService,
		wrapperFolder,
		useWrapper,
		virtualParts,
		nodeName,
		projectPath,
	};
}
