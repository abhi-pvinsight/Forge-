const rawUrl = ("http://127.0.0.1:8000").trim();
export const API_BASE_URL = rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
