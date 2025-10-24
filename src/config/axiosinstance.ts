import axios, { InternalAxiosRequestConfig } from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
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
    // Handle 401 responses - uncomment when logout is implemented
    // if (error.response?.status === 401) {
    //   localStorage.removeItem("token");
    //   localStorage.removeItem("user");
    //   window.location.href = "/";
    // }
    return Promise.reject(error);
  }
);

export default apiClient;
