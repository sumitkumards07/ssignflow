import React from 'react';

/**
 * Silicon Valley Standard 12-Color Palette
 * Unified Design System (UDS) for AssignFlow
 */

export const COLORS = {
    // Functional Core
    safetyOrange: "#FF9500", // Focus, Core Brand
    systemBlue: "#007AFF",   // Analytics, Interactive
    successGreen: "#34C759", // Accomplished, Missions
    destructiveRed: "#FF3B30", // Danger, Stop, Warning
    intelIndigo: "#5856D6",  // Todo, Tasks
    warningGold: "#FFCC00",  // Alerts, Crates

    // Prestige & Rarity Core
    epicPurple: "#AF52DE",   // Elite, Epic items
    mythicMagenta: "#FF2D55", // Top 1%, Mythic items
    cyberMint: "#00D1FF",    // Rare, Tactical items
    obsidianGray: "#1C1C1E", // Common, Neutral
    prismaticTeal: "#30B0C7", // Seasonal, Tracking
    lavaRose: "#FF5E3A",     // Hardcore, Hot Zones
    actionGreen: "#39FF14",  // Gaming-Action, Neon
};

export const COLOR_MAP = {
    focus: COLORS.safetyOrange,
    analytics: COLORS.systemBlue,
    achievement: COLORS.successGreen,
    alert: COLORS.destructiveRed,
    task: COLORS.intelIndigo,
    reward: COLORS.warningGold,
    elite: COLORS.epicPurple,
    mythic: COLORS.mythicMagenta,
    rare: COLORS.cyberMint,
    common: COLORS.obsidianGray,
    milestone: COLORS.prismaticTeal,
    intensive: COLORS.lavaRose,
};

export type ThemeColor = keyof typeof COLORS;
export type SemanticColor = keyof typeof COLOR_MAP;

export const getPtsLabel = (pts: number) => {
    return (
        <span className="sf-mono" >
            {pts} < span className="opacity-40 font-normal" > PTS </span>
        </span>
    );
};
