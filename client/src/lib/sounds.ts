// Sound effects utility using Web Audio API

// Create audio context lazily to comply with browser autoplay policies
let audioContext: AudioContext | null = null;
let soundsEnabled = true;

const getAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
};

// Check if sounds are enabled
const checkEnabled = () => {
    const saved = localStorage.getItem('sounds_enabled');
    return saved !== 'false';
};

// Simple beep function
const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number = 0) => {
    if (!checkEnabled()) return;
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

export const playCelebrationSound = () => {
    // Party celebration - ascending arpeggio
    playTone(523.25, 'sine', 0.15, 0);    // C5
    playTone(659.25, 'sine', 0.15, 0.1);  // E5
    playTone(783.99, 'sine', 0.15, 0.2);  // G5
    playTone(1046.50, 'sine', 0.3, 0.3);  // C6
    playTone(1318.51, 'sine', 0.4, 0.4);  // E6
};

export const playAlarmSound = () => {
    if (!checkEnabled()) return;
    const selectedAlarm = localStorage.getItem('selected_alarm') || 'alarm1';

    switch (selectedAlarm) {
        case 'alarm1':
            playAlarm1();
            break;
        case 'alarm2':
            playAlarm2();
            break;
        case 'alarm3':
            playAlarm3();
            break;
        case 'alarm4':
            playAlarm4();
            break;
        case 'alarm5':
            playAlarm5();
            break;
        case 'alarm6':
            playAlarm6();
            break;
        case 'alarm7':
            playAlarm7();
            break;
        case 'alarm8':
            playAlarm8();
            break;
        case 'alarm9':
            playAlarm9();
            break;
        case 'alarm10':
            playAlarm10();
            break;
        default:
            playAlarm1();
    }
};

// Alarm 1: Classic Beep-Beep
const playAlarm1 = () => {
    const beep = () => playTone(880, 'square', 0.3, 0);
    beep();
    setTimeout(beep, 400);
    setTimeout(beep, 800);
};

// Alarm 2: Rising Siren
const playAlarm2 = () => {
    playTone(600, 'square', 0.4, 0);
    playTone(800, 'square', 0.4, 0.2);
    playTone(1000, 'square', 0.4, 0.4);
};

// Alarm 3: Urgent Pulse
const playAlarm3 = () => {
    for (let i = 0; i < 5; i++) {
        playTone(1200, 'square', 0.1, i * 0.15);
    }
};

// Alarm 4: Gentle Chime
const playAlarm4 = () => {
    playTone(1046.50, 'sine', 0.3, 0);   // C6
    playTone(1318.51, 'sine', 0.3, 0.3); // E6
    playTone(1567.98, 'sine', 0.5, 0.6); // G6
};

// Alarm 5: Digital Watch
const playAlarm5 = () => {
    playTone(1000, 'square', 0.15, 0);
    playTone(1000, 'square', 0.15, 0.2);
    playTone(1000, 'square', 0.15, 0.4);
    playTone(1000, 'square', 0.15, 0.6);
};

// Alarm 6: Bell Tone
const playAlarm6 = () => {
    playTone(987.77, 'sine', 0.5, 0);    // B5
    playTone(1174.66, 'sine', 0.5, 0.3); // D6
    playTone(1318.51, 'sine', 0.7, 0.6); // E6
};

// Alarm 7: Two-Tone
const playAlarm7 = () => {
    playTone(800, 'square', 0.3, 0);
    playTone(600, 'square', 0.3, 0.35);
    playTone(800, 'square', 0.3, 0.7);
    playTone(600, 'square', 0.3, 1.05);
};

// Alarm 8: Rapid Fire
const playAlarm8 = () => {
    for (let i = 0; i < 8; i++) {
        playTone(1500, 'square', 0.08, i * 0.1);
    }
};

// Alarm 9: Melodic Wake
const playAlarm9 = () => {
    playTone(523.25, 'sine', 0.25, 0);    // C5
    playTone(587.33, 'sine', 0.25, 0.25); // D5
    playTone(659.25, 'sine', 0.25, 0.5);  // E5
    playTone(783.99, 'sine', 0.5, 0.75);  // G5
};

// Alarm 10: Triple Beep
const playAlarm10 = () => {
    playTone(1100, 'square', 0.2, 0);
    playTone(1100, 'square', 0.2, 0.3);
    playTone(1100, 'square', 0.4, 0.6);
};

export const alarmSounds = [
    { id: 'alarm1', name: 'Classic Beep' },
    { id: 'alarm2', name: 'Rising Siren' },
    { id: 'alarm3', name: 'Urgent Pulse' },
    { id: 'alarm4', name: 'Gentle Chime' },
    { id: 'alarm5', name: 'Digital Watch' },
    { id: 'alarm6', name: 'Bell Tone' },
    { id: 'alarm7', name: 'Two-Tone' },
    { id: 'alarm8', name: 'Rapid Fire' },
    { id: 'alarm9', name: 'Melodic Wake' },
    { id: 'alarm10', name: 'Triple Beep' }
];

export const setAlarmSound = (alarmId: string) => {
    localStorage.setItem('selected_alarm', alarmId);
};

export const getSelectedAlarm = () => {
    return localStorage.getItem('selected_alarm') || 'alarm1';
};

export const previewAlarm = (alarmId: string) => {
    const wasEnabled = checkEnabled();
    localStorage.setItem('sounds_enabled', 'true');

    const temp = localStorage.getItem('selected_alarm');
    localStorage.setItem('selected_alarm', alarmId);
    playAlarmSound();
    if (temp) {
        localStorage.setItem('selected_alarm', temp);
    }

    if (!wasEnabled) {
        setTimeout(() => localStorage.setItem('sounds_enabled', 'false'), 100);
    }
};

export const playClickSound = () => {
    playTone(800, 'sine', 0.05, 0);
};

export const playNotificationSound = () => {
    playTone(900, 'sine', 0.2, 0);
    playTone(1100, 'sine', 0.2, 0.15);
};

export const setSoundsEnabled = (enabled: boolean) => {
    soundsEnabled = enabled;
    localStorage.setItem('sounds_enabled', String(enabled));
};

export const areSoundsEnabled = () => {
    return checkEnabled();
};

export const previewSound = (soundName: 'success' | 'alarm' | 'celebration' | 'click' | 'notification') => {
    const wasEnabled = checkEnabled();
    localStorage.setItem('sounds_enabled', 'true');

    switch (soundName) {
        case 'success':
            playSuccessSound();
            break;
        case 'alarm':
            playAlarmSound();
            break;
        case 'celebration':
            playCelebrationSound();
            break;
        case 'click':
            playClickSound();
            break;
        case 'notification':
            playNotificationSound();
            break;
    }

    if (!wasEnabled) {
        setTimeout(() => localStorage.setItem('sounds_enabled', 'false'), 100);
    }
};
