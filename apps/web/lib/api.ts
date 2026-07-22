export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001";

type ApiErrorResponse = {
  message?: string;
};

// Matches every existing local `authHeaders()`/inline construction: reads the
// stored token (or "" if signed out/SSR) and never throws.
export function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("eventpulse_token")
      : null;
  return { Authorization: `Bearer ${token ?? ""}` };
}

// For raw fetch() calls that send a JSON body and don't go through
// apiRequest (which already sets Content-Type itself).
export function getJsonAuthHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", ...getAuthHeaders() };
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = (await response.json()) as T & ApiErrorResponse;

  if (!response.ok) {
    throw new Error(data.message ?? "API request failed");
  }

  return data;
}
