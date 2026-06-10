import axios from "axios";
import { attachCsrfHeader, captureCsrfTokenFromResponse } from "@/lib/csrf";
import { handleUnauthorized } from "@/lib/session";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers = attachCsrfHeader(
      config.headers as Record<string, unknown>,
      config.method,
    ) as typeof config.headers;

    return config;
  },
  (error) => Promise.reject(error),
);

instance.interceptors.response.use(
  (res) => {
    captureCsrfTokenFromResponse(res.headers as Record<string, unknown>);
    return res;
  },
  (error) => {
    if (error.response?.status === 401 && !(error.config as { skipAuthRedirect?: boolean })?.skipAuthRedirect) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  },
);

export default instance;