import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Construction } from 'lucide-react';

export default function MerchantQris() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Merchant QRIS</h1>
        <p className="text-muted-foreground">
          Daftarkan QRIS atas nama usaha Anda sendiri
        </p>
      </div>

      <Card>
        <CardContent className="py-16 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <QrCode className="h-12 w-12 text-muted-foreground" />
          </div>
          <Badge className="mb-4 bg-warning/10 text-warning">
            <Construction className="mr-1 h-3 w-3" />
            Coming Soon
          </Badge>
          <h2 className="text-xl font-semibold">Fitur Dalam Pengembangan</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Segera Anda dapat mendaftarkan QRIS merchant dengan nama usaha sendiri.
            Fitur ini sedang dalam tahap pengembangan dan akan segera tersedia.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keuntungan QRIS Merchant</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>QRIS dengan nama usaha Anda sendiri</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>Fee lebih rendah untuk transaksi besar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>Settlement langsung ke rekening Anda</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span>Laporan transaksi terpisah</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
