const s = "catat order 1 americano pembayaran cash";
const m = s.match(/(?:catat|buat|create|input|pesan|order)\s+(?:order|transaksi|pembelian\s+)?(.+?)\s+(?:bayar|payment|dibayar|via|pakai|dengan|pembayaran)\s+(\S+)/i);
console.log(m);
