# Daily Template Time Tracker — Obsidian Plugin

## Project Overview
An Obsidian plugin that adds inline start/stop timer buttons next to `#daily` checkbox items in Live Preview mode. When a timer is stopped, it writes the elapsed time as a Dataview inline field (e.g., `[meditazione-time:: 20m]`) directly into the markdown.

## Architecture
- **Obsidian Plugin** built with TypeScript, bundled via esbuild
- **CodeMirror 6** `ViewPlugin` + `WidgetType` for inline editor decorations
- One active timer at a time (starting another auto-stops the previous)
- Status bar widget shows running timer

## Key Files
- `src/main.ts` — Plugin lifecycle, timer state management, writes time fields to markdown
- `src/timer-view-plugin.ts` — CM6 ViewPlugin that scans for `#daily` checkboxes and adds widget decorations
- `src/timer-widget.ts` — CM6 WidgetType rendering ▶/⏹ buttons with elapsed time badge
- `src/types.ts` — Shared types and utilities (habit name extraction, field key generation, time formatting)
- `styles.css` — Compact button/badge/status bar styling using Obsidian theme variables
- `manifest.json` — Obsidian plugin metadata

## Build & Deploy
```bash
npm install
npm run build          # tsc check + esbuild production bundle → main.js
npm run dev            # esbuild watch mode
```
Deploy by copying `main.js`, `manifest.json`, `styles.css` to `.obsidian/plugins/daily-template-time-tracker/`.

## Conventions
- Target lines match: `- [ ] ... #daily` or `- [x] ... #daily`
- Habit name extracted from pattern: `- [.] EMOJI **HabitName** #daily`
- Time field format: `[habitname-time:: Xm]` (Dataview inline field)
- Field key is lowercase, spaces → hyphens, non-alphanumeric stripped
- All external APIs (`obsidian`, `@codemirror/*`) are marked as esbuild externals
