import { StateEffect } from "@codemirror/state";

/** Dispatched into editors to make the timer widgets repaint. */
export const timerTickEffect = StateEffect.define<void>();
