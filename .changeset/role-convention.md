---
"@matical/rotree": minor
---

Add the "name by role" routing convention so you never need `client`/`server`/`shared` folders:

- **Built-in role aliases** — `service` → ServerScriptService, `controller`/`component` → StarterPlayerScripts. Role and custom-alias suffixes are kept in the node name (e.g. `player.service`) so roblox-ts imports resolve; only structural realm keywords (`server`, `client`, service names) are stripped.
- **`jsx` option** (default `"client"`) — unrouted `.tsx`/`.jsx` files default to the client realm, since React UI is client-side. Overridable per project, and any explicit signal (role, folder, marker) still wins.
