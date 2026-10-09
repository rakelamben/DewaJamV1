import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MasterDataPage() {
  return (
    <div className="min-h-screen bg-neutral-light p-5 lg:p-8">
      <Card className="mx-auto max-w-6xl bg-white">
        <CardHeader><CardTitle>Master data</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-neutral-secondary">Modul master data siap dikembangkan.</p></CardContent>
      </Card>
    </div>
  );
}
