import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { UpdateInfo, updateService } from '@/services/UpdateService';

interface UpdateDialogProps {
    manifest: UpdateInfo | null;
    onClose: () => void;
    onSkip?: (version: string) => void;
}

export function UpdateDialog({ manifest, onClose, onSkip }: UpdateDialogProps) {
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    if (!manifest || !manifest.updateAvailable) {
        return null;
    }

    const handleUpdate = async () => {
        if (!manifest.url) {
            setError('Update URL not available');
            return;
        }

        try {
            setDownloading(true);
            setError(null);

            await updateService.downloadAndApplyUpdate(
                manifest.url,
                (p: number) => setProgress(p)
            );

            // Update will trigger app reload
        } catch (err) {
            console.error('UpdateDialog error caught:', err);
            setError(err instanceof Error ? err.message : 'Update failed');
            setDownloading(false);
        }
    };

    const handleSkip = () => {
        if (manifest.version && onSkip) {
            onSkip(manifest.version);
        }
        onClose();
    };

    const isCritical = manifest.critical || false;

    return (
        <AlertDialog open={true} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {isCritical ? '🚨 Critical Update Available' : '✨ Update Available'}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                        <p>
                            A new version ({manifest.version}) is available!
                        </p>
                        {manifest.releaseNotes && (
                            <div className="mt-2 p-3 bg-muted rounded-md">
                                <p className="font-medium text-sm mb-1">What's New:</p>
                                <p className="text-sm">{manifest.releaseNotes}</p>
                            </div>
                        )}
                        {manifest.size && manifest.size > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Download size: {(manifest.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        )}
                        {error && (
                            <div className="mt-2 p-3 bg-destructive/10 text-destructive rounded-md">
                                <p className="text-sm font-medium">Update Failed</p>
                                <p className="text-xs">{error}</p>
                            </div>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {downloading && (
                    <div className="space-y-2">
                        <Progress value={progress} />
                        <p className="text-xs text-center text-muted-foreground">
                            {progress < 100 ? 'Downloading update...' : 'Applying update...'}
                        </p>
                    </div>
                )}

                <AlertDialogFooter>
                    {!isCritical && !downloading && (
                        <Button
                            variant="outline"
                            onClick={handleSkip}
                            disabled={downloading}
                        >
                            Skip This Version
                        </Button>
                    )}
                    {!isCritical && !downloading && (
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={downloading}
                        >
                            Later
                        </Button>
                    )}
                    <Button
                        onClick={handleUpdate}
                        disabled={downloading}
                        className="min-w-24"
                    >
                        {downloading ? 'Updating...' : 'Update Now'}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
