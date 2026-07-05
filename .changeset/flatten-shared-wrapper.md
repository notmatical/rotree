---
"@matical/rotree": patch
---

Flatten shared/default code to the service root instead of nesting it under a `shared/` wrapper folder. All three realms are now symmetric — `<Service>/<feature>/*` across `ServerScriptService`, `StarterPlayerScripts`, and `ReplicatedStorage`. Client/server code that gets redirected into `ReplicatedStorage` (via `emitLegacyScripts: false`) still keeps its wrapper folder to avoid collisions with shared modules.
