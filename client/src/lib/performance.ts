
export type DeviceTier = 'low' | 'mid' | 'high';

export const getDeviceTier = (): DeviceTier => {
    // If not in browser (SSR), assume high
    if (typeof navigator === 'undefined') return 'high';

    // 1. Hardware Concurrency (Cores)
    const cores = navigator.hardwareConcurrency || 4;

    // 2. Memory (RAM) - Experimental API
    // @ts-ignore
    const memory = navigator.deviceMemory || 4;

    // 3. User Agent sniffing for low-end keywords (optional fallback)
    const isLowEndUA = /Android Go|LowRAM/i.test(navigator.userAgent);

    if (isLowEndUA || cores < 4 || memory < 2) {
        console.log('[Performance] Low-End Device Detected');
        return 'low';
    }

    if (cores < 6 || memory < 4) {
        return 'mid';
    }

    return 'high';
};

export const shouldEnableBlur = (tier: DeviceTier) => tier !== 'low';
export const shouldEnableParticles = (tier: DeviceTier) => tier === 'high';
export const shouldEnableHeavyAnimations = (tier: DeviceTier) => tier !== 'low';
