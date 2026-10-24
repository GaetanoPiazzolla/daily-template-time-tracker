# Daily Template Time Tracker — Obsidian Plugin

## Project Overview
An Obsidian plugin that adds inline start/stop timer buttons next to `#timed` checkbox items in Live Preview mode. When a timer is stopped, it writes the elapsed time as a Dataview inline field (e.g., `[meditazione-time:: 20m 5s]`) directly into the markdown.

## Architecture
- **Obsidian Plugin** built with TypeScript, bundled via esbuild
- **CodeMirror 6** `ViewPlugin` + `WidgetType` for inline editor decorations
- One active timer at a time (starting another auto-stops the previous)
- Status bar widget shows running timer
- Pannello laterale (`TIMER_VIEW_TYPE`): timer attivo oppure, da fermo, i `#timed` del daily note avviabili
- Il target di `#timed-N` è un obiettivo, non un limite: al raggiungimento spunta la casella una volta sola e il timer continua (display `+MM:SS`)

## Key Files
- `src/main.ts` — Plugin lifecycle, timer state management, writes time fields to markdown
- `src/timer-view-plugin.ts` — CM6 ViewPlugin that scans for `#timed` checkboxes and adds widget decorations
- `src/timer-view.ts` — pannello laterale: timer attivo, o lista dei `#timed` del daily note con avvio diretto
- `src/timer-widget.ts` — CM6 WidgetType rendering ▶/⏹ buttons with elapsed time badge
- `src/sounds.ts` — sintesi Web Audio su un AudioContext condiviso: start (tonfo + arpeggio C maggiore ascendente), stop (speculare, discendente), completamento (stacchetto + accordo tenuto + sparkle)
- `src/effects.ts` — `timerTickEffect`, lo StateEffect che fa ridisegnare i widget
- `src/types.ts` — Shared types and utilities (habit name extraction, field key generation, time formatting)
- `styles.css` — Compact button/badge/status bar styling using Obsidian theme variables
- `manifest.json` — Obsidian plugin metadata

## Build & Deploy
```bash
npm install
npm run build          # tsc check + esbuild production bundle → main.js
npm run dev            # esbuild watch mode
```
Deploy by copying the compiled files to your specific Obsidian vault:
```bash
cp main.js manifest.json styles.css /Users/gae.piaz/Workspace/obsidian-notes/.obsidian/plugins/daily-template-time-tracker/
```
## Conventions
- Target lines match: `- [ ] ... #timed` / `#timed-<minuti>` (il numero è il target)
- Habit name extracted from pattern: `- [.] EMOJI **HabitName** #timed`
- Time field format: `[habitname-time:: 1h 5m 30s]` (Dataview inline field, parti a zero omesse tranne i secondi)
- Field key is lowercase, spaces → hyphens, non-alphanumeric stripped
- Il campo viene scritto subito dopo il tag `#timed`, per lasciare in coda i marker tipo `✅ 2026-01-01`
- Le scritture passano dall'editor aperto se c'è, altrimenti da `vault.process` (nota chiusa)
- Spuntare a mano un `#timed-N` porta il tempo registrato al target, senza fermare il timer
- Lo stop scrive `max(misurato, già sulla riga)`: un target accreditato a mano non va perso
- La spunta è rilevata nell'`update()` del ViewPlugin, quindi solo in Live Preview (non da reading view o da sync)
- Il daily note è risolto dalle opzioni del core plugin `daily-notes` (cartella + formato), con fallback sul file attivo
- All external APIs (`obsidian`, `@codemirror/*`) are marked as esbuild externals
