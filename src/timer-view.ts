import { ItemView, WorkspaceLeaf } from "obsidian";
import DailyTemplateTimeTracker from "./main";
import { PLAY_ICON_SVG } from "./timer-widget";
import { TimedTask, formatDuration, formatElapsedDisplay } from "./types";

export const TIMER_VIEW_TYPE = "dttt-timer-view";

export class TimerView extends ItemView {
	plugin: DailyTemplateTimeTracker;
	containerEl: HTMLElement;
	private runningHabit: string | null = null;
	private timeEl: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: DailyTemplateTimeTracker) {
		super(leaf);
		this.plugin = plugin;
		this.containerEl = this.contentEl;
	}

	getViewType(): string {
		return TIMER_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Active Timer";
	}

	getIcon(): string {
		return "clock";
	}

	async onOpen() {
		this.render();
	}

	async onClose() {
		// cleanup if needed
	}

	render() {
		const state = this.plugin.getTimerState();

		if (!state) {
			this.containerEl.empty();
			this.timeEl = null;
			this.runningHabit = null;
			void this.renderTaskList();
			return;
		}

		const elapsed = formatElapsedDisplay(Date.now() - state.startTime, state.initialSeconds, state.targetMinutes);

		// on tick only the clock changes, so leave the rest of the panel alone
		if (this.timeEl && this.runningHabit === state.habitName) {
			this.timeEl.textContent = elapsed;
			return;
		}

		this.containerEl.empty();
		this.runningHabit = state.habitName;

		const wrapper = this.containerEl.createDiv({ cls: "dttt-view-active" });
		
		wrapper.createEl("h3", { text: state.habitName });
		
		this.timeEl = wrapper.createEl("div", { cls: "dttt-view-time", text: elapsed });
		
		const stopBtn = wrapper.createEl("button", { cls: "dttt-view-stop-btn", text: "⏹ Ferma Timer" });
		stopBtn.onclick = () => {
			void this.plugin.stopTimer();
		};
	}

	private async renderTaskList() {
		const container = this.containerEl.createDiv({ cls: "dttt-view-list" });
		const source = await this.plugin.getTimedTasks();

		if (!source || source.tasks.length === 0) {
			container.createDiv({ cls: "dttt-view-empty", text: "Nessun task #timed da avviare." });
			return;
		}

		const header = container.createDiv({ cls: "dttt-view-list-header" });
		header.createSpan({ cls: "dttt-view-list-title", text: "Timed" });
		header.createSpan({ cls: "dttt-view-list-source", text: source.file.basename });

		for (const task of source.tasks) {
			this.renderTaskRow(container, task, source.file.path);
		}
	}

	private renderTaskRow(container: HTMLElement, task: TimedTask, filePath: string) {
		const row = container.createDiv({ cls: "dttt-view-row" });
		row.toggleClass("dttt-done", task.checked);

		const playBtn = row.createEl("button", { cls: "dttt-timer-btn" });
		playBtn.type = "button";
		playBtn.setAttribute("aria-label", `Start ${task.habitName}`);
		playBtn.innerHTML = PLAY_ICON_SVG;
		playBtn.onclick = () => this.plugin.startTimer(task.lineText, task.habitName, filePath);

		const info = row.createDiv({ cls: "dttt-view-row-info" });
		info.createDiv({ cls: "dttt-view-row-name", text: `${task.checked ? "✅ " : ""}${task.habitName}` });

		const logged = task.loggedSeconds > 0 ? formatDuration(task.loggedSeconds) : "—";
		const target = task.targetMinutes !== null ? ` / ${task.targetMinutes}m` : "";
		info.createDiv({ cls: "dttt-view-row-meta", text: `${logged}${target}` });
	}
}
