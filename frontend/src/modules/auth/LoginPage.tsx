import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "@/shared/api-client";
import { supabase } from "@/shared/auth";
import { useAuthContext } from "@/shared/use-auth-context";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MeResponse {
  auth_user_id: string;
  role: string;
  entity_type: string;
  entity_id: string;
}

/**
 * Halaman login mandiri khusus customer di rute /login.
 *
 * Menerapkan spesifikasi DesignMD HubSpot dengan komponen shadcn:
 * - Card 16px radius, background putih, bayangan halus raised.
 * - Tombol primer HubSpot Orange #FF4800 (52px).
 * - Input 44px dengan radius 4px dan ring fokus oranye.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [showStaffLink, setShowStaffLink] = useState(false);

  const navigate = useNavigate();
  const { setAuthContext } = useAuthContext();

  useEffect(() => {
    document.title = "Masuk Customer — Dewa Jam";

    // Cek apakah sudah login sebagai customer
    let cancelled = false;
    async function checkExistingSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || cancelled) return;

      try {
        const res = await apiClient.get<MeResponse>("/api/v1/auth/me");
        if (cancelled) return;
        if (res.data.role === "customer") {
          setAuthContext("customer");
          navigate("/", { replace: true });
        }
      } catch {
        // Abaikan jika token invalid / offline
      }
    }

    void checkExistingSession();

    return () => {
      cancelled = true;
    };
  }, [navigate, setAuthContext]);

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
          navigate("/", { replace: true });
        } else {
          // Akun staf/personnel masuk ke login customer -> tolak
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
              "Akun Anda belum menyelesaikan registrasi. Mengalihkan ke halaman daftar…",
            );
            setTimeout(() => {
              navigate("/signup", { replace: true });
            }, 2000);
          } else {
            setError("Akun Anda belum diaktifkan. Hubungi administrator.");
          }
        } else {
          setError("Koneksi bermasalah. Periksa jaringan dan coba lagi.");
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
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-[420px] shadow-raised">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-serif font-light text-neutral-primary">
            Masuk Akun Customer
          </CardTitle>
          <CardDescription className="text-sm text-neutral-secondary">
            Masuk untuk melanjutkan belanja dan melacak pesanan Anda
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error}
                {showStaffLink && (
                  <p className="mt-2">
                    <Link
                      to="/internal/login"
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
            <Alert variant="success" role="status">
              <AlertDescription>
                Email konfirmasi telah dikirim ulang.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-email">Email</Label>
              <Input
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

            <div className="space-y-2">
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
        </CardContent>

        <CardFooter className="justify-center border-t border-border/40 pt-4">
          <p className="text-sm text-neutral-primary text-center">
            Belum punya akun?{" "}
            <Link
              to="/signup"
              className="font-medium text-brand-orange hover:underline"
            >
              Daftar sebagai customer baru
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
