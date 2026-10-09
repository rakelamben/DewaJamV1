import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";

export interface RouteConfig {
  path: string;
  label: string;
  allowedRoles: string[];
  authMode: "lazy" | "hard";
  component: LazyExoticComponent<ComponentType>;
}

export const routeRegistry: RouteConfig[] = [
  {
    path: "/",
    label: "Toko Online",
    allowedRoles: ["customer"],
    authMode: "lazy",
    component: lazy(() => import("../modules/tps/shop/ShopPage")),
  },
  {
    path: "/inplace",
    label: "Inplace Store",
    allowedRoles: ["customer", "admin"],
    authMode: "lazy",
    component: lazy(() => import("../modules/tps/inplace/InplacePage")),
  },
  {
    path: "/internal",
    label: "Dashboard Personel",
    allowedRoles: ["kasir", "gudang", "manager", "admin"],
    authMode: "hard",
    component: lazy(() => import("../modules/internal/InternalDashboard")),
  },
  {
    path: "/internal/pos",
    label: "Kasir",
    allowedRoles: ["kasir", "manager", "admin"],
    authMode: "hard",
    component: lazy(() => import("../modules/tps/pos/PosPage")),
  },
];
