begin;

alter table public.businesses
  add column if not exists pic_name text null;

comment on column public.businesses.pic_name is
  'Nama PIC Brand/Toko atau contact person untuk bisnis';

commit;
