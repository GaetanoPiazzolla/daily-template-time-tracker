import { Editor, MarkdownView, Notice, Plugin, TFile, WorkspaceLeaf, debounce, moment } from "obsidian";
import { createTimerViewPlugin } from "./timer-view-plugin";
import { TimerView, TIMER_VIEW_TYPE } from "./timer-view";
import { timerTickEffect } from "./effects";
import { playRocketSound, playStopSound } from "./sounds";
import { TimedTask, TimerState, buildTimeField, checkTaskLine, extractExistingSeconds, extractHabitName, extractTargetMinutes, formatDuration, formatElapsedDisplay, isTaskChecked, parseTimedTasks, setTimeFieldOnLine } from "./types";

export default class DailyTemplateTimeTracker extends Plugin {
	private timerState: TimerState | null = null;
	private tickInterval: number | null = null;
	private statusBarEl: HTMLElement | null = null;

	async onload(): Promise<void> {
		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass("dttt-status-bar");
		this.updateStatusBar();

		const viewPlugin = createTimerViewPlugin({
			getTimerState: () => this.timerState,
			onStart: (lineText, habitName) => this.startTimer(lineText, habitName),
			onStop: () => void this.stopTimer(),
			onComplete: (lineText, habitName, filePath) =>
				void this.completeHabit(lineText, habitName, filePath),
		});

		this.registerEditorExtension(viewPlugin);

		this.registerView(TIMER_VIEW_TYPE, (leaf) => new TimerView(leaf, this));

		this.addCommand({
			id: "open-timer-view",
			name: "Open Active Timer Panel",
			callback: () => this.activateView()
		});

		this.addRibbonIcon("clock", "Open Active Timer", () => {
			this.activateView();
		});

		// keep the idle task list in sync with the note
		const refreshIdleList = debounce(() => {
			if (!this.timerState) this.updateTimerView();
		}, 600);
		this.registerEvent(this.app.vault.on("modify", (file) => {
			if (file.path === this.dailyNotePath()) refreshIdleList();
		}));
		this.registerEvent(this.app.workspace.on("file-open", () => refreshIdleList()));

		this.app.workspace.onLayoutReady(() => {
			this.activateView();
		});
	}

	onunload(): void {
		this.clearTick();
	}

	async activateView() {
		const { workspace } = this.app;
		
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(TIMER_VIEW_TYPE);
		
		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: TIMER_VIEW_TYPE, active: true });
			}
		}
		
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	public getTimerState(): TimerState | null {
		return this.timerState;
	}

	/** #timed tasks of today's daily note (fallback: an open note), for the sidebar list. */
	public async getTimedTasks(): Promise<{ file: TFile; tasks: TimedTask[] } | null> {
		const file = this.resolveTimedFile();
		if (!file) return null;
		const content = await this.app.vault.cachedRead(file);
		return { file, tasks: parseTimedTasks(content) };
	}

	private resolveTimedFile(): TFile | null {
		return this.app.vault.getFileByPath(this.dailyNotePath()) ?? this.app.workspace.getActiveFile();
	}

	private dailyNotePath(): string {
		const opts = (this.app as any).internalPlugins?.getPluginById?.("daily-notes")?.instance?.options ?? {};
		const name = `${moment().format(opts.format || "YYYY-MM-DD")}.md`;
		const folder = String(opts.folder || "").trim().replace(/\/+$/, "");
		return folder ? `${folder}/${name}` : name;
	}

	public startTimer(lineText: string, habitName: string, filePath?: string): void {
		if (this.timerState) void this.stopTimer();

		const path = filePath ?? this.app.workspace.getActiveViewOfType(MarkdownView)?.file?.path;
		if (!path) return;

		this.timerState = {
			filePath: path,
			lineText,
			habitName,
			startTime: Date.now(),
			initialSeconds: extractExistingSeconds(lineText, habitName),
			targetMinutes: extractTargetMinutes(lineText)
		};

		this.startTick();
		this.refreshEditors(path);
		this.updateTimerView();
		this.activateView();
		playRocketSound();
		new Notice(`▶ Timer started: ${habitName}`);
	}

	public async stopTimer(): Promise<void> {
		if (!this.timerState) return;

		const { habitName, filePath, initialSeconds, startTime } = this.timerState;
		const totalSeconds = initialSeconds + Math.floor((Date.now() - startTime) / 1000);

		this.timerState = null;
		this.clearTick();
		this.updateStatusBar();
		playStopSound();

		// never below what the line already claims: a target credited mid-session must survive
		const written = await this.updateHabitLine(filePath, habitName, (line) =>
			setTimeFieldOnLine(line, habitName, buildTimeField(habitName, Math.max(totalSeconds, extractExistingSeconds(line, habitName))))
		);

		this.refreshEditors(filePath);
		this.updateTimerView();
		new Notice(written !== null
			? `⏹ ${habitName}: ${formatDuration(extractExistingSeconds(written, habitName))} registrati.`
			: `⚠️ ${habitName}: riga non trovata, ${formatDuration(totalSeconds)} non salvati.`);
	}

	/**
	 * Checking a #timed-N task counts the target as fulfilled time-wise.
	 * A running timer keeps going: the target is a goal, not a limit, and the display rolls over to +MM:SS.
	 */
	private async completeHabit(lineText: string, habitName: string, filePath: string): Promise<void> {
		const targetMinutes = extractTargetMinutes(lineText);
		if (targetMinutes === null) return;
		const targetSeconds = targetMinutes * 60;

		const filled = await this.updateHabitLine(filePath, habitName, (line) => {
			if (extractExistingSeconds(line, habitName) >= targetSeconds) return null;
			return setTimeFieldOnLine(line, habitName, buildTimeField(habitName, targetSeconds));
		});

		if (filled !== null) {
			this.refreshEditors(filePath);
			this.updateTimerView();
			new Notice(`✅ ${habitName}: tempo completato (${formatDuration(targetSeconds)}).`);
		}
	}

	/**
	 * Applies a transform to the habit line, through the open editor when there is one,
	 * otherwise straight on the file so a closed note still gets updated.
	 * Returns the resulting line, or null if the line was not found or the transform declined.
	 */
	private async updateHabitLine(filePath: string, habitName: string, transform: (line: string) => string | null): Promise<string | null> {
		const editor = this.editorForPath(filePath);
		if (editor) {
			const lineCount = editor.lineCount();
			for (let i = 0; i < lineCount; i++) {
				const line = editor.getLine(i);
				if (extractHabitName(line) !== habitName) continue;

				const next = transform(line);
				if (next !== null && next !== line) editor.setLine(i, next);
				return next;
			}
			return null;
		}

		const file = this.app.vault.getFileByPath(filePath);
		if (!file) return null;

		let applied: string | null = null;
		await this.app.vault.process(file, (data) => {
			const lines = data.split("\n");
			const i = lines.findIndex((line) => extractHabitName(line) === habitName);
			if (i === -1) return data;

			applied = transform(lines[i]);
			if (applied === null) return data;
			lines[i] = applied;
			return lines.join("\n");
		});
		return applied;
	}

	private editorForPath(filePath: string): Editor | null {
		for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
			const view = leaf.view;
			if (view instanceof MarkdownView && view.file?.path === filePath) return view.editor;
		}
		return null;
	}

	private startTick(): void {
		this.clearTick();
		this.tickInterval = window.setInterval(() => {
			this.checkAutoCompletion();
			this.updateStatusBar();
			this.refreshEditors(this.timerState?.filePath);
			this.updateTimerView();
		}, 1000);
		this.registerInterval(this.tickInterval);
	}

	private clearTick(): void {
		if (this.tickInterval !== null) {
			window.clearInterval(this.tickInterval);
			this.tickInterval = null;
		}
	}
	
	private checkAutoCompletion(): void {
		if (!this.timerState || this.timerState.targetMinutes === null) return;
		if (isTaskChecked(this.timerState.lineText)) return;
		
		const elapsedMs = Date.now() - this.timerState.startTime;
		const totalSeconds = Math.floor(elapsedMs / 1000) + this.timerState.initialSeconds;
		
		if (Math.floor(totalSeconds / 60) >= this.timerState.targetMinutes) {
			void this.autoCheckCurrentTask();
		}
	}
	
	private async autoCheckCurrentTask(): Promise<void> {
		if (!this.timerState) return;
		const { filePath, habitName } = this.timerState;

		const checked = await this.updateHabitLine(filePath, habitName, checkTaskLine);
		if (checked === null) return;

		if (this.timerState?.habitName === habitName) this.timerState.lineText = checked;
		new Notice(`✅ Obiettivo raggiunto: ${habitName} completato!`);
	}

	private updateStatusBar(): void {
		if (!this.statusBarEl) return;
		if (this.timerState) {
			const elapsed = formatElapsedDisplay(Date.now() - this.timerState.startTime, this.timerState.initialSeconds, this.timerState.targetMinutes);
			const icon = this.timerState.targetMinutes !== null ? "⏳" : "⏱️";
			this.statusBarEl.textContent = `${icon} ${this.timerState.habitName} ${elapsed}`;
		} else {
			this.statusBarEl.textContent = "";
		}
	}

	/** Repaints the timer widgets; without a path, in every open note. */
	private refreshEditors(filePath?: string): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (!(leaf.view instanceof MarkdownView)) return;
			if (filePath && leaf.view.file?.path !== filePath) return;
			// @ts-ignore
			leaf.view.editor.cm?.dispatch({
				effects: timerTickEffect.of()
			});
		});
	}

	private updateTimerView(): void {
		const leaves = this.app.workspace.getLeavesOfType(TIMER_VIEW_TYPE);
		for (const leaf of leaves) {
			if (leaf.view instanceof TimerView) {
				leaf.view.render();
			}
		}
	}
}
