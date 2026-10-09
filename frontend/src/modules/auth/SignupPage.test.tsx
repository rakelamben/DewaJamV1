import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import SignupPage from "./SignupPage";

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
      signUp: vi.fn(),
    },
  },
}));

vi.mock("../../shared/api-client", () => ({
  default: {
    post: vi.fn(),
  },
}));

import { supabase } from "../../shared/auth";
import apiClient from "../../shared/api-client";

const mockSignUp = supabase.auth.signUp as ReturnType<typeof vi.fn>;
const mockApiPost = apiClient.post as ReturnType<typeof vi.fn>;

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merender form pendaftaran dan judul halaman", () => {
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Daftar — Dewa Jam" }),
    ).toBeInTheDocument();
    expect(document.title).toBe("Daftar — Dewa Jam");
    expect(screen.getByLabelText(/Nama Lengkap/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nomor Handphone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Kata Sandi/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Konfirmasi Kata Sandi/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Daftar" })).toBeInTheDocument();
  });

  it("menampilkan validasi inline jika kata sandi kurang dari 8 karakter", () => {
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/^Kata Sandi/i), {
      target: { value: "short" },
    });
    expect(
      screen.getByText("Kata sandi minimal 8 karakter"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Daftar" })).toBeDisabled();
  });

  it("menampilkan validasi inline jika konfirmasi kata sandi tidak cocok", () => {
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/^Kata Sandi/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Konfirmasi Kata Sandi/i), {
      target: { value: "different123" },
    });

    expect(screen.getByText("Kata sandi tidak cocok")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Daftar" })).toBeDisabled();
  });

  it("berhasil mendaftar saat seluruh input valid", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "new-user-uuid" } },
      error: null,
    });
    mockApiPost.mockResolvedValue({
      data: { customer_id: "new-cust-uuid", auth_user_id: "new-user-uuid", role: "customer" },
    });

    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Nama Lengkap/i), {
      target: { value: "Budi Santoso" },
    });
    fireEvent.change(screen.getByLabelText(/Nomor Handphone/i), {
      target: { value: "+6281234567890" },
    });
    fireEvent.change(screen.getByLabelText(/^Email/i), {
      target: { value: "budi@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Kata Sandi/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Konfirmasi Kata Sandi/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Daftar" }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "budi@example.com",
        password: "password123",
      });
      expect(mockApiPost).toHaveBeenCalledWith(
        "/api/v1/auth/register",
        {
          auth_user_id: "new-user-uuid",
          nama: "Budi Santoso",
          no_hp: "+6281234567890",
        },
        expect.anything(),
      );
      expect(
        screen.getByText(
          /Akun berhasil dibuat! Periksa email Anda untuk konfirmasi./i,
        ),
      ).toBeInTheDocument();
    });
  });

  it("menampilkan error jika nomor HP sudah terdaftar (409)", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "new-user-uuid" } },
      error: null,
    });
    const err = {
      response: {
        status: 409,
        data: { error: { message: "Nomor HP sudah terdaftar" } },
      },
    };
    mockApiPost.mockRejectedValue(err);

    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Nama Lengkap/i), {
      target: { value: "Budi Santoso" },
    });
    fireEvent.change(screen.getByLabelText(/Nomor Handphone/i), {
      target: { value: "+6281234567890" },
    });
    fireEvent.change(screen.getByLabelText(/^Email/i), {
      target: { value: "budi@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Kata Sandi/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Konfirmasi Kata Sandi/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Daftar" }));

    await waitFor(() => {
      expect(screen.getByText("Nomor HP sudah terdaftar")).toBeInTheDocument();
    });
  });
});
