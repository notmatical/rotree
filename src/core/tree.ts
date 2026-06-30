import fs from "fs";
import path from "path";
import { MissingPath, RojoNode } from "../types.js";

export const toPosix = (p: string): string => p.split(path.sep).join("/");

export function getOrCreateNode(parent: RojoNode, key: string, className?: string): RojoNode {
	if (!parent[key]) {
		parent[key] = className == null ? {} : { $className: className };
	}
	return parent[key];
}

export function pruneObject(node: RojoNode, buildDir: string): RojoNode {
	for (const key in node) {
		const val = node[key];
		if (typeof val !== "object" || val === null) continue;

		if (val.$path) {
			if (val.$path.startsWith(buildDir)) continue; 
			if (!fs.existsSync(path.resolve(process.cwd(), val.$path))) {
				delete node[key];
				continue;
			}
		}
		pruneObject(val, buildDir);
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

export function findMissingPaths(node: RojoNode, buildDir: string, missing: MissingPath[] = []): MissingPath[] {
	for (const key in node) {
		const val = node[key];
		if (typeof val !== "object" || val === null) continue;

		if (val.$path && val.$path.startsWith(buildDir)) {
			const absolutePath = path.resolve(process.cwd(), val.$path);
			if (!fs.existsSync(absolutePath)) {
				missing.push({ parent: node, key, path: val.$path, absolutePath });
			}
		}
		findMissingPaths(val, buildDir, missing);
	}
	return missing;
}