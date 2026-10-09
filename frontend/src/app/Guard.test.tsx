import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// --- Mock modules before importing the component ---

vi.mock("../shared/auth", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock("../shared/api-client", () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
let mockPathname = "/pos";

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
}));

vi.mock("./registry", () => ({
  routeRegistry: [
    {
      path: "/",
      label: "Toko Online",
      allowedRoles: ["customer", "admin"],
      authMode: "lazy",
      component: null,
    },
    {
      path: "/inplace",
      label: "Inplace Store",
      allowedRoles: ["customer", "admin"],
      authMode: "lazy",
      component: null,
    },
    {
      path: "/pos",
      label: "Kasir",
      allowedRoles: ["kasir", "manager", "admin"],
      authMode: "hard",
      component: null,
    },
    {
      path: "/warehouse",
      label: "Gudang",
      allowedRoles: ["gudang", "manager", "admin"],
      authMode: "hard",
      component: null,
    },
  ],
}));

import { Guard } from "./Guard";
import { supabase } from "../shared/auth";
import apiClient from "../shared/api-client";

const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>;
const mockApiGet = apiClient.get as ReturnType<typeof vi.fn>;

function renderGuard() {
  return render(
    <Guard>
      <span data-testid="child">Konten Terlindungi</span>
    </Guard>,
  );
}

describe("Guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/pos";
  });

  // ------------------------------------------------------------------ //
  // Requirement 7.1: unauthenticated di rute hard auth → /internal/login //
  // ------------------------------------------------------------------ //
  it("tanpa session di rute hard auth -> navigate ke /internal/login dipanggil", async () => {
    mockPathname = "/pos";
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    renderGuard();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/internal/login", {
        replace: true,
      });
    });

    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  // ------------------------------------------------------------------ //
  // Requirement 6.1: unauthenticated di rute lazy auth (/) → render    //
  // ------------------------------------------------------------------ //
  it("tanpa session di rute lazy auth (/) -> children dirender sebagai guest", async () => {
    mockPathname = "/";
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    renderGuard();

    await waitFor(() => {
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------ //
  // Requirement 6.5: rute publik (/internal/login, /signup) → render   //
  // ------------------------------------------------------------------ //
  it("sudah di /internal/login tanpa session -> children dirender", async () => {
    mockPathname = "/internal/login";
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    renderGuard();

    await waitFor(() => {
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------ //
  // Requirement 7.2: customer di rute hard auth (/pos) → redirect ke / //
  // ------------------------------------------------------------------ //
  it("customer mencoba akses rute hard auth -> navigate ke / dipanggil", async () => {
    mockPathname = "/pos";
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
      error: null,
    });

    mockApiGet.mockResolvedValue({
      data: { role: "customer", auth_user_id: "1", entity_type: "customer", entity_id: "1" },
    });

    renderGuard();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });

    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  // ------------------------------------------------------------------ //
  // Requirement 7.3: role sesuai di hard auth -> render               //
  // ------------------------------------------------------------------ //
  it("role sesuai di rute hard auth -> children dirender", async () => {
    mockPathname = "/pos";
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
      error: null,
    });

    mockApiGet.mockResolvedValue({
      data: { role: "kasir", auth_user_id: "1", entity_type: "personnel", entity_id: "1" },
    });

    renderGuard();

    await waitFor(() => {
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------ //
  // Edge case: backend /me 404 -> diizinkan (backward compat)          //
  // ------------------------------------------------------------------ //
  it("backend /me mengembalikan 404 -> children dirender", async () => {
    mockPathname = "/pos";
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
      error: null,
    });

    const err = Object.assign(new Error("Not Found"), {
      isAxiosError: true,
      response: { status: 404 },
    });
    mockApiGet.mockRejectedValue(err);

    renderGuard();

    await waitFor(() => {
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});