export interface TimerState {
	filePath: string;
	lineText: string;
	habitName: string;
	startTime: number;
	initialMinutes: number;
	targetMinutes: number | null;
}

export function extractHabitName(lineText: string): string | null {
	const match = lineText.match(/- \[[ xX]\]\s+\S+\s+\*{0,2}(.+?)\*{0,2}\s+#timed(?:-\d+)?/);
	if (!match) return null;
	return match[1].trim();
}

export function extractTargetMinutes(lineText: string): number | null {
	const match = lineText.match(/#timed-(\d+)/);
	return match ? parseInt(match[1], 10) : null;
}

export function habitNameToFieldKey(habitName: string): string {
	return habitName
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "");
}

export function extractExistingMinutes(lineText: string, habitName: string): number {
	const key = habitNameToFieldKey(habitName);
	const regex = new RegExp(`\\[${key}-time::\\s*(\\d+)m?\\]`);
	const match = lineText.match(regex);
	return match ? parseInt(match[1], 10) : 0;
}

export function formatElapsedMinutes(ms: number): number {
	return Math.round(ms / 60000);
}

export function formatElapsedDisplay(ms: number, initialMinutes: number = 0, targetMinutes: number | null = null): string {
	const totalSeconds = Math.floor(ms / 1000) + (initialMinutes * 60);
	
	if (targetMinutes !== null) {
		const targetSeconds = targetMinutes * 60;
		const remainingSeconds = targetSeconds - totalSeconds;
		if (remainingSeconds > 0) {
			const rMin = Math.floor(remainingSeconds / 60);
			const rSec = remainingSeconds % 60;
			return `-${String(rMin).padStart(2, "0")}:${String(rSec).padStart(2, "0")}`;
		} else {
			return "00:00"; // Reached
		}
	}
	
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function buildTimeField(habitName: string, minutes: number): string {
	const key = habitNameToFieldKey(habitName);
	return `[${key}-time:: ${minutes}m]`;
}
