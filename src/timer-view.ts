import { ItemView, WorkspaceLeaf } from "obsidian";
import DailyTemplateTimeTracker from "./main";
import { formatElapsedDisplay } from "./types";

export const TIMER_VIEW_TYPE = "dttt-timer-view";

export class TimerView extends ItemView {
	plugin: DailyTemplateTimeTracker;
	containerEl: HTMLElement;

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
		this.containerEl.empty();
		const state = this.plugin.getTimerState();

		if (!state) {
			const emptyState = this.containerEl.createDiv({ cls: "dttt-view-empty" });
			emptyState.textContent = "Nessun timer in esecuzione.";
			return;
		}

		const wrapper = this.containerEl.createDiv({ cls: "dttt-view-active" });
		
		wrapper.createEl("h3", { text: state.habitName });
		
		const elapsed = formatElapsedDisplay(Date.now() - state.startTime, state.initialMinutes, state.targetMinutes);
		wrapper.createEl("div", { cls: "dttt-view-time", text: elapsed });
		
		const stopBtn = wrapper.createEl("button", { cls: "dttt-view-stop-btn", text: "⏹ Ferma Timer" });
		stopBtn.onclick = () => {
			this.plugin.stopTimer();
		};
	}
}
