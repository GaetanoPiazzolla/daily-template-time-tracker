import { EditorView, WidgetType } from "@codemirror/view";

export interface TimerWidgetConfig {
	lineText: string;
	habitName: string;
	isRunning: boolean;
	elapsedDisplay: string;
	onStart: (lineText: string, habitName: string) => void;
	onStop: () => void;
}

export class TimerButtonWidget extends WidgetType {
	constructor(private config: TimerWidgetConfig) {
		super();
	}

	eq(other: TimerButtonWidget): boolean {
		return (
			this.config.lineText === other.config.lineText &&
			this.config.isRunning === other.config.isRunning &&
			this.config.elapsedDisplay === other.config.elapsedDisplay
		);
	}

	toDOM(_view: EditorView): HTMLElement {
		const container = document.createElement("span");
		container.className = "dttt-timer-container";

		const btn = document.createElement("button");
		btn.className = `dttt-timer-btn ${this.config.isRunning ? "dttt-running" : ""}`;
		btn.type = "button";
		btn.setAttribute("aria-label", this.config.isRunning ? "Stop timer" : "Start timer");
		
		// Use identical SVG structure for consistent styling
		if (this.config.isRunning) {
			btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
		} else {
			btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>`;
		}

		btn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (this.config.isRunning) {
				this.config.onStop();
			} else {
				this.config.onStart(this.config.lineText, this.config.habitName);
			}
		});

		container.appendChild(btn);

		if (this.config.isRunning) {
			const badge = document.createElement("span");
			badge.className = "dttt-timer-badge";
			badge.textContent = this.config.elapsedDisplay;
			container.appendChild(badge);
		}

		return container;
	}

	ignoreEvent(event: Event): boolean {
		return event.type === "click" || event.type === "mousedown";
	}
}
