<div align="center">
	<h1>Rotree</h1>
	<p><strong>Feature-based folder structure for Rojo — name files by <em>what they are</em>, not where they run.</strong></p>
	<p>
		<a href="https://www.npmjs.com/package/@matical/rotree"><img alt="npm" src="https://img.shields.io/npm/v/@matical/rotree?color=cb3837&logo=npm&logoColor=white"></a>
		<a href="LICENSE.md"><img alt="license" src="https://img.shields.io/badge/license-MIT-blue"></a>
	</p>
</div>

Rotree watches your source and generates `default.project.json` for Rojo. You organize code by feature (`modules/player/`) and name files by role (`player.service.ts`); Rotree routes each file into the right Roblox service — with no `client`/`server`/`shared` folders to maintain. Works with both Luau and roblox-ts.

## Installation

The CLI command is `rotree` on either channel.

**Rokit** — recommended for Luau projects:
```toml
[tools]
rotree = "notmatical/rotree@0.2.0"
```

**npm** — recommended for roblox-ts (or anyone with Node/Bun). Add it as a dev dependency, or run it directly:
```bash
bun add -d @matical/rotree     # or: npm install -D @matical/rotree
bunx @matical/rotree --watch   # or: npx @matical/rotree --watch
```

## Quick start

```bash
rotree --init      # writes a .rotree.json
rotree --watch     # regenerate default.project.json on every change
```

For **roblox-ts**, run Rotree next to the compiler (via [concurrently](https://www.npmjs.com/package/concurrently)):
```json
"scripts": {
	"dev": "concurrently \"rotree -w\" \"rbxtsc -w\" \"rojo serve\""
}
```

## The convention: name by role, realm follows

You never create `client`/`server`/`shared` folders. Instead you **name a file for what it is**, and its realm falls out automatically:

| You write | Because it's a… | Lands in |
| --- | --- | --- |
| `player.service.ts` | service | **server** (`ServerScriptService`) |
| `input.controller.ts` | controller | **client** (`StarterPlayerScripts`) |
| `hud.tsx` / `button.component.tsx` | UI | **client** |
| `player.ts`, `dmg.const.ts`, `net.remote.ts` | anything else | **shared** (`ReplicatedStorage`) |

Two rules to remember: **`service` → server, `controller`/`component`/`.tsx` → client, everything else → shared.**

Two explicit escapes you touch rarely:
- **Entry points that _run_** → `main.server.ts` / `main.client.ts` (these become Script / LocalScript).
- **A whole folder at once** → drop an empty `.server` / `.client` / `.shared` **marker** file in it (great for `ui/` or vendored libraries).

Organize by feature, and Rotree mirrors it into the tree:

```
src/
  main.server.ts               →  ServerScriptService/main
  main.client.ts               →  StarterPlayerScripts/main
  modules/player/
    player.service.ts          →  ServerScriptService/modules/player/player.service
    player-data.ts             →  ReplicatedStorage/modules/player/player-data
  ui/
    .client                       (marker: everything under ui/ is client)
    app.tsx                    →  StarterPlayerScripts/ui/app
  vendor/
    .server                       (marker: server-only library)
    profile-store.luau         →  ServerScriptService/vendor/profile-store
```

> **Why not `.server.ts` for a service?** In roblox-ts, `.server.ts`/`.client.ts` compile to a **Script/LocalScript** (an entry point that runs) — you can't `import` from them. Role suffixes like `.service` keep the file a **ModuleScript**, so it routes to the server *and* stays importable. Use `.server`/`.client` only for the handful of entry points that bootstrap the game.

**Precedence** (most specific wins): file affix → marker file → folder name → `.tsx` default → shared.

## Configuration (`.rotree.json`)

`rotree --init` generates a starting config. Everything is optional — the convention works out of the box.

```json
{
	"source": ["src"],
	"jsx": "client",
	"ts": { "output": "default.project.json", "build": "out" },
	"luau": { "output": "default.project.json", "build": "src" },
	"aliases": {
		"repository": "ServerScriptService"
	},
	"template": {
		"name": "my-game",
		"tree": { "$className": "DataModel" }
	}
}
```

| Field | Description |
| --- | --- |
| `source` | Source directory, or an array of them to merge multiple places into one tree. Defaults to `["src"]`. |
| `jsx` | Realm that unrouted `.tsx`/`.jsx` files default to. Defaults to `"client"`. |
| `ts` / `luau` / `darklua` | Mode overrides — where compiled code lands (`build`) and the generated file name (`output`). Auto-detected from `tsconfig.json` / `.darklua.json`. |
| `aliases` | Register your own role suffixes → services (e.g. `"repository": "ServerScriptService"`). `service`, `controller`, and `component` are built in. |
| `template` | Base Rojo tree merged with Rotree's generated paths — services with properties, `rbxts_include`, package folders, etc. Can also be a path to a JSON file. |
| `keepRouteNames` | Keep structural realm keywords in node names instead of stripping them (`main.server` → `main`). Defaults to `false`. |

## CLI

| Flag | Description |
| --- | --- |
| `-w, --watch` | Regenerate on file changes |
| `-i, --init` | Write a default `.rotree.json` |
| `-m, --mode <mode>` | `luau` \| `ts` \| `darklua` \| custom (auto-detected if omitted) |
| `-s, --source <path>` | Override source dir (repeatable to merge) |
| `-o, --output <path>` | Override the generated project file |
| `-b, --build <path>` | Override where compiled code lands |
| `-t, --template <path>` | Path to a base Rojo tree JSON |
| `-j, --jsx <realm>` | Realm for `.tsx`/`.jsx` (default `client`) |
| `-k, --keepRouteNames` | Don't strip realm keywords from names |
| `-c, --config <path>` | Custom config file path |

## Credits

Rotree is a fork of [rogen](https://github.com/LDGerrits/rogen) by [LDGerrits](https://github.com/LDGerrits), used under the MIT license. Thanks to the original author for the feature-based routing foundation.

## License

[MIT](LICENSE.md) © notmatical, with original portions © Loek Gerrits.
