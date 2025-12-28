import React, { createContext, useContext, useEffect, useState } from "react";

export const themeColors = {
    // Functional
    orange: { primary: "#FF9500", primaryRgb: "255, 149, 0", name: "Safety Orange" },
    green: { primary: "#34C759", primaryRgb: "52, 199, 89", name: "Success Green" },
    red: { primary: "#FF3B30", primaryRgb: "255, 59, 48", name: "Destructive Red" },
    blue: { primary: "#007AFF", primaryRgb: "0, 122, 255", name: "System Blue" },
    indigo: { primary: "#5856D6", primaryRgb: "88, 86, 214", name: "Intel Indigo" },
    yellow: { primary: "#FFCC00", primaryRgb: "255, 204, 0", name: "Warning Gold" },

    // Prestige
    purple: { primary: "#AF52DE", primaryRgb: "175, 82, 222", name: "Epic Purple" },
    magenta: { primary: "#FF2D55", primaryRgb: "255, 45, 85", name: "Mythic Magenta" },
    mint: { primary: "#00D1FF", primaryRgb: "0, 209, 255", name: "Cyber Mint" },
    gray: { primary: "#1C1C1E", primaryRgb: "28, 28, 30", name: "Obsidian Gray" },
    teal: { primary: "#30B0C7", primaryRgb: "48, 176, 199", name: "Prismatic Teal" },
    rose: { primary: "#FF5E3A", primaryRgb: "255, 94, 58", name: "Lava Rose" },
};

export type ThemeColor = keyof typeof themeColors;

interface ThemeColorContextType {
    themeColor: ThemeColor;
    setThemeColor: (color: ThemeColor) => void;
}

const ThemeColorContext = createContext<ThemeColorContextType>({
    themeColor: "orange",
    setThemeColor: () => { }
});

export const useThemeColor = () => useContext(ThemeColorContext);

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
    const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
        const saved = localStorage.getItem("accent_color");
        return (themeColors.hasOwnProperty(saved as string) ? (saved as ThemeColor) : "orange");
    });

    const setThemeColor = (color: ThemeColor) => {
        setThemeColorState(color);
        localStorage.setItem("accent_color", color);
        applyThemeColor(color);
    };

    const applyThemeColor = (color: ThemeColor) => {
        const colorData = themeColors[color];
        if (!colorData) return;
        document.documentElement.style.setProperty("--theme-primary", colorData.primary);
        document.documentElement.style.setProperty("--theme-primary-rgb", colorData.primaryRgb);
        // Also update the global safety-orange variable if the user selected it as accent? 
        // No, let's keep semantic names.
    };

    useEffect(() => {
        applyThemeColor(themeColor);
    }, [themeColor]);

    return (
        <ThemeColorContext.Provider value={{ themeColor, setThemeColor }}>
            {children}
        </ThemeColorContext.Provider>
    );
}
