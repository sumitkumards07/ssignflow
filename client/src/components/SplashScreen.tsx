import { useEffect, useState } from 'react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        // Immediately detect theme from localStorage or system preference
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('theme');
            if (stored === 'dark' || stored === 'light') {
                return stored;
            }
            // Check system preference
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
        }
        return 'light';
    });

    useEffect(() => {
        // Double-check theme after mount
        const isDark = document.documentElement.classList.contains('dark') ||
            window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(isDark ? 'dark' : 'light');

        // Auto-close splash after very short time
        const timer = setTimeout(() => {
            onComplete();
        }, 500); // Reduced to 500ms

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center ${theme === 'dark' ? 'bg-zinc-950' : 'bg-white'
                }`}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
            }}
        >
            <div>
                <img
                    src="/logo.png"
                    alt="AssignFlow Logo"
                    className="w-32 h-32 object-contain"
                />
            </div>
        </div>
    );
}
