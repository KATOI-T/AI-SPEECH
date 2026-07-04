const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  detail: string;
  status: number;

  constructor(detail: string, status: number) {
    super(`API Error ${status}: ${detail}`);
    this.name = "ApiError";
    this.detail = detail;
    this.status = status;
  }
}

function extractDetail(raw: string): string {
  try {
    const body = JSON.parse(raw);
    if (typeof body === "string") return body;
    if (body && typeof body.detail === "string") return body.detail;
    if (body && Array.isArray(body.detail)) {
      return body.detail
        .map((d: { loc?: unknown[]; msg?: string }) =>
          `${Array.isArray(d.loc) ? d.loc.join(".") : ""}: ${d.msg ?? ""}`.trim()
        )
        .join("; ");
    }
    return raw;
  } catch {
    return raw;
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new ApiError(extractDetail(raw), response.status);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = void>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new ApiError(extractDetail(raw), response.status);
    }

    // レスポンスボディがある場合はパースして返す
    const text = await response.text();
    if (text) {
      return JSON.parse(text) as T;
    }
    return undefined as T;
  }
}

export const apiClient = new ApiClient();
