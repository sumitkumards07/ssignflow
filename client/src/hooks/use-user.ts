import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "@/lib/queryClient";

export function useUser() {
    const { data: user, isLoading, error } = useQuery({
        queryKey: ["/api/user"],
        queryFn: async () => {
            const res = await fetch(`${getApiBaseUrl()}/api/user`);
            if (!res.ok) {
                if (res.status === 401) return null;
                throw new Error("Failed to fetch user");
            }
            return res.json();
        },
    });

    return { user, isLoading, error };
}
