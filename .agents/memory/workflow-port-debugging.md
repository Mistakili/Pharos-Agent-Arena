---
name: Workflow port debugging (Vite strictPort)
description: Why a Vite artifact workflow can falsely report DIDNT_OPEN_A_PORT, and the pkill self-kill trap that prolongs it.
---

# Workflow won't open its port (Vite artifacts, strictPort:true)

When an artifact workflow keeps failing with `DIDNT_OPEN_A_PORT` even though the app serves fine via `curl 127.0.0.1:<port>` and the proxy `localhost:80`, the usual cause is a **stale process holding the assigned port**. Vite configs in these artifacts use `strictPort: true` (so the port is fixed and required); if anything else already holds it, the workflow's Vite refuses to bind and the supervisor loops.

**Why:** Running Vite manually (e.g. `pnpm dev` or `vite` from a shell) to "test" an artifact competes with the workflow for the same fixed port. The leftover manual instance keeps the port, the workflow's Vite can't bind, and you get a persistent false failure.

**The pkill self-kill trap:** `pkill -9 -f "compliance-demo"` (or any pattern that also appears in your own bash command string) matches and SIGKILLs the very shell running the command — you get exit code 137 with truncated output, and your cleanup never actually runs. Symptom: kills appear to "not stick" and processes seem to respawn.

**How to apply:**
- Never run Vite/dev servers manually to verify an artifact. Use `restart_workflow <slug>` and the preview/screenshot tools. The workflow owns the port.
- To kill leftovers, use a pattern that does NOT occur in your command text (e.g. `pgrep -af "bin/vite"` then kill by numeric PID), and verify the port is free (`curl` returns 000) before restarting.
- After killing with `-9`, the socket sits in TIME_WAIT briefly; wait a few seconds before restart so `strictPort` can bind.
