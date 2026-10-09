import { BrowserRouter } from "react-router-dom";
import AuthContextProvider from "../shared/auth-context";
import { Guard } from "./Guard";
import { AppRoutes } from "./routes";

/**
 * Root komponen aplikasi Dewa Jam.
 *
 * Lapisan pembungkus (dari luar ke dalam):
 * 1. AuthContextProvider — menyediakan state dan konteks auth (customer vs personnel)
 * 2. BrowserRouter       — menyediakan konteks routing HTML5 history
 * 3. Guard               — memeriksa sesi Supabase dan otorisasi role per navigasi (lazy/hard)
 * 4. AppRoutes           — definisi semua rute (lazy-loaded dengan Suspense)
 */
export default function App() {
  return (
    <AuthContextProvider>
      <BrowserRouter>
        <Guard>
          <AppRoutes />
        </Guard>
      </BrowserRouter>
    </AuthContextProvider>
  );
}
