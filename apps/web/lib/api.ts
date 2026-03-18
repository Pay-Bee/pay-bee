import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      try {
        await axios.post(
          `${API_BASE}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        return api(err.config);
      } catch {
        if (typeof window !== "undefined") {
          const isAuthCheck = err.config?.url?.includes("/auth/me");
          const onAuthPage =
            window.location.pathname === "/login" ||
            window.location.pathname === "/register";
          if (!isAuthCheck && !onAuthPage) {
            window.location.href = "/login";
          }
        }
      }
    }
    return Promise.reject(err);
  },
);

export default api;
