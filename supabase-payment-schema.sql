begin;

alter table public.orders
  add column if not exists payment_provider text null,
  add column if not exists payment_proof_url text null,
  add column if not exists payment_proof_path text null,
  add column if not exists payment_proof_uploaded_at timestamptz null,
  add column if not exists payment_notes text null;

create index if not exists idx_orders_payment_provider
  on public.orders (payment_provider);

create index if not exists idx_orders_payment_method_provider
  on public.orders (payment_method, payment_provider);

comment on column public.orders.payment_provider is
  'Detail metode pembayaran: general, gopay, dana, ovo, shopeepay, bank_qris, other';

comment on column public.orders.payment_proof_url is
  'URL bukti pembayaran jika file berhasil diunggah';

comment on column public.orders.payment_proof_path is
  'Path file bukti pembayaran pada Supabase Storage';

comment on column public.orders.payment_proof_uploaded_at is
  'Timestamp upload bukti pembayaran';

comment on column public.orders.payment_notes is
  'Catatan tambahan pembayaran';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

commit;
