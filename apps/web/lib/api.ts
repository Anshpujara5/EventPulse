const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001";

type ApiErrorResponse = {
  message?: string;
};

export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
