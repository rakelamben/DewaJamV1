import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import apiClient from "@/shared/api-client";
import { supabase } from "@/shared/auth";
import { useAuthContext } from "@/shared/use-auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface CustomerLoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  message?: string;
}

interface MeResponse {
  auth_user_id: string;
  role: string;
  entity_type: string;
  entity_id: string;
}

export default function CustomerLoginModal({
  open,
  onClose,
  onSuccess,
  message,
}: CustomerLoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [showStaffLink, setShowStaffLink] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { setAuthContext } = useAuthContext();

  // Focus trap & save previous active element
  useEffect(() => {
    if (!open) {
      triggerElementRef.current?.focus?.();
      return;
    }

    triggerElementRef.current = document.activeElement as HTMLElement;

    // Reset transient UI state when modal opens
    const resetState = () => {
      setError(null);
      setShowResend(false);
      setShowStaffLink(false);
      setResendSuccess(false);
    };
    resetState();

    // Focus email input
    setTimeout(() => {
      emailInputRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email dan kata sandi wajib diisi");
      return;
    }

    setError(null);
    setShowResend(false);
    setShowStaffLink(false);
    setLoading(true);

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 10000);

    try {
      const { data, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authError) {
        clearTimeout(timeoutId);
        setLoading(false);
        const msg = authError.message.toLowerCase();
        if (msg.includes("invalid login credentials")) {
          setPassword("");
          setError("Email atau kata sandi salah");
        } else if (msg.includes("email not confirmed")) {
          setError(
            "Email belum dikonfirmasi. Periksa kotak masuk email Anda.",
          );
          setShowResend(true);
        } else {
          setError(authError.message);
        }
        return;
      }

      if (!data.session) {
        clearTimeout(timeoutId);
        setLoading(false);
        setError("Sesi tidak ditemukan. Coba lagi.");
        return;
      }

      // Verifikasi role via GET /api/v1/auth/me
      try {
        const res = await apiClient.get<MeResponse>("/api/v1/auth/me", {
          signal: abortController.signal,
        });
        clearTimeout(timeoutId);

        if (res.data.role === "customer") {
          setAuthContext("customer");
          setLoading(false);
          onSuccess();
          onClose();
        } else {
          // Akun staf/personnel
          await supabase.auth.signOut();
          setLoading(false);
          setError(
            "Akun ini bukan akun customer. Silakan gunakan halaman login staf.",
          );
          setShowStaffLink(true);
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        setLoading(false);
        await supabase.auth.signOut();
        const anyErr = err as { response?: { status?: number; data?: { error?: { message?: string } } } };
        if (anyErr?.response?.status === 403) {
          const msg = anyErr.response?.data?.error?.message ?? "";
          if (msg.includes("tidak terdaftar di sistem")) {
            setError(
              "Akun Anda belum menyelesaikan registrasi. Silakan daftar terlebih dahulu.",
            );
            setShowStaffLink(false);
            // Show signup link
            setTimeout(() => {
              window.location.href = "/signup";
            }, 2000);
          } else {
            setError("Akun Anda belum diaktifkan. Hubungi administrator.");
          }
        } else {
          setError(
            "Koneksi bermasalah. Periksa jaringan dan coba lagi.",
          );
        }
      }
    } catch {
      clearTimeout(timeoutId);
      setLoading(false);
      setError("Koneksi bermasalah. Periksa jaringan dan coba lagi.");
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      setResending(false);
      if (resendErr) {
        setError("Pengiriman ulang gagal. Coba lagi nanti.");
      } else {
        setResendSuccess(true);
      }
    } catch {
      setResending(false);
      setError("Pengiriman ulang gagal. Coba lagi nanti.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9989] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      ref={modalRef}
    >
      <div className="w-full max-w-[420px] rounded-lg bg-white p-8 shadow-elevated border border-border/40">
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-xl font-serif font-light text-neutral-primary">
            Masuk Akun Customer
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-secondary hover:text-neutral-primary p-1 text-lg font-semibold leading-none disabled:opacity-50"
            aria-label="Tutup modal"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {message && (
          <p className="mb-4 text-sm leading-6 text-neutral-secondary">{message}</p>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {error}
              {showStaffLink && (
                <p className="mt-2">
                  <Link
                    to="/internal/login"
                    onClick={onClose}
                    className="font-medium underline hover:text-red-800"
                  >
                    Menuju Halaman Login Staf
                  </Link>
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {resendSuccess && (
          <Alert variant="success" role="status" className="mb-4">
            <AlertDescription>
              Email konfirmasi telah dikirim ulang.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="customer-email">Email</Label>
            <Input
              ref={emailInputRef}
              id="customer-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@example.com"
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customer-password">Kata Sandi</Label>
            <Input
              id="customer-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {showResend && !resendSuccess && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={resending || loading}
              className="w-full text-brand-orange border-brand-orange hover:bg-brand-orange/5"
            >
              {resending
                ? "Mengirim ulang…"
                : "Kirim ulang email konfirmasi"}
            </Button>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Memproses…" : "Masuk"}
          </Button>
        </form>

        <div className="mt-6 border-t border-border/40 pt-4 text-center">
          <Link
            to="/signup"
            onClick={onClose}
            className="text-sm font-medium text-brand-orange hover:underline"
          >
            Daftar sebagai customer baru
          </Link>
        </div>
      </div>
    </div>
  );
}
