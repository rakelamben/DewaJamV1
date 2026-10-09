import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { routeRegistry } from "./registry";
import InternalShell from "./InternalShell";

const internalRoutes = routeRegistry.filter((route) => route.path.startsWith("/internal"));
const publicRoutes = routeRegistry.filter((route) => !route.path.startsWith("/internal"));

const SignupPage = lazy(() => import("../modules/auth/SignupPage"));
const LoginPage = lazy(() => import("../modules/auth/LoginPage"));
const PersonnelLoginPage = lazy(
  () => import("../modules/auth/PersonnelLoginPage"),
);
const ProductDetailPage = lazy(
  () => import("../modules/tps/shop/ProductDetailPage"),
);
const CheckoutPage = lazy(() => import("../modules/tps/shop/CheckoutPage"));
const SessionCartPage = lazy(
  () => import("../modules/tps/shop/SessionCartPage"),
);

/**
 * Fallback yang ditampilkan saat lazy-loaded component sedang dimuat.
 */
function PageLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat halaman..."
      style={{ padding: "2rem", color: "#6b7280" }}
    >
      Memuat…
    </div>
  );
}

/**
 * Definisi semua rute aplikasi.
 *
 * Urutan rute:
 * 1. /signup         — pendaftaran customer baru
 * 2. /login          — login customer mandiri (alternatif modal)
 * 3. /internal/login — login staf/personnel
 * 4. /shop           — redirect kompatibilitas ke /
 * 5. Dynamic routes dari routeRegistry (/ untuk marketplace dan /internal untuk personel)
 * 6. *               — catch-all → redirect ke /
 */
export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        {/* Rute publik auth */}
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/internal/login" element={<PersonnelLoginPage />} />

        {/* Alias lama dipertahankan agar bookmark lama tetap bekerja. */}
        <Route path="/pos/*" element={<Navigate to="/internal/pos" replace />} />
         <Route path="/warehouse/*" element={<Navigate to="/internal" replace />} />
         <Route path="/management/*" element={<Navigate to="/internal" replace />} />

        {/* Backward compatibility: /shop redirect ke / */}
        <Route path="/shop" element={<Navigate to="/" replace />} />
        <Route path="/shop/*" element={<Navigate to="/" replace />} />

        {/* Detail Inplace memiliki aturan pembelian berbeda dari marketplace. */}
        <Route path="/inplace/products/:productId" element={<ProductDetailPage />} />
        <Route path="/products/:productId" element={<ProductDetailPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/inplace/checkout" element={<CheckoutPage />} />
        <Route path="/cart" element={<SessionCartPage />} />
        <Route path="/inplace/cart" element={<SessionCartPage />} />

        {/* Rute marketplace/public tanpa layout personnel. */}
        {publicRoutes.map(({ path, component: Component }) => (
          <Route
            key={path}
            path={path === "/" ? "/" : `${path}/*`}
            element={<Component />}
          />
        ))}

        {/* Hanya area personnel yang memakai InternalShell. */}
        <Route path="/internal" element={<InternalShell />}>
          {internalRoutes.map(({ path, component: Component }) => {
            const childPath = path.replace("/internal", "").replace(/^\//, "");
            return childPath ? (
              <Route key={path} path={childPath} element={<Component />} />
            ) : (
              <Route key={path} index element={<Component />} />
            );
          })}
        </Route>

        {/* Catch-all: arahkan semua rute tak dikenal ke / */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
