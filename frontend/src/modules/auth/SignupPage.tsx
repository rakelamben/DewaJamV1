import axios from "axios";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/shared/auth";
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

export default function SignupPage() {
  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Field-specific errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Daftar — Dewa Jam";
  }, []);

  // Real-time validations
  const isPasswordTooShort = password.length > 0 && password.length < 8;
  const isPasswordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;
  const isEmailFormatInvalid =
    email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isFormValid =
    nama.trim().length > 0 &&
    noHp.trim().length >= 8 &&
    email.trim().length > 0 &&
    !isEmailFormatInvalid &&
    password.length >= 8 &&
    password === confirmPassword;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid) return;

    setGeneralError(null);
    setEmailError(null);
    setPhoneError(null);
    setLoading(true);

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 10000);

    try {
      // 1. Supabase Auth signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError) {
        clearTimeout(timeoutId);
        setLoading(false);
        const msg = authError.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already exists")) {
          setEmailError("Email sudah terdaftar. Silakan login atau gunakan email lain.");
        } else {
          setGeneralError(authError.message);
        }
        return;
      }

      const authUserId = authData.user?.id;
      if (!authUserId) {
        clearTimeout(timeoutId);
        setLoading(false);
        setGeneralError("Gagal membuat akun. Silakan coba lagi.");
        return;
      }

      if (!authData.session) {
        // Email confirmation required — signUp succeeded but no session yet
        clearTimeout(timeoutId);
        setLoading(false);
        setSuccessMessage(
          "Periksa email Anda untuk mengkonfirmasi akun, lalu login.",
        );
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 3000);
        return;
      }

      // 2. POST /api/v1/auth/register ke Backend
      // Gunakan token langsung dari response signUp (bukan apiClient interceptor)
      // untuk menghindari race condition storage Supabase.
      try {
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL as string}/api/v1/auth/register`,
          {
            auth_user_id: authUserId,
            nama: nama.trim(),
            no_hp: noHp.trim(),
          },
          {
            headers: {
              Authorization: `Bearer ${authData.session.access_token}`,
            },
            signal: abortController.signal,
          },
        );
        clearTimeout(timeoutId);

        setLoading(false);
        setSuccessMessage(
          "Akun berhasil dibuat! Periksa email Anda untuk konfirmasi.",
        );

        // Redirect ke / setelah 3 detik
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 3000);
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        setLoading(false);

        const anyErr = err as {
          response?: { status?: number; data?: { error?: { message?: string } } };
        };

        if (anyErr?.response?.status === 409) {
          const errMsg = anyErr.response.data?.error?.message ?? "";
          if (errMsg.includes("Nomor HP sudah terdaftar")) {
            setPhoneError("Nomor HP sudah terdaftar");
          } else if (errMsg.includes("Akun sudah terdaftar")) {
            setGeneralError("Akun ini sudah terdaftar di sistem. Silakan login.");
          } else {
            setGeneralError(errMsg || "Data duplikat telah terdaftar.");
          }
        } else {
          setGeneralError("Terjadi kesalahan. Coba lagi.");
        }
      }
    } catch {
      clearTimeout(timeoutId);
      setLoading(false);
      setGeneralError("Koneksi bermasalah. Periksa jaringan dan coba lagi.");
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-[460px] shadow-raised">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-serif font-light text-neutral-primary">
            Daftar — Dewa Jam
          </CardTitle>
          <CardDescription className="text-sm text-neutral-secondary">
            Buat akun customer baru untuk mulai berbelanja
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {generalError && (
            <Alert variant="destructive">
              <AlertDescription>{generalError}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert variant="success" role="status">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Nama Lengkap */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-name">Nama Lengkap</Label>
              <Input
                id="signup-name"
                type="text"
                autoComplete="name"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama Lengkap Anda"
                disabled={loading}
              />
            </div>

            {/* Nomor HP */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-phone">Nomor Handphone</Label>
              <Input
                id="signup-phone"
                type="tel"
                autoComplete="tel"
                required
                value={noHp}
                onChange={(e) => {
                  setNoHp(e.target.value);
                  setPhoneError(null);
                }}
                placeholder="Contoh: +6281234567890"
                disabled={loading}
              />
              {phoneError && (
                <span role="alert" className="text-xs text-destructive font-medium block">
                  {phoneError}
                </span>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                placeholder="nama@example.com"
                disabled={loading}
              />
              {isEmailFormatInvalid && (
                <span role="alert" className="text-xs text-destructive font-medium block">
                  Format email tidak valid
                </span>
              )}
              {emailError && (
                <span role="alert" className="text-xs text-destructive font-medium block">
                  {emailError}
                </span>
              )}
            </div>

            {/* Kata Sandi */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">Kata Sandi</Label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                disabled={loading}
              />
              {isPasswordTooShort && (
                <span role="alert" className="text-xs text-destructive font-medium block">
                  Kata sandi minimal 8 karakter
                </span>
              )}
            </div>

            {/* Konfirmasi Kata Sandi */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-confirm-password">Konfirmasi Kata Sandi</Label>
              <Input
                id="signup-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi"
                disabled={loading}
              />
              {isPasswordMismatch && (
                <span role="alert" className="text-xs text-destructive font-medium block">
                  Kata sandi tidak cocok
                </span>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={!isFormValid || loading}
              className="w-full mt-2"
            >
              {loading ? "Mendaftar…" : "Daftar"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t border-border/40 pt-4">
          <p className="text-sm text-neutral-primary text-center">
            <Link
              to="/login"
              className="font-medium text-brand-orange hover:underline"
            >
              Sudah punya akun? Masuk
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
