import React, { useState, useEffect } from 'react';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

interface UpdateModalProps {
    version: string;
    updateUrl: string;
    onComplete: () => void;
}

export function UpdateModal({ version, updateUrl, onComplete }: UpdateModalProps) {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'checking' | 'downloading' | 'installing' | 'restarting' | 'error'>('checking');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        startUpdate();
    }, []);

    const startUpdate = async () => {
        try {
            setStatus('downloading');

            // Listen for download progress
            CapacitorUpdater.addListener('download', (info) => {
                const percent = Math.round(info.percent);
                setProgress(percent);
            });

            // Download the bundle
            const bundle = await CapacitorUpdater.download({
                url: updateUrl,
                version: version
            });

            setStatus('installing');
            setProgress(100);

            // Set the bundle as next version
            await CapacitorUpdater.set(bundle);

            setStatus('restarting');

            // Short delay before reload
            setTimeout(async () => {
                await CapacitorUpdater.reload();
                onComplete();
            }, 1500);

        } catch (e: any) {
            console.error('Update failed:', e);
            setError(e.message || 'Update failed');
            setStatus('error');

            // Retry after 3 seconds
            setTimeout(() => {
                setError(null);
                startUpdate();
            }, 3000);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-80 rounded-3xl bg-card border border-border p-6 shadow-2xl mx-4">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                        {status === 'error' ? (
                            <span className="text-3xl">⚠️</span>
                        ) : status === 'restarting' ? (
                            <span className="text-3xl">✅</span>
                        ) : (
                            <span className="text-3xl">⬇️</span>
                        )}
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-center text-foreground mb-2">
                    {status === 'checking' && 'Checking Update...'}
                    {status === 'downloading' && 'Downloading Update'}
                    {status === 'installing' && 'Installing Update'}
                    {status === 'restarting' && 'Restarting App'}
                    {status === 'error' && 'Update Error'}
                </h2>

                {/* Version */}
                <p className="text-center text-muted-foreground text-sm mb-4">
                    Version {version}
                </p>

                {/* Progress Bar */}
                {status !== 'error' && (
                    <div className="mb-4">
                        <div className="h-3 bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-center text-lg font-bold text-primary mt-2">
                            {progress}%
                        </p>
                    </div>
                )}

                {/* Status Text */}
                <p className="text-center text-sm text-muted-foreground">
                    {status === 'downloading' && 'Please wait while the update downloads...'}
                    {status === 'installing' && 'Installing update...'}
                    {status === 'restarting' && 'App will restart momentarily...'}
                    {status === 'error' && (
                        <>
                            <span className="text-destructive">{error}</span>
                            <br />
                            <span className="text-xs">Retrying automatically...</span>
                        </>
                    )}
                </p>

                {/* Loading Spinner for non-error states */}
                {status !== 'error' && status !== 'restarting' && (
                    <div className="flex justify-center mt-4">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}
