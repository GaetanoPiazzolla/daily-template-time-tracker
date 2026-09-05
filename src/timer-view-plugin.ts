import { ViewPlugin, ViewUpdate, EditorView, Decoration, DecorationSet } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { editorLivePreviewField } from "obsidian";
import { TimerButtonWidget } from "./timer-widget";
import { extractHabitName, TimerState, formatElapsedDisplay } from "./types";
import { timerTickEffect, playDingSound } from "./main";

const DAILY_TASK_REGEX = /^(\s*[-*+])\s+\[(.)\].*#timed/;

export interface ViewPluginDeps {
	getTimerState: () => TimerState | null;
	onStart: (lineText: string, habitName: string) => void;
	onStop: () => void;
}

export function createTimerViewPlugin(deps: ViewPluginDeps) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			update(update: ViewUpdate): void {
				if (update.docChanged) {
					update.changes.iterChanges((fromA, toA, fromB, toB) => {
						const oldLine = update.startState.doc.lineAt(fromA);
						const newLine = update.state.doc.lineAt(fromB);

						if (oldLine.number === update.startState.doc.lineAt(toA).number && 
							newLine.number === update.state.doc.lineAt(toB).number) {
							
							const oldText = oldLine.text;
							const newText = newLine.text;
							
							const wasUnchecked = oldText.match(/^(\s*[-*+])\s+\[ \]/);
							const isChecked = newText.match(/^(\s*[-*+])\s+\[[xX]\]/);
							
							if (wasUnchecked && isChecked) {
								setTimeout(() => playDingSound(), 10);
							}
						}
					});
				}

				const isTick = update.transactions.some(tr => tr.effects.some(e => e.is(timerTickEffect)));
				if (update.docChanged || update.viewportChanged || update.selectionSet || isTick) {
					this.decorations = this.buildDecorations(update.view);
				}
			}

			buildDecorations(view: EditorView): DecorationSet {
				const isLivePreview = view.state.field(editorLivePreviewField, false);
				if (!isLivePreview) return Decoration.none;

				const builder = new RangeSetBuilder<Decoration>();
				const timerState = deps.getTimerState();

				for (const { from, to } of view.visibleRanges) {
					let pos = from;
					while (pos <= to) {
						const line = view.state.doc.lineAt(pos);
						const match = line.text.match(DAILY_TASK_REGEX);

						if (match) {
							const habitName = extractHabitName(line.text);
							if (habitName) {
								const isRunning = timerState !== null && timerState.habitName === habitName;
								const elapsed = isRunning ? Date.now() - timerState!.startTime : 0;
								const initialSeconds = isRunning ? timerState!.initialSeconds : 0;
								const targetMinutes = isRunning ? timerState!.targetMinutes : null;

								builder.add(
									line.to,
									line.to,
									Decoration.widget({
										widget: new TimerButtonWidget({
											lineText: line.text,
											habitName,
											isRunning,
											elapsedDisplay: formatElapsedDisplay(elapsed, initialSeconds, targetMinutes),
											onStart: deps.onStart,
											onStop: deps.onStop,
										}),
										side: 1,
									})
								);
							}
						}
						pos = line.to + 1;
					}
				}

				return builder.finish();
			}
		},
		{
			decorations: (v) => v.decorations,
		}
	);
}
