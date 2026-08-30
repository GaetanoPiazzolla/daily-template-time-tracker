export interface TimerState {
	filePath: string;
	lineText: string;
	habitName: string;
	startTime: number;
}

export function extractHabitName(lineText: string): string | null {
	const match = lineText.match(/- \[.\]\s+\S+\s+\*{0,2}(.+?)\*{0,2}\s+#daily/);
	if (!match) return null;
	return match[1].trim();
}

export function habitNameToFieldKey(habitName: string): string {
	return habitName
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "");
}

export function formatElapsedMinutes(ms: number): number {
	return Math.max(1, Math.round(ms / 60000));
}

export function formatElapsedDisplay(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function buildTimeField(habitName: string, minutes: number): string {
	const key = habitNameToFieldKey(habitName);
	return `[${key}-time:: ${minutes}m]`;
}
