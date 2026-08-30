import { MarkdownView, Notice, Plugin } from "obsidian";
import { createTimerViewPlugin } from "./timer-view-plugin";
import { TimerState, formatElapsedMinutes, formatElapsedDisplay, buildTimeField } from "./types";

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
			onStop: () => this.stopTimer(),
		});

		this.registerEditorExtension(viewPlugin);
	}

	onunload(): void {
		this.clearTick();
	}

	private startTimer(lineText: string, habitName: string): void {
		if (this.timerState) {
			this.stopTimer();
		}

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView?.file) return;

		this.timerState = {
			filePath: activeView.file.path,
			lineText,
			habitName,
			startTime: Date.now(),
		};

		this.startTick();
		this.refreshEditors();
		new Notice(`▶ Timer started: ${habitName}`);
	}

	private stopTimer(): void {
		if (!this.timerState) return;

		const elapsed = Date.now() - this.timerState.startTime;
		const minutes = formatElapsedMinutes(elapsed);
		const timeField = buildTimeField(this.timerState.habitName, minutes);
		const habitName = this.timerState.habitName;
		const targetLineText = this.timerState.lineText;
		const targetFilePath = this.timerState.filePath;

		this.timerState = null;
		this.clearTick();
		this.updateStatusBar();

		this.writeTimeToNote(targetFilePath, targetLineText, timeField);
		this.refreshEditors();
		new Notice(`⏹ ${habitName}: ${minutes}m recorded`);
	}

	private writeTimeToNote(filePath: string, lineText: string, timeField: string): void {
		const leaves = this.app.workspace.getLeavesOfType("markdown");
		for (const leaf of leaves) {
			const view = leaf.view;
			if (!(view instanceof MarkdownView) || view.file?.path !== filePath) continue;

			const editor = view.editor;
			const lineCount = editor.lineCount();

			for (let i = 0; i < lineCount; i++) {
				const currentLine = editor.getLine(i);
				if (currentLine === lineText) {
					const fieldKey = timeField.match(/\[(.+?):: /)?.[1];
					if (fieldKey && currentLine.includes(`[${fieldKey}::`)) return;
					editor.setLine(i, `${currentLine} ${timeField}`);
					return;
				}
			}
		}
	}

	private startTick(): void {
		this.clearTick();
		this.tickInterval = window.setInterval(() => {
			this.updateStatusBar();
			this.refreshEditors();
		}, 1000);
		this.registerInterval(this.tickInterval);
	}

	private clearTick(): void {
		if (this.tickInterval !== null) {
			window.clearInterval(this.tickInterval);
			this.tickInterval = null;
		}
	}

	private updateStatusBar(): void {
		if (!this.statusBarEl) return;
		if (this.timerState) {
			const elapsed = formatElapsedDisplay(Date.now() - this.timerState.startTime);
			this.statusBarEl.textContent = `⏱️ ${this.timerState.habitName} ${elapsed}`;
		} else {
			this.statusBarEl.textContent = "";
		}
	}

	private refreshEditors(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				// @ts-ignore — force CM6 to rebuild decorations
				leaf.view.editor.cm?.dispatch();
			}
		});
	}
}
