import React, { createContext, useContext, useEffect, useState } from "react";

export const themeColors = {
    orange: { primary: "#ff6b35", primaryRgb: "255, 107, 53" },
    purple: { primary: "#a855f7", primaryRgb: "168, 85, 247" },
    blue: { primary: "#3b82f6", primaryRgb: "59, 130, 246" },
    green: { primary: "#10b981", primaryRgb: "16, 185, 129" },
    rose: { primary: "#f43f5e", primaryRgb: "244, 63, 94" },
    teal: { primary: "#14b8a6", primaryRgb: "20, 184, 166" }
};

type ThemeColor = keyof typeof themeColors;

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
        return (saved as ThemeColor) || "orange";
    });

    const setThemeColor = (color: ThemeColor) => {
        setThemeColorState(color);
        localStorage.setItem("accent_color", color);
        applyThemeColor(color);
    };

    const applyThemeColor = (color: ThemeColor) => {
        const colorData = themeColors[color];
        document.documentElement.style.setProperty("--theme-primary", colorData.primary);
        document.documentElement.style.setProperty("--theme-primary-rgb", colorData.primaryRgb);
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
