import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import apiClient from "@/shared/api-client";
import { supabase } from "@/shared/auth";
import { useAuthContext } from "@/shared/use-auth-context";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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

export default function PersonnelLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [showCustomerLink, setShowCustomerLink] = useState(false);

  const { setAuthContext } = useAuthContext();

  useEffect(() => {
    document.title = "Masuk Staf — Dewa Jam";
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email dan kata sandi wajib diisi");
      return;
    }

    setError(null);
    setShowResend(false);
    setShowCustomerLink(false);
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

        const role = res.data.role;

        if (role === "customer") {
          await supabase.auth.signOut();
          setLoading(false);
          setError(
            "Akun ini bukan akun staf. Silakan gunakan halaman login customer.",
          );
          setShowCustomerLink(true);
          return;
        }

        // Akun staf/personnel valid
        setAuthContext("personnel");
        setLoading(false);

        // Muat ulang area internal setelah session tersimpan agar Guard dan
        // InternalShell membaca session yang sama dan tidak terkena race.
        window.location.replace("/internal");
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        setLoading(false);
        await supabase.auth.signOut();
        const anyErr = err as { response?: { status?: number } };
        if (anyErr?.response?.status === 403) {
          setError("Akun Anda belum diaktifkan. Hubungi administrator.");
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
      <Card className="w-full p-6 bg-white max-w-[420px] shadow-raised border-t-4 border-t-accent-teal">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-serif font-light text-neutral-primary">
            Masuk Staf — Dewa Jam
          </CardTitle>
          <CardDescription className="text-sm text-neutral-secondary">
            Halaman khusus akses staf dan manajemen
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error}
                {showCustomerLink && (
                  <p className="mt-2">
                    <Link
                      to="/login"
                      className="font-medium underline hover:text-red-800"
                    >
                      Menuju Halaman Login Customer
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
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staf@dewajam.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-password">Kata Sandi</Label>
              <Input
                id="staff-password"
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
                className="w-full text-accent-teal border-accent-teal hover:bg-accent-teal-light/20"
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
      </Card>
    </div>
  );
}
