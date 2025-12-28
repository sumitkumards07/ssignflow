import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';

export function OfflineIndicator() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <AnimatePresence>
            {isOffline && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="fixed bottom-[90px] left-0 right-0 z-[150] flex justify-center pointer-events-none px-4"
                >
                    <div className="bg-zinc-900/90 backdrop-blur-md border border-red-500/50 text-red-500 px-4 py-3 rounded-full shadow-2xl flex items-center gap-3 pointer-events-auto">
                        <div className="relative">
                            <WifiOff className="w-4 h-4" />
                            <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Connection Lost</span>
                            <span className="text-[9px] font-medium text-red-400/80 leading-none mt-1">Offline Mode Active</span>
                        </div>
                        <div className="h-4 w-[1px] bg-red-500/20 mx-1" />
                        <RefreshCw className="w-3 h-3 animate-spin text-red-500/50" style={{ animationDuration: '3s' }} />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
