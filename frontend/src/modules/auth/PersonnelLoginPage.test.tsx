import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import PersonnelLoginPage from "./PersonnelLoginPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../shared/auth", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resend: vi.fn(),
    },
  },
}));

vi.mock("../../shared/api-client", () => ({
  default: {
    get: vi.fn(),
  },
}));

import { supabase } from "../../shared/auth";
import apiClient from "../../shared/api-client";

const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>;
const mockSignIn = supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>;
const mockSignOut = supabase.auth.signOut as ReturnType<typeof vi.fn>;
const mockApiGet = apiClient.get as ReturnType<typeof vi.fn>;

describe("PersonnelLoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it("merender heading dan teks deskriptif staf", () => {
    render(
      <MemoryRouter>
        <PersonnelLoginPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Masuk Staf — Dewa Jam" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Halaman khusus akses staf dan manajemen"),
    ).toBeInTheDocument();
    expect(document.title).toBe("Masuk Staf — Dewa Jam");
  });

  it("mencegah pengiriman form dan menampilkan error saat field kosong", async () => {
    render(
      <MemoryRouter>
        <PersonnelLoginPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Email dan kata sandi wajib diisi/i);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("berhasil login sebagai kasir -> redirect ke portal internal", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });
    mockApiGet.mockResolvedValue({
      data: { role: "kasir", auth_user_id: "1", entity_type: "personnel", entity_id: "1" },
    });

    render(
      <MemoryRouter>
        <PersonnelLoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "kasir@dewajam.com" },
    });
    fireEvent.change(screen.getByLabelText(/Kata Sandi/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/internal", { replace: true });
    });
  });

  it("menolak role customer dan menampilkan pesan error serta tautan ke /", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });
    mockApiGet.mockResolvedValue({
      data: { role: "customer", auth_user_id: "1", entity_type: "customer", entity_id: "1" },
    });

    render(
      <MemoryRouter>
        <PersonnelLoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "customer@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Kata Sandi/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(
        /Akun ini bukan akun staf/i,
      );
      expect(
        screen.getByRole("link", { name: /Menuju Halaman Login Customer/i }),
      ).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalledWith("/pos", expect.anything());
    });
  });
});
