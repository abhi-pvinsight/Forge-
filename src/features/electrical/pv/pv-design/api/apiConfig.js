const rawUrl = ("http://172.30.10.112:8000").trim();
export const API_BASE_URL = rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
