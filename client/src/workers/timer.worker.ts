/* eslint-disable no-restricted-globals */

// Define the message types
type TimerMessage =
    | { type: 'START'; timeLeft: number; totalTime: number }
    | { type: 'PAUSE' }
    | { type: 'RESUME' }
    | { type: 'RESET'; customMinutes: number };

type WorkerResponse =
    | { type: 'TICK'; timeLeft: number; progress: number }
    | { type: 'COMPLETE' };

let timerInterval: NodeJS.Timeout | null = null;
let timeLeft = 0;
let totalTime = 0;
let isRunning = false;

self.onmessage = (e: MessageEvent<TimerMessage>) => {
    const { type } = e.data;

    switch (type) {
        case 'START':
            timeLeft = e.data.timeLeft;
            totalTime = e.data.totalTime;
            startTimer();
            break;
        case 'PAUSE':
            stopTimer();
            break;
        case 'RESUME':
            startTimer();
            break;
        case 'RESET':
            stopTimer();
            timeLeft = e.data.customMinutes * 60;
            totalTime = e.data.customMinutes * 60;
            postProgress(); // Reset UI immediately
            break;
    }
};

function startTimer() {
    if (isRunning) return;
    isRunning = true;

    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            postProgress();
        } else {
            completeTimer();
        }
    }, 1000);
}

function stopTimer() {
    isRunning = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function completeTimer() {
    stopTimer();
    self.postMessage({ type: 'COMPLETE' });
}

function postProgress() {
    const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
    self.postMessage({
        type: 'TICK',
        timeLeft: timeLeft,
        progress: progress
    });
}

// Export empty to make it a module
export { };
