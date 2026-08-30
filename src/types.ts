export interface TimerState {
	filePath: string;
	lineText: string;
	habitName: string;
	startTime: number;
	initialSeconds: number;
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

export function extractExistingSeconds(lineText: string, habitName: string): number {
	const key = habitNameToFieldKey(habitName);
	const regex = new RegExp(`\\[${key}-time::\\s*(.*?)\\]`);
	const match = lineText.match(regex);
	if (!match) return 0;
	
	const timeStr = match[1];
	let totalSeconds = 0;
	
	const hMatch = timeStr.match(/(\d+)h/);
	if (hMatch) totalSeconds += parseInt(hMatch[1], 10) * 3600;
	
	const mMatch = timeStr.match(/(\d+)m/);
	if (mMatch) totalSeconds += parseInt(mMatch[1], 10) * 60;
	
	const sMatch = timeStr.match(/(\d+)s/);
	if (sMatch) totalSeconds += parseInt(sMatch[1], 10);
	
	if (totalSeconds === 0 && /^\d+$/.test(timeStr.trim())) {
		totalSeconds = parseInt(timeStr.trim(), 10) * 60;
	}
	
	return totalSeconds;
}

export function formatElapsedDisplay(ms: number, initialSeconds: number = 0, targetMinutes: number | null = null): string {
	const totalSeconds = Math.floor(ms / 1000) + initialSeconds;
	
	if (targetMinutes !== null) {
		const targetSeconds = targetMinutes * 60;
		const remainingSeconds = targetSeconds - totalSeconds;
		if (remainingSeconds > 0) {
			const rMin = Math.floor(remainingSeconds / 60);
			const rSec = remainingSeconds % 60;
			return `-${String(rMin).padStart(2, "0")}:${String(rSec).padStart(2, "0")}`;
		} else {
			const overSeconds = Math.abs(remainingSeconds);
			const oMin = Math.floor(overSeconds / 60);
			const oSec = overSeconds % 60;
			return `+${String(oMin).padStart(2, "0")}:${String(oSec).padStart(2, "0")}`;
		}
	}
	
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function buildTimeField(habitName: string, totalSeconds: number): string {
	const key = habitNameToFieldKey(habitName);
	let timeStr = "";
	
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	
	if (hours > 0) timeStr += `${hours}h `;
	if (minutes > 0 || hours > 0) timeStr += `${minutes}m `;
	timeStr += `${seconds}s`;
	
	return `[${key}-time:: ${timeStr.trim()}]`;
}
