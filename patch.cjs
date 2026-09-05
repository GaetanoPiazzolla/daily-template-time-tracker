const fs = require('fs');
const path = './src/main.ts';
let content = fs.readFileSync(path, 'utf8');

const soundFunction = `
function playDingSound() {
	try {
		const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
		const ctx = new AudioContext();
		
		const osc = ctx.createOscillator();
		const gainNode = ctx.createGain();
		
		osc.type = "sine";
		osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
		
		osc.connect(gainNode);
		gainNode.connect(ctx.destination);
		
		gainNode.gain.setValueAtTime(0, ctx.currentTime);
		gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05);
		gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);
		
		osc.start(ctx.currentTime);
		osc.stop(ctx.currentTime + 2);
		
		const osc2 = ctx.createOscillator();
		const gainNode2 = ctx.createGain();
		
		osc2.type = "sine";
		osc2.frequency.setValueAtTime(1760, ctx.currentTime); // A6 note
		
		osc2.connect(gainNode2);
		gainNode2.connect(ctx.destination);
		
		gainNode2.gain.setValueAtTime(0, ctx.currentTime);
		gainNode2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
		gainNode2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
		
		osc2.start(ctx.currentTime);
		osc2.stop(ctx.currentTime + 1);
	} catch (e) {
		console.error("Audio playback failed", e);
	}
}
`;

// Insert the function before the class definition
content = content.replace('export default class DailyTemplateTimeTracker', soundFunction + '\nexport default class DailyTemplateTimeTracker');

// Insert the call inside autoCheckCurrentTask
const target = 'new Notice(`✅ Obiettivo raggiunto: ${targetHabitName} completato!`);';
content = content.replace(target, target + '\n						playDingSound();');

fs.writeFileSync(path, content);
