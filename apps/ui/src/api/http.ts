const getResponseCache = new Map<string, unknown>();

async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return {} as T;
  }
  const text = await res.text();
  if (!text.trim()) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

function buildHeaders(): HeadersInit {
  return {
    "content-type": "application/json",
    "cache-control": "no-cache",
    pragma: "no-cache"
  };
}

export async function apiGet<T>(path: string): Promise<T> {
  const reqPath = `/api${path}`;
  const res = await fetch(reqPath, {
    cache: "no-store",
    headers: buildHeaders()
  });

  if (res.status === 304) {
    const cached = getResponseCache.get(path);
    if (cached !== undefined) {
      return cached as T;
    }

    const retry = await fetch(reqPath, {
      cache: "reload",
      headers: buildHeaders()
    });
    if (!retry.ok) {
      throw new Error(`GET ${path} failed: ${retry.status}`);
    }
    const payload = await parseJsonResponse<T>(retry);
    getResponseCache.set(path, payload);
    return payload;
  }

  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status}`);
  }

  const payload = await parseJsonResponse<T>(res);
  getResponseCache.set(path, payload);
  return payload;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    cache: "no-store",
    headers: buildHeaders(),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
  return await parseJsonResponse<T>(res);
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "PUT",
    cache: "no-store",
    headers: buildHeaders(),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PUT ${path} failed: ${res.status} ${text}`);
  }
  return await parseJsonResponse<T>(res);
}
