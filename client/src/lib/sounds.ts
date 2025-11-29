// Sound effects utility using Web Audio API

// Create audio context lazily to comply with browser autoplay policies
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
};

// Simple beep function
const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number = 0) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

    gain.gain.setValueAtTime(0.1, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
};

export const playSuccessSound = () => {
    // Ascending major arpeggio
    playTone(523.25, 'sine', 0.1, 0);    // C5
    playTone(659.25, 'sine', 0.1, 0.1);  // E5
    playTone(783.99, 'sine', 0.2, 0.2);  // G5
    playTone(1046.50, 'sine', 0.4, 0.3); // C6
};

export const playAddSound = () => {
    // Pleasant "pop" sound
    playTone(880, 'sine', 0.1, 0);
};

export const playDeleteSound = () => {
    // Descending tone
    playTone(440, 'sine', 0.1, 0);
    playTone(349.23, 'sine', 0.2, 0.1);
};
