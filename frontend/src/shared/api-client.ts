import axios from "axios";
import { supabase } from "./auth";
import { getGlobalAuthContext } from "./auth-context-global";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
});

// Request interceptor: tambahkan JWT ke header Authorization
apiClient.interceptors.request.use(async (config) => {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    // Tidak ada sesi aktif → tolak request sebelum dikirim
    return Promise.reject(
      new Error("Tidak ada sesi autentikasi aktif. Silakan login terlebih dahulu."),
    );
  }

  config.headers.Authorization = `Bearer ${data.session.access_token}`;
  return config;
});

// Response interceptor: tangani HTTP 401 dengan sign out dan redirect context-aware
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isPublicAuthRoute = ["/login", "/signup", "/internal/login"].some(
      (path) => window.location.pathname === path,
    );
    if (error.response?.status === 401 && !isPublicAuthRoute) {
      await supabase.auth.signOut();
      const ctx = getGlobalAuthContext();
      window.location.href = ctx === "personnel" ? "/internal/login" : "/";
    }
    return Promise.reject(error);
  },
);

export default apiClient;
