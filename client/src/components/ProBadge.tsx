import React from 'react';
import { Crown } from 'lucide-react';

interface ProBadgeProps {
    showDaysLeft?: boolean;
    compact?: boolean;
}

export function ProBadge({ showDaysLeft = false, compact = false }: ProBadgeProps) {
    // Get user from localStorage
    const [user, setUser] = React.useState<any>(null);

    React.useEffect(() => {
        try {
            const stored = localStorage.getItem('user');
            if (stored) {
                setUser(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to parse user:', e);
        }
    }, []);

    if (!user?.isPro) return null;

    const isTrialActive = user?.isTrialActive;
    const trialEndsAt = user?.trialEndsAt;
    const daysLeft = trialEndsAt
        ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        : 0;

    if (compact) {
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${isTrialActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-500'
                }`}>
                {isTrialActive ? '💎' : <Crown className="w-3 h-3" />}
                PRO
            </span>
        );
    }

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isTrialActive ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
            }`}>
            {isTrialActive ? (
                <>
                    <span>💎</span>
                    <span>FREE TRIAL</span>
                    {showDaysLeft && <span className="opacity-70">• {daysLeft}d</span>}
                </>
            ) : (
                <>
                    <Crown className="w-3.5 h-3.5" />
                    <span>PRO</span>
                </>
            )}
        </div>
    );
}
