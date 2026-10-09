import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "./LoginPage";

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

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it("merender heading dan form login customer", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Masuk Akun Customer" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Masuk untuk melanjutkan belanja dan melacak pesanan Anda"),
    ).toBeInTheDocument();
    expect(document.title).toBe("Masuk Customer — Dewa Jam");
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Kata Sandi/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Masuk" })).toBeInTheDocument();
    expect(screen.getByText("Daftar sebagai customer baru")).toBeInTheDocument();
  });

  it("menampilkan validasi error jika form dikirim kosong", async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Email dan kata sandi wajib diisi",
      );
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("berhasil login sebagai customer dan mengarahkan ke /", async () => {
    mockSignIn.mockResolvedValue({
      data: {
        session: { access_token: "cust-token", user: { id: "cust-uuid" } },
      },
      error: null,
    });
    mockApiGet.mockResolvedValue({
      data: {
        auth_user_id: "cust-uuid",
        role: "customer",
        entity_type: "customer",
        entity_id: "c-1",
      },
    });

    render(
      <MemoryRouter>
        <LoginPage />
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
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("menolak akun staf dan menampilkan tautan ke /internal/login", async () => {
    mockSignIn.mockResolvedValue({
      data: {
        session: { access_token: "staff-token", user: { id: "staff-uuid" } },
      },
      error: null,
    });
    mockApiGet.mockResolvedValue({
      data: {
        auth_user_id: "staff-uuid",
        role: "kasir",
        entity_type: "personnel",
        entity_id: "p-1",
      },
    });
    mockSignOut.mockResolvedValue({ error: null });

    render(
      <MemoryRouter>
        <LoginPage />
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
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Akun ini bukan akun customer. Silakan gunakan halaman login staf.",
      );
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(screen.getByText("Menuju Halaman Login Staf")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("menampilkan error jika kredensial salah dan mengosongkan kata sandi", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "customer@example.com" },
    });
    const pwdInput = screen.getByLabelText(/Kata Sandi/i) as HTMLInputElement;
    fireEvent.change(pwdInput, {
      target: { value: "wrongpassword" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Email atau kata sandi salah",
      );
    });

    expect(pwdInput.value).toBe("");
  });

  it("menampilkan tombol kirim ulang saat email belum dikonfirmasi", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null },
      error: { message: "Email not confirmed" },
    });
    (supabase.auth.resend as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: null,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "unconfirmed@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Kata Sandi/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Kirim ulang email konfirmasi" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Kirim ulang email konfirmasi" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Email konfirmasi telah dikirim ulang.",
      );
    });
  });

  it("auto-redirect ke / jika sudah memiliki sesi login aktif sebagai customer", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: { access_token: "active-token", user: { id: "active-id" } },
      },
      error: null,
    });
    mockApiGet.mockResolvedValue({
      data: {
        auth_user_id: "active-id",
        role: "customer",
        entity_type: "customer",
        entity_id: "c-active",
      },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });
});
