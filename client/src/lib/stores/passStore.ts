// src/lib/stores/passStore.ts
import { create } from 'zustand';

interface PassState {
    xp: number;
    currentLevel: number;
    claimedRewardIds: number[]; // using reward level as id
    claimReward: (lvl: number) => void;
    setXp: (xp: number) => void;
    setLevel: (level: number) => void;
}

export const usePassStore = create<PassState>((set, get) => ({
    xp: Number(localStorage.getItem('user_xp') || '0'),
    currentLevel: Number(localStorage.getItem('user_level') || '1'),
    claimedRewardIds: JSON.parse(localStorage.getItem('claimed_rewards') || '[]'),
    claimReward: (lvl) => {
        const { claimedRewardIds, xp } = get();
        if (!claimedRewardIds.includes(lvl)) {
            const newIds = [...claimedRewardIds, lvl];
            set({ claimedRewardIds: newIds });
            localStorage.setItem('claimed_rewards', JSON.stringify(newIds));
        }
        // Example: reward gives 250 XP per claim
        const newXp = xp + 250;
        set({ xp: newXp });
        localStorage.setItem('user_xp', String(newXp));
        // Update level based on new XP (simple example)
        const newLevel = Math.floor(newXp / 1000) + 1;
        set({ currentLevel: newLevel });
        localStorage.setItem('user_level', String(newLevel));
    },
    setXp: (xp) => {
        set({ xp });
        localStorage.setItem('user_xp', String(xp));
    },
    setLevel: (level) => {
        set({ currentLevel: level });
        localStorage.setItem('user_level', String(level));
    },
}));
