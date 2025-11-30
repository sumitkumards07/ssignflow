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
    const baseUrl = "https://assignflow-exuc.onrender.com";
    const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

    const res = await fetch(fullUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body,
      credentials: "include",
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
      const baseUrl = "https://assignflow-exuc.onrender.com";
      const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

      try {
        const res = await fetch(fullUrl, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
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
