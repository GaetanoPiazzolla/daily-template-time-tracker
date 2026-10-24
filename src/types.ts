export interface TimerState {
	filePath: string;
	lineText: string;
	habitName: string;
	startTime: number;
	initialSeconds: number;
	targetMinutes: number | null;
}

export interface TimedTask {
	habitName: string;
	lineText: string;
	targetMinutes: number | null;
	loggedSeconds: number;
	checked: boolean;
}

const UNCHECKED_TASK_REGEX = /^(\s*[-*+])\s+\[ \]/;
const TIME_FIELD_REGEX = /\[([a-z0-9-]+)-time::\s*([^\]]*)\]/;

export function extractHabitName(lineText: string): string | null {
	if (!lineText.includes("#timed")) return null;
	const match = lineText.match(/- \[[ xX]\]\s+\S+\s+\*{0,2}(.+?)\*{0,2}\s+#timed(?:-\d+)?/);
	if (!match) return null;
	return match[1].trim();
}

export function extractTargetMinutes(lineText: string): number | null {
	const match = lineText.match(/#timed-(\d+)/);
	return match ? parseInt(match[1], 10) : null;
}

export function isTaskChecked(lineText: string): boolean {
	return /^(\s*[-*+])\s+\[[xX]\]/.test(lineText);
}

export function isTaskUnchecked(lineText: string): boolean {
	return UNCHECKED_TASK_REGEX.test(lineText);
}

/** The line with its checkbox ticked, or null if it was not an unchecked task. */
export function checkTaskLine(lineText: string): string | null {
	if (!UNCHECKED_TASK_REGEX.test(lineText)) return null;
	return lineText.replace(UNCHECKED_TASK_REGEX, "$1 [x]");
}

export function habitNameToFieldKey(habitName: string): string {
	return habitName
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "");
}

export function extractExistingSeconds(lineText: string, habitName: string): number {
	const match = lineText.match(TIME_FIELD_REGEX);
	if (!match || match[1] !== habitNameToFieldKey(habitName)) return 0;
	
	const timeStr = match[2];
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

export function formatDuration(totalSeconds: number): string {
	let timeStr = "";
	
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	
	if (hours > 0) timeStr += `${hours}h `;
	if (minutes > 0 || hours > 0) timeStr += `${minutes}m `;
	timeStr += `${seconds}s`;
	
	return timeStr.trim();
}

export function buildTimeField(habitName: string, totalSeconds: number): string {
	return `[${habitNameToFieldKey(habitName)}-time:: ${formatDuration(totalSeconds)}]`;
}

// Keep the field attached to the #timed tag so trailing markers (es. ✅ 2026-01-01) stay last
export function setTimeFieldOnLine(lineText: string, habitName: string, timeField: string): string {
	const existing = lineText.match(TIME_FIELD_REGEX);
	if (existing?.index !== undefined && existing[1] === habitNameToFieldKey(habitName)) {
		const before = lineText.slice(0, existing.index).replace(/ +$/, "");
		return `${before} ${timeField}${lineText.slice(existing.index + existing[0].length)}`;
	}

	const tag = lineText.match(/#timed(?:-\d+)?/);
	if (!tag || tag.index === undefined) return `${lineText} ${timeField}`;
	const at = tag.index + tag[0].length;
	return `${lineText.slice(0, at)} ${timeField}${lineText.slice(at).replace(/^\s+/, " ")}`;
}

export function parseTimedTasks(content: string): TimedTask[] {
	const tasks: TimedTask[] = [];
	for (const lineText of content.split("\n")) {
		const habitName = extractHabitName(lineText);
		if (!habitName) continue;
		tasks.push({
			habitName,
			lineText,
			targetMinutes: extractTargetMinutes(lineText),
			loggedSeconds: extractExistingSeconds(lineText, habitName),
			checked: isTaskChecked(lineText),
		});
	}
	return tasks;
}
