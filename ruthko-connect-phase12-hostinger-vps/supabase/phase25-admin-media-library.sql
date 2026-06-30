-- Phase 25: Admin Media Library and File Uploads
-- Run this in Supabase SQL Editor AFTER phase24-admin-audit-log.sql

-- ── media_assets table ────────────────────────────────────────────────────

create table if not exists media_assets (
  id               uuid primary key default gen_random_uuid(),
  file_name        text not null,
  file_path        text not null,
  file_url         text not null,
  bucket_name      text not null default 'ruthko-media',
  mime_type        text,
  file_size        bigint,
  media_type       text,
  category         text not null default 'general',
  title            text,
  alt_text         text,
  description      text,
  language         text default 'en',
  uploaded_by      uuid references auth.users(id) on delete set null,
  uploaded_by_email text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table media_assets enable row level security;

-- Public can read active media (for public pages to display uploaded images)
create policy "Public can read active media"
  on media_assets for select
  using (is_active = true);

-- Approved admins (owner/admin/editor) can insert
create policy "Approved admins can insert media"
  on media_assets for insert
  with check (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
        and ap.role in ('owner','admin','editor')
    )
  );

-- Approved admins can update (includes soft-delete is_active=false)
create policy "Approved admins can update media"
  on media_assets for update
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
        and ap.role in ('owner','admin','editor')
    )
  );

-- Only owners and admins can hard delete rows
create policy "Owners and admins can delete media"
  on media_assets for delete
  using (
    exists (
      select 1 from admin_profiles ap
      where ap.user_id = auth.uid()
        and ap.is_active = true
        and ap.role in ('owner','admin')
    )
  );

-- auto-update updated_at
create or replace function ruthko_media_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists media_assets_updated_at on media_assets;
create trigger media_assets_updated_at
  before update on media_assets
  for each row execute procedure ruthko_media_set_updated_at();

-- Indexes
create index if not exists media_assets_category_idx   on media_assets (category);
create index if not exists media_assets_is_active_idx  on media_assets (is_active);
create index if not exists media_assets_created_at_idx on media_assets (created_at desc);
create index if not exists media_assets_media_type_idx on media_assets (media_type);

-- ── Supabase Storage bucket setup ─────────────────────────────────────────
-- Run these in Supabase Dashboard → Storage → Buckets, or via SQL:

-- Create the bucket (if using supabase-js or dashboard, use UI instead)
-- insert into storage.buckets (id, name, public) values ('ruthko-media', 'ruthko-media', true)
-- on conflict (id) do nothing;

-- Storage RLS policies (run in Supabase Storage Policies section):

-- Policy: Public read
-- create policy "Public read ruthko-media"
--   on storage.objects for select
--   using (bucket_id = 'ruthko-media');

-- Policy: Authenticated admins can upload
-- create policy "Admins can upload to ruthko-media"
--   on storage.objects for insert
--   with check (
--     bucket_id = 'ruthko-media'
--     and auth.role() = 'authenticated'
--     and exists (
--       select 1 from public.admin_profiles ap
--       where ap.user_id = auth.uid()
--         and ap.is_active = true
--         and ap.role in ('owner','admin','editor')
--     )
--   );

-- Policy: Owners and admins can delete
-- create policy "Owners and admins can delete from ruthko-media"
--   on storage.objects for delete
--   using (
--     bucket_id = 'ruthko-media'
--     and exists (
--       select 1 from public.admin_profiles ap
--       where ap.user_id = auth.uid()
--         and ap.is_active = true
--         and ap.role in ('owner','admin')
--     )
--   );
