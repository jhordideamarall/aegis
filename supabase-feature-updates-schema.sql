begin;

create table if not exists public.feature_updates (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  version text null,
  summary text not null,
  content text not null,
  highlights jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  featured boolean not null default false,
  published_at timestamptz null,
  email_sent_at timestamptz null,
  email_recipient_count integer not null default 0,
  email_last_error text null,
  created_by_email text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feature_updates_status
  on public.feature_updates (status);

create index if not exists idx_feature_updates_published_at
  on public.feature_updates (published_at desc nulls last);

create index if not exists idx_feature_updates_featured
  on public.feature_updates (featured);

comment on table public.feature_updates is
  'Pengumuman dan catatan rilis fitur untuk halaman publik dan email update pengguna';

comment on column public.feature_updates.highlights is
  'Daftar highlight fitur dalam format JSON array of strings';

comment on column public.feature_updates.email_recipient_count is
  'Jumlah recipient yang berhasil ditarget saat email update fitur dikirim';

comment on column public.feature_updates.email_last_error is
  'Pesan error terakhir saat proses pengiriman email update fitur';

commit;
