# @matical/rotree

## 0.2.0

### Minor Changes

- 0aadc88: Add the "name by role" routing convention so you never need `client`/`server`/`shared` folders:

  - **Built-in role aliases** — `service` → ServerScriptService, `controller`/`component` → StarterPlayerScripts. Role and custom-alias suffixes are kept in the node name (e.g. `player.service`) so roblox-ts imports resolve; only structural realm keywords (`server`, `client`, service names) are stripped.
  - **`jsx` option** (default `"client"`) — unrouted `.tsx`/`.jsx` files default to the client realm, since React UI is client-side. Overridable per project, and any explicit signal (role, folder, marker) still wins.

### Patch Changes

- 0aadc88: Flatten shared/default code to the service root instead of nesting it under a `shared/` wrapper folder. All three realms are now symmetric — `<Service>/<feature>/*` across `ServerScriptService`, `StarterPlayerScripts`, and `ReplicatedStorage`. Client/server code that gets redirected into `ReplicatedStorage` (via `emitLegacyScripts: false`) still keeps its wrapper folder to avoid collisions with shared modules.
