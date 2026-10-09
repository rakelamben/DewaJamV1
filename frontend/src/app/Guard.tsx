import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import apiClient from "../shared/api-client";
import { supabase } from "../shared/auth";
import { useAuthContext } from "../shared/use-auth-context";
import type { PersonnelAuthUser } from "../shared/auth-context-global";
import { routeRegistry } from "./registry";

// Shape returned by GET /api/v1/auth/me
interface MeResponse {
  auth_user_id: string;
  role: string;
  entity_type: string;
  entity_id: string;
  username: string;
  email: string | null;
}

const PUBLIC_ROUTES = ["/signup", "/internal/login", "/login"];

/**
 * Guard wraps all pages.
 *
 * Implements two access modes:
 *  - Lazy Auth (e.g. /, /inplace): Guest access is allowed without session.
 *  - Hard Auth (/internal dan seluruh modulnya): Requires valid session and role.
 */
export function Guard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authorized" | "redirecting">(
    "loading",
  );
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthContext, setPersonnelUser } = useAuthContext();

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      setStatus("loading");

      const isPublic = PUBLIC_ROUTES.some(
        (p) => location.pathname === p || location.pathname.startsWith(`${p}/`),
      );

      // Find current route in registry with exact match for root '/'
      const currentRoute = [...routeRegistry].sort((a, b) => b.path.length - a.path.length).find((r) => {
        if (r.path === "/") {
          return location.pathname === "/" || location.pathname === "/shop";
        }
        return (
          location.pathname === r.path ||
          location.pathname.startsWith(`${r.path}/`)
        );
      });

      // Step 1: verify Supabase session exists.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Halaman login publik tidak perlu memvalidasi role berulang kali.
      // PersonnelLoginPage akan memeriksa session yang sudah ada bila diperlukan.
      if (isPublic) {
        if (!cancelled) setStatus("authorized");
        return;
      }

      if (!session) {
        setAuthContext(null);
        setPersonnelUser(null);
        if (cancelled) return;

        if (!currentRoute) {
          // Unregistered path — let router handle it
          setStatus("authorized");
          return;
        }

        if (currentRoute.authMode === "lazy") {
          // Guest mode allowed
          setStatus("authorized");
          return;
        }

        // Hard auth route without active session -> redirect to /internal/login
        navigate("/internal/login", { replace: true });
        setStatus("redirecting");
        return;
      }

      // Step 2: resolve the user's role from the backend
      let role: string | null = null;

      try {
        const res = await apiClient.get<MeResponse>("/api/v1/auth/me");
        role = res.data.role;

        if (role === "customer") {
          setAuthContext("customer");
          setPersonnelUser(null);
        } else if (["kasir", "gudang", "manager", "admin"].includes(role)) {
          setAuthContext("personnel");
          setPersonnelUser(res.data as PersonnelAuthUser);
        }
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 404) {
            // Endpoint not yet implemented — allow access without role enforcement
          } else if (err.response?.status === 401) {
            if (!cancelled) {
              setAuthContext(null);
              setPersonnelUser(null);
              navigate("/internal/login", { replace: true });
              setStatus("redirecting");
            }
            return;
          } else {
            if (!cancelled) {
              navigate("/internal/login", { replace: true });
              setStatus("redirecting");
            }
            return;
          }
        } else {
          if (!cancelled) {
            navigate("/internal/login", { replace: true });
            setStatus("redirecting");
          }
          return;
        }
      }

      if (cancelled) return;

      if (!currentRoute) {
        setStatus("authorized");
        return;
      }

      // If role could not be resolved, allow access (backend not ready yet)
      if (role === null) {
        setStatus("authorized");
        return;
      }

      // Area marketplace hanya untuk customer, sedangkan portal internal hanya untuk personnel.
      if (!currentRoute.allowedRoles.includes(role)) {
        navigate(role === "customer" ? "/" : "/internal", { replace: true });
        setStatus("redirecting");
        return;
      }

      // Lazy auth routes allow any authenticated role yang diizinkan.
      if (currentRoute.authMode === "lazy") {
        setStatus("authorized");
        return;
      }

      // Hard auth: enforce allowedRoles
      if (!currentRoute.allowedRoles.includes(role)) {
        if (role === "customer") {
          navigate("/", { replace: true });
        } else {
          navigate("/internal", { replace: true });
        }
        setStatus("redirecting");
        return;
      }

      setStatus("authorized");
    }

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate, setAuthContext, setPersonnelUser]);

  if (status === "loading") {
    return (
      <div role="status" aria-live="polite" aria-label="Memuat...">
        Memuat...
      </div>
    );
  }

  if (status === "redirecting") {
    return null;
  }

  return <>{children}</>;
}
