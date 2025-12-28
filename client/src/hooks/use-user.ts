import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "@/lib/queryClient";

// 3-month free trial period (90 days in milliseconds)
const TRIAL_PERIOD_MS = 90 * 24 * 60 * 60 * 1000;

export function useUser() {
    const { data: rawUser, isLoading, error } = useQuery({
        queryKey: ["/api/auth/me"],
        queryFn: async () => {
            const res = await fetch(`${getApiBaseUrl()}/api/auth/me`);
            if (!res.ok) {
                if (res.status === 401) return null;
                throw new Error("Failed to fetch user");
            }
            return res.json();
        },
    });

    // Apply 3-month free trial logic based on account creation date
    const user = rawUser ? (() => {
        // Get createdAt timestamp - check both camelCase and snake_case
        const createdAtValue = rawUser.createdAt || rawUser.created_at;
        const createdAtTime = createdAtValue ? new Date(createdAtValue).getTime() : null;

        // Calculate if within 90 days of account creation
        const isWithinTrial = createdAtTime
            ? (Date.now() - createdAtTime) < TRIAL_PERIOD_MS
            : false;

        const trialEndTime = createdAtTime
            ? createdAtTime + TRIAL_PERIOD_MS
            : null;

        return {
            ...rawUser,
            isTrialActive: isWithinTrial,
            trialEndsAt: trialEndTime ? new Date(trialEndTime).toISOString() : null,
            isPro: rawUser.isPro || isWithinTrial,
        };
    })() : null;

    return { user, isLoading, error };
}

