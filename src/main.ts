import { MarkdownView, Notice, Plugin } from "obsidian";
import { StateEffect } from "@codemirror/state";
import { createTimerViewPlugin } from "./timer-view-plugin";
import { TimerState, formatElapsedMinutes, formatElapsedDisplay, buildTimeField, extractExistingMinutes, extractHabitName, habitNameToFieldKey, extractTargetMinutes } from "./types";

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
		
		const initialMinutes = extractExistingMinutes(lineText, habitName);
		const targetMinutes = extractTargetMinutes(lineText);

		this.timerState = {
			filePath: activeView.file.path,
			lineText,
			habitName,
			startTime: Date.now(),
			initialMinutes,
			targetMinutes
		};

		this.startTick();
		this.refreshEditors();
		new Notice(`▶ Timer started: ${habitName}`);
	}

	private stopTimer(): void {
		if (!this.timerState) return;

		const elapsedMs = Date.now() - this.timerState.startTime;
		const sessionMinutes = formatElapsedMinutes(elapsedMs);
		const totalMinutes = this.timerState.initialMinutes + sessionMinutes;
		
		const timeField = buildTimeField(this.timerState.habitName, totalMinutes);
		const habitName = this.timerState.habitName;
		const targetFilePath = this.timerState.filePath;
		const targetHabitName = this.timerState.habitName;

		this.timerState = null;
		this.clearTick();
		this.updateStatusBar();

		this.writeTimeToNote(targetFilePath, targetHabitName, timeField);
		this.refreshEditors();
		new Notice(`⏹ ${habitName}: ${totalMinutes}m total recorded`);
	}

	private writeTimeToNote(filePath: string, targetHabitName: string, timeField: string): void {
		const leaves = this.app.workspace.getLeavesOfType("markdown");
		for (const leaf of leaves) {
			const view = leaf.view;
			if (!(view instanceof MarkdownView) || view.file?.path !== filePath) continue;

			const editor = view.editor;
			const lineCount = editor.lineCount();
			
			const key = habitNameToFieldKey(targetHabitName);
			const regex = new RegExp(` *\\[${key}-time::\\s*\\d+m?\\]`);

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
		// Use exact total seconds to determine if we crossed the minute threshold
		const totalSeconds = Math.floor(elapsedMs / 1000) + (this.timerState.initialMinutes * 60);
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
					// Regex matches - [ ] or - [ ] with arbitrary whitespace before it
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
			const elapsed = formatElapsedDisplay(Date.now() - this.timerState.startTime, this.timerState.initialMinutes, this.timerState.targetMinutes);
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
}
