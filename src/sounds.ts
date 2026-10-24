let sharedCtx: AudioContext | null = null;

// One context for the whole plugin: each new one grabs an output stream that is never released
function audioContext(): AudioContext | null {
	try {
		const Ctor = window.AudioContext || (window as any).webkitAudioContext;
		if (!sharedCtx) sharedCtx = new Ctor();
		void sharedCtx.resume();
		return sharedCtx;
	} catch (e) {
		console.error("Audio context unavailable", e);
		return null;
	}
}

/** Completion jingle: a quick rising pickup landing on a held major chord, with a sparkle on top. */
export function playDingSound() {
	const ctx = audioContext();
	if (!ctx) return;
	try {
		const t0 = ctx.currentTime;

		// pickup G5 C6 E6
		[783.99, 1046.5, 1318.51].forEach((freq, i) => {
			blip(ctx, freq, t0 + i * 0.07, 0.22, 0.26);
		});

		// landing chord C6 E6 G6 over a C5 body, held
		const land = t0 + 0.21;
		[1046.5, 1318.51, 1567.98].forEach((freq, i) => {
			blip(ctx, freq, land, 1.3, 0.2 - i * 0.04, "triangle", 0.03);
		});
		blip(ctx, 523.25, land, 1.3, 0.16, "sine", 0.03);

		// sparkle C7 E7 G7
		[2093, 2637.02, 3135.96].forEach((freq, i) => {
			blip(ctx, freq, land + 0.12 + i * 0.05, 0.4, 0.07, "sine");
		});
	} catch (e) {
		console.error("Audio playback failed", e);
	}
}

/** One note with a plucked envelope. */
function blip(ctx: AudioContext, freq: number, at: number, dur: number, peak: number, type: OscillatorType = "triangle", attack = 0.012) {
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();

	osc.type = type;
	osc.frequency.setValueAtTime(freq, at);

	gain.gain.setValueAtTime(0.0001, at);
	gain.gain.linearRampToValueAtTime(peak, at + attack);
	gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

	osc.connect(gain).connect(ctx.destination);
	osc.start(at);
	osc.stop(at + dur + 0.02);
}

let noiseBuffer: AudioBuffer | null = null;

function noise(ctx: AudioContext): AudioBuffer {
	if (noiseBuffer?.sampleRate === ctx.sampleRate) return noiseBuffer;

	noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
	const data = noiseBuffer.getChannelData(0);
	for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
	return noiseBuffer;
}

/** Filtered-noise sweep between two frequencies. */
function sweepNoise(ctx: AudioContext, at: number, from: number, to: number, dur: number, peak: number) {
	const source = ctx.createBufferSource();
	source.buffer = noise(ctx);

	const band = ctx.createBiquadFilter();
	band.type = "bandpass";
	band.Q.value = 1.2;
	band.frequency.setValueAtTime(from, at);
	band.frequency.exponentialRampToValueAtTime(to, at + dur * 0.95);

	const gain = ctx.createGain();
	gain.gain.setValueAtTime(0.0001, at);
	gain.gain.linearRampToValueAtTime(peak, at + dur * 0.75);
	gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

	source.connect(band).connect(gain).connect(ctx.destination);
	source.start(at);
}

/** Start fanfare: a thump, a rising whoosh and an ascending major arpeggio. */
export function playRocketSound() {
	const ctx = audioContext();
	if (!ctx) return;
	try {
		const t0 = ctx.currentTime;

		const kick = ctx.createOscillator();
		const kickGain = ctx.createGain();
		kick.type = "sine";
		kick.frequency.setValueAtTime(130, t0);
		kick.frequency.exponentialRampToValueAtTime(45, t0 + 0.18);
		kickGain.gain.setValueAtTime(0.0001, t0);
		kickGain.gain.linearRampToValueAtTime(0.6, t0 + 0.01);
		kickGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
		kick.connect(kickGain).connect(ctx.destination);
		kick.start(t0);
		kick.stop(t0 + 0.3);

		sweepNoise(ctx, t0, 400, 3200, 0.4, 0.22);

		// C5 E5 G5 C6, the last one held with its fifth on top
		const arpeggio = [523.25, 659.26, 783.99, 1046.5];
		arpeggio.forEach((freq, i) => {
			const last = i === arpeggio.length - 1;
			const at = t0 + 0.07 + i * 0.09;
			blip(ctx, freq, at, last ? 0.9 : 0.3, 0.3);
			if (last) blip(ctx, freq * 1.5, at, 0.9, 0.12, "sine");
		});
	} catch (e) {
		console.error("Rocket audio playback failed", e);
	}
}

/** Stop: the start fanfare in reverse — descending arpeggio settling on a low landing. */
export function playStopSound() {
	const ctx = audioContext();
	if (!ctx) return;
	try {
		const t0 = ctx.currentTime;

		sweepNoise(ctx, t0, 2400, 300, 0.35, 0.14);

		// C6 G5 E5 C5, the last one held
		const arpeggio = [1046.5, 783.99, 659.26, 523.25];
		arpeggio.forEach((freq, i) => {
			const last = i === arpeggio.length - 1;
			blip(ctx, freq, t0 + i * 0.07, last ? 0.6 : 0.24, 0.26);
		});

		// soft thump as it sets down
		const land = t0 + 0.21;
		const thump = ctx.createOscillator();
		const thumpGain = ctx.createGain();
		thump.type = "sine";
		thump.frequency.setValueAtTime(90, land);
		thump.frequency.exponentialRampToValueAtTime(52, land + 0.2);
		thumpGain.gain.setValueAtTime(0.0001, land);
		thumpGain.gain.linearRampToValueAtTime(0.4, land + 0.015);
		thumpGain.gain.exponentialRampToValueAtTime(0.0001, land + 0.3);
		thump.connect(thumpGain).connect(ctx.destination);
		thump.start(land);
		thump.stop(land + 0.34);
	} catch (e) {
		console.error("Stop audio playback failed", e);
	}
}
