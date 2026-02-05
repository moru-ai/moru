---
"@moru-ai/core": minor
"moru": minor
---

Add persistent volume support for sandboxes

- `Volume.create()` - Create named volumes (idempotent)
- `Volume.list()` - List all volumes
- `Volume.get()` - Get volume by ID or name
- `Volume.delete()` - Delete a volume
- Sandbox creation with `volumeId` and `volumeMountPath` options
- Volume mounts synchronously before sandbox is ready
- File persistence across sandbox restarts
