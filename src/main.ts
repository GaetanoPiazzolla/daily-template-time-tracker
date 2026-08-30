import { MarkdownView, Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { StateEffect } from "@codemirror/state";
import { createTimerViewPlugin } from "./timer-view-plugin";
import { TimerView, TIMER_VIEW_TYPE } from "./timer-view";
import { TimerState, formatElapsedDisplay, buildTimeField, extractExistingSeconds, extractHabitName, habitNameToFieldKey, extractTargetMinutes } from "./types";

export const timerTickEffect = StateEffect.define<void>();

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

		this.registerView(TIMER_VIEW_TYPE, (leaf) => new TimerView(leaf, this));

		this.addCommand({
			id: "open-timer-view",
			name: "Open Active Timer Panel",
			callback: () => this.activateView()
		});

		this.addRibbonIcon("clock", "Open Active Timer", () => {
			this.activateView();
		});

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

	private startTimer(lineText: string, habitName: string): void {
		if (this.timerState) {
			this.stopTimer();
		}

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView?.file) return;
		
		const initialSeconds = extractExistingSeconds(lineText, habitName);
		const targetMinutes = extractTargetMinutes(lineText);

		this.timerState = {
			filePath: activeView.file.path,
			lineText,
			habitName,
			startTime: Date.now(),
			initialSeconds,
			targetMinutes
		};

		this.startTick();
		this.refreshEditors();
		this.updateTimerView();
		new Notice(`▶ Timer started: ${habitName}`);
	}

	public stopTimer(): void {
		if (!this.timerState) return;

		const elapsedMs = Date.now() - this.timerState.startTime;
		const sessionSeconds = Math.floor(elapsedMs / 1000);
		const totalSeconds = this.timerState.initialSeconds + sessionSeconds;
		
		const timeField = buildTimeField(this.timerState.habitName, totalSeconds);
		const habitName = this.timerState.habitName;
		const targetFilePath = this.timerState.filePath;
		const targetHabitName = this.timerState.habitName;

		this.timerState = null;
		this.clearTick();
		this.updateStatusBar();
		this.updateTimerView();

		this.writeTimeToNote(targetFilePath, targetHabitName, timeField);
		this.refreshEditors();
		new Notice(`⏹ ${habitName} timer registrato.`);
	}

	private writeTimeToNote(filePath: string, targetHabitName: string, timeField: string): void {
		const leaves = this.app.workspace.getLeavesOfType("markdown");
		for (const leaf of leaves) {
			const view = leaf.view;
			if (!(view instanceof MarkdownView) || view.file?.path !== filePath) continue;

			const editor = view.editor;
			const lineCount = editor.lineCount();
			
			const key = habitNameToFieldKey(targetHabitName);
			// Match anything inside the time field instead of just digits and 'm'
			const regex = new RegExp(` *\\[${key}-time::.*?\\]`);

			for (let i = 0; i < lineCount; i++) {
				const currentLine = editor.getLine(i);
				const lineHabit = extractHabitName(currentLine);
				
				if (lineHabit === targetHabitName) {
					let newLine = currentLine;
					if (regex.test(currentLine)) {
						newLine = currentLine.replace(regex, ` ${timeField}`);
					} else {
						newLine = `${currentLine} ${timeField}`;
					}
					editor.setLine(i, newLine);
					return;
				}
			}
		}
	}

	private startTick(): void {
		this.clearTick();
		this.tickInterval = window.setInterval(() => {
			this.checkAutoCompletion();
			this.updateStatusBar();
			this.refreshEditors();
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
		
		const elapsedMs = Date.now() - this.timerState.startTime;
		const totalSeconds = Math.floor(elapsedMs / 1000) + this.timerState.initialSeconds;
		const currentTotalMinutes = Math.floor(totalSeconds / 60);
		
		if (currentTotalMinutes >= this.timerState.targetMinutes) {
			this.autoCheckCurrentTask();
		}
	}
	
	private autoCheckCurrentTask(): void {
		const filePath = this.timerState!.filePath;
		const targetHabitName = this.timerState!.habitName;
		
		const leaves = this.app.workspace.getLeavesOfType("markdown");
		for (const leaf of leaves) {
			const view = leaf.view;
			if (!(view instanceof MarkdownView) || view.file?.path !== filePath) continue;

			const editor = view.editor;
			const lineCount = editor.lineCount();
			
			for (let i = 0; i < lineCount; i++) {
				const currentLine = editor.getLine(i);
				const lineHabit = extractHabitName(currentLine);
				
				if (lineHabit === targetHabitName) {
					if (currentLine.match(/^(\s*)- \[\s\]/)) {
						const newLine = currentLine.replace(/^(\s*)- \[\s\]/, "$1- [x]");
						editor.setLine(i, newLine);
						this.timerState!.lineText = newLine;
						new Notice(`✅ Obiettivo raggiunto: ${targetHabitName} completato!`);
					}
					return;
				}
			}
		}
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

	private refreshEditors(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				// @ts-ignore
				leaf.view.editor.cm?.dispatch({
					effects: timerTickEffect.of()
				});
			}
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
