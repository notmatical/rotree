import fs from "node:fs";
import path from "node:path";
import type { MissingPath, RojoNode } from "../types.js";

export const toPosix = (p: string): string => p.split(path.sep).join("/");

// Segment-aware containment check. Avoids "out" matching "output/x", and normalizes
// separators so a posix $path compares correctly against an OS-native buildDir.
export function isUnderBuildDir(childPath: string, buildDir: string): boolean {
	const child = toPosix(childPath);
	const dir = toPosix(buildDir);
	return child === dir || child.startsWith(`${dir}/`);
}

export function getOrCreateNode(
	parent: RojoNode,
	key: string,
	className?: string,
): RojoNode {
	if (!parent[key]) {
		parent[key] = className == null ? {} : { $className: className };
	}
	return parent[key] as RojoNode;
}

export function pruneObject(node: RojoNode, buildDir: string): RojoNode {
	for (const key in node) {
		const val = node[key];
		if (typeof val !== "object" || val === null) continue;

		const childNode = val as RojoNode;

		if (childNode.$path) {
			if (isUnderBuildDir(childNode.$path, buildDir)) continue;
			if (!fs.existsSync(path.resolve(process.cwd(), childNode.$path))) {
				delete node[key];
				continue;
			}
		}
		pruneObject(childNode, buildDir);
	}
	return node;
}

export function sortObject<T>(obj: T): T {
	if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
		return obj;
	}

	const record = obj as Record<string, unknown>;

	return Object.keys(record)
		.sort()
		.reduce((acc: Record<string, unknown>, key: string) => {
			acc[key] = sortObject(record[key]);
			return acc;
		}, {}) as T;
}

export function findMissingPaths(
	node: RojoNode,
	buildDir: string,
	missing: MissingPath[] = [],
): MissingPath[] {
	for (const key in node) {
		const val = node[key];
		if (typeof val !== "object" || val === null) continue;

		const childNode = val as RojoNode;

		if (childNode.$path && isUnderBuildDir(childNode.$path, buildDir)) {
			const absolutePath = path.resolve(process.cwd(), childNode.$path);
			if (!fs.existsSync(absolutePath)) {
				missing.push({
					parent: node,
					key,
					path: childNode.$path,
					absolutePath,
				});
			}
		}
		findMissingPaths(childNode, buildDir, missing);
	}
	return missing;
}
