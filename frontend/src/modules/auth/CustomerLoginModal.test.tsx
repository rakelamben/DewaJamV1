import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import CustomerLoginModal from "./CustomerLoginModal";

vi.mock("../../shared/auth", () => ({
  supabase: {
    auth: {
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

const mockSignIn = supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>;
const mockSignOut = supabase.auth.signOut as ReturnType<typeof vi.fn>;
const mockApiGet = apiClient.get as ReturnType<typeof vi.fn>;

describe("CustomerLoginModal", () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tidak merender apa-apa saat open false", () => {
    render(
      <MemoryRouter>
        <CustomerLoginModal open={false} onClose={onClose} onSuccess={onSuccess} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("merender modal dengan input email dan password saat open true", () => {
    render(
      <MemoryRouter>
        <CustomerLoginModal open={true} onClose={onClose} onSuccess={onSuccess} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Kata Sandi/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Masuk" })).toBeInTheDocument();
  });

  it("menampilkan error role='alert' jika form dikirim dalam kondisi kosong", async () => {
    render(
      <MemoryRouter>
        <CustomerLoginModal open={true} onClose={onClose} onSuccess={onSuccess} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Email dan kata sandi wajib diisi/i);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("berhasil login sebagai customer -> panggil onSuccess dan onClose", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });
    mockApiGet.mockResolvedValue({
      data: { role: "customer", auth_user_id: "1", entity_type: "customer", entity_id: "1" },
    });

    render(
      <MemoryRouter>
        <CustomerLoginModal open={true} onClose={onClose} onSuccess={onSuccess} />
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
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "customer@example.com",
        password: "password123",
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("menolak akun personnel dan menampilkan link ke login staf", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });
    mockApiGet.mockResolvedValue({
      data: { role: "kasir", auth_user_id: "1", entity_type: "personnel", entity_id: "1" },
    });

    render(
      <MemoryRouter>
        <CustomerLoginModal open={true} onClose={onClose} onSuccess={onSuccess} />
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
      expect(mockSignOut).toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(
        /Akun ini bukan akun customer/i,
      );
      expect(
        screen.getByRole("link", { name: /Menuju Halaman Login Staf/i }),
      ).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  it("menutup modal saat tombol tutup diklik", () => {
    render(
      <MemoryRouter>
        <CustomerLoginModal open={true} onClose={onClose} onSuccess={onSuccess} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tutup modal" }));
    expect(onClose).toHaveBeenCalled();
  });
});
