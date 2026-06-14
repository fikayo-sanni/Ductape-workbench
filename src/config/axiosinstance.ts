import axios, { InternalAxiosRequestConfig } from "axios";
import { isUsingViteApiProxy, resolveApiBaseUrl } from "@/config/apiBaseUrl";

const apiBaseUrl = resolveApiBaseUrl();
if (import.meta.env.DEV) {
  console.info("[Workbench API]", {
    baseURL: apiBaseUrl || "(same-origin via Vite proxy)",
    viteProxy: isUsingViteApiProxy(),
    gatewayTarget: import.meta.env.VITE_API_GATEWAY_TARGET || "http://localhost:4311",
    directApi: import.meta.env.VITE_API_BASE_URL || "(not set)",
  });
}

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Add Authorization Header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      // Remove quotes if present
      const cleanToken = token.replace(/"/g, "");
      config.headers.Authorization = `Bearer ${cleanToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("currentWorkspaceId");

      // Redirect to login page
      if (!window.location.pathname.startsWith('/login')) {
        const returnPath = window.location.pathname + window.location.search;
        window.location.href = `/login?from=${encodeURIComponent(returnPath)}`;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
