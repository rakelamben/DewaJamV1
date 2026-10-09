import { Link } from "react-router-dom";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePersonnel } from "@/shared/personnel-context";

const modules = [
  { href: "/internal/pos", title: "POS / Kasir", description: "Buat transaksi dan proses pembayaran pelanggan.", icon: ShoppingCart, roles: ["kasir", "manager", "admin"] },
];

export default function InternalDashboard() {
  const personnel = usePersonnel();
  const availableModules = modules.filter((module) => module.roles.includes(personnel?.role ?? ""));

  return (
    <main className="min-w-0 flex-1 overflow-x-hidden bg-neutral-light p-4 sm:p-5 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-orange">Personnel portal</p>
          <h1 className="mt-2 font-serif text-4xl">Selamat bekerja, {personnel?.username ?? "Personnel"}</h1>
          <p className="mt-2 text-neutral-secondary">Gunakan shortcut berikut untuk memulai pekerjaan Anda.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {availableModules.map(({ href, title, description, icon: Icon }) => (
            <Link key={href} to={href} className="group">
              <Card className="h-full bg-white transition-colors group-hover:border-brand-orange/60">
                <CardHeader><Icon className="h-8 w-8 text-brand-orange" /><CardTitle className="mt-2">{title}</CardTitle></CardHeader>
                <CardContent className="flex items-end justify-between gap-4"><p className="text-sm leading-6 text-neutral-secondary">{description}</p><ArrowRight className="h-5 w-5 shrink-0 text-brand-orange" /></CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
