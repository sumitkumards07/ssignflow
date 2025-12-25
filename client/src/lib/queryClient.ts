import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const clonedRes = res.clone();
      const text = await clonedRes.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          errorMessage = json.message || json.error || text;
        } catch {
          errorMessage = text.length > 100 ? text.substring(0, 100) + "..." : text;
        }
      }
    } catch (error) {
      console.error("Error reading error response:", error);
    }
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

// Safe JSON parsing utility - use this instead of res.json()
export async function safeParseJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON response:", text.substring(0, 200));
    throw new Error(`Server Error: ${text.substring(0, 100)}...`);
  }
}

// Get API base URL - use this for direct fetch calls (not using apiRequest)
export function getApiBaseUrl(): string {
  // Use environment variable for API base URL
  // For Capacitor (mobile) apps, VITE_API_BASE_URL should be set to the server IP
  return import.meta.env.VITE_API_BASE_URL || "";
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  let body: string | undefined = undefined;

  if (data) {
    try {
      body = JSON.stringify(data);
    } catch (error) {
      console.error("Error stringifying request data:", error);
      throw new Error("Invalid data format. Please check your input.");
    }
  }

  try {
    const baseUrl = getApiBaseUrl();
    const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

    // Get token from localStorage
    const userStr = localStorage.getItem("user");
    let token = "";
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.apiToken || "";
      } catch (e) {
        console.error("Error parsing user from localStorage", e);
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(fullUrl, {
      method,
      headers,
      body,
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error("Network error:", error);
      throw new Error("Unable to connect to server. Please check your internet connection.");
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred while making request");
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const url = queryKey.join("/") as string;
      const baseUrl = getApiBaseUrl();
      const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

      // Get token from localStorage
      const userStr = localStorage.getItem("user");
      let token = "";
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          token = user.apiToken || "";
        } catch (e) {
          console.error("Error parsing user from localStorage", e);
        }
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      try {
        const res = await fetch(fullUrl, {
          headers,
        });

        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
          return null;
        }

        await throwIfResNotOk(res);

        const contentType = res.headers.get("content-type");
        const isJson = contentType && contentType.includes("application/json");

        try {
          const text = await res.text();
          if (!text || text.trim() === "") {
            console.warn("Empty response from server");
            return null;
          }

          if (isJson) {
            try {
              return JSON.parse(text);
            } catch (parseError) {
              console.error("Error parsing JSON response:", parseError, "Response:", text.substring(0, 200));
              throw new Error(`Invalid JSON response from server`);
            }
          } else {
            if (text.trim().startsWith("<")) {
              console.error("Received HTML instead of JSON:", text.substring(0, 200));
              throw new Error("Server returned an error page. Please try again.");
            }
            try {
              return JSON.parse(text);
            } catch {
              throw new Error("Server returned invalid response format");
            }
          }
        } catch (parseError) {
          console.error("Error parsing response:", parseError);
          if (parseError instanceof Error && parseError.message.includes("Invalid JSON")) {
            throw parseError;
          }
          throw new Error(`Invalid response from server: ${parseError instanceof Error ? parseError.message : "Unknown error"}`);
        }
      } catch (error) {
        if (error instanceof TypeError && (error.message.includes("fetch") || error.message.includes("network"))) {
          console.error("Network error:", error);
          throw new Error("Unable to connect to server. Please check your internet connection.");
        }
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Unknown error occurred while fetching data");
      }
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
