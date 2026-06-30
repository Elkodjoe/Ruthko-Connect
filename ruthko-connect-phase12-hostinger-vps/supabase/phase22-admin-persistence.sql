-- ============================================================
-- Ruthko Connect Phase 22 — Supabase Admin Persistence
-- Run this in your Supabase project → SQL Editor
-- ============================================================

-- 1. site_content table
-- Stores all admin-editable public site content, keyed by
-- section_key + language. JSONB allows any shape per section.
-- ============================================================

create table if not exists site_content (
  id          uuid        primary key default gen_random_uuid(),
  section_key text        not null,
  language    text        not null default 'en',
  content_json jsonb      not null default '{}'::jsonb,
  is_active   boolean     not null default true,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  unique (section_key, language)
);

comment on table site_content is 'Admin-editable public site content. Each row = one section in one language.';
comment on column site_content.section_key is 'e.g. hero, announcement, contact, events, jobs, partners, sponsors, social';
comment on column site_content.language    is 'ISO 639-1: en, fr, es';
comment on column site_content.content_json is 'Freeform JSONB — shape varies per section_key';
comment on column site_content.updated_by  is 'Admin email or identifier — set by the admin UI on save';

-- ============================================================
-- 2. Row Level Security
-- Public read: any visitor can read active rows (needed for
--   public pages to pull content without auth).
-- Admin write: restricted — Phase 23 will tighten this to
--   require a valid session role. For now, writes are
--   blocked by default (no insert/update policy added here).
--   Use the Supabase service-role key from the server only.
-- ============================================================

alter table site_content enable row level security;

-- Public read: active rows only
create policy "Public can read active site content"
  on site_content
  for select
  using (is_active = true);

-- Admin write: service-role key bypasses RLS on the server.
-- Phase 23 will add: using (auth.role() = 'authenticated')
-- for the update/insert policies.

-- ============================================================
-- 3. Updated_at trigger — auto-set on every change
-- ============================================================

create or replace function ruthko_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_content_updated_at on site_content;
create trigger site_content_updated_at
  before update on site_content
  for each row execute function ruthko_set_updated_at();

-- ============================================================
-- 4. Seed data — initial content for all sections
-- This matches data/site-content.json defaults so the DB
-- starts in a known state.
-- ============================================================

insert into site_content (section_key, language, content_json) values

-- Hero: English
('hero', 'en', '{
  "title":    "Staffing, events, sponsors, vendors, and partnerships in one Ruthko platform.",
  "subtitle": "Ruthko supports employers, candidates, event guests, sponsors, vendors, and business partners through a clear intake and follow-up system.",
  "cta1Text": "Request Staff",
  "cta1Link": "intake.html#employer",
  "cta2Text": "View Events",
  "cta2Link": "events.html",
  "cta3Text": "Sponsor Ruthko",
  "cta3Link": "sponsors.html"
}'::jsonb),

-- Hero: French
('hero', 'fr', '{
  "title":    "Personnel, événements, sponsors, vendeurs et partenariats sur une seule plateforme Ruthko.",
  "subtitle": "Ruthko soutient les employeurs, candidats, invités aux événements, sponsors, vendeurs et partenaires commerciaux grâce à un système clair d''accueil et de suivi.",
  "cta1Text": "Demander du personnel",
  "cta1Link": "intake.html#employer",
  "cta2Text": "Voir les événements",
  "cta2Link": "events.html",
  "cta3Text": "Sponsoriser Ruthko",
  "cta3Link": "sponsors.html"
}'::jsonb),

-- Hero: Spanish
('hero', 'es', '{
  "title":    "Personal, eventos, patrocinadores, vendedores y asociaciones en una sola plataforma Ruthko.",
  "subtitle": "Ruthko apoya a empleadores, candidatos, invitados a eventos, patrocinadores, vendedores y socios comerciales a través de un sistema claro de bienvenida y seguimiento.",
  "cta1Text": "Solicitar personal",
  "cta1Link": "intake.html#employer",
  "cta2Text": "Ver eventos",
  "cta2Link": "events.html",
  "cta3Text": "Patrocinar Ruthko",
  "cta3Link": "sponsors.html"
}'::jsonb),

-- Announcement (starts inactive, same text for all langs)
('announcement', 'en', '{"active": false, "link": "", "text": ""}'::jsonb),
('announcement', 'fr', '{"active": false, "link": "", "text": ""}'::jsonb),
('announcement', 'es', '{"active": false, "link": "", "text": ""}'::jsonb),

-- Contact (language-neutral — stored under "en" as single source)
('contact', 'en', '{
  "email":    "info@ruthkojobs.com",
  "phone1":   "+1-701-260-3908",
  "phone2":   "+1-240-486-5002",
  "website":  "https://ruthkojobs.com",
  "footerMessage": "Staffing, event organizing, sponsorship, vendors, and partnerships."
}'::jsonb),

-- Events section intro
('events', 'en', '{"headline": "Ruthko Events and Business Programs", "subtitle": "Professional event organizing for summits, vendor programs, sponsor activations, cultural exchanges, and business networking.", "ctaLink": "intake.html#event"}'::jsonb),
('events', 'fr', '{"headline": "Événements et programmes commerciaux Ruthko", "subtitle": "Organisation professionnelle d''événements pour sommets, programmes de vendeurs, activations de sponsors, échanges culturels et réseautage d''affaires.", "ctaLink": "intake.html#event"}'::jsonb),
('events', 'es', '{"headline": "Eventos y programas de negocios de Ruthko", "subtitle": "Organización profesional de eventos para cumbres, programas de vendedores, activaciones de patrocinadores, intercambios culturales y networking empresarial.", "ctaLink": "intake.html#event"}'::jsonb),

-- Jobs section
('jobs', 'en', '{"headline": "Staffing and candidate opportunity intake.", "subtitle": "Use this page to request workers, register candidate interest, or ask Ruthko about staffing support."}'::jsonb),
('jobs', 'fr', '{"headline": "Recrutement et saisie des opportunités pour les candidats.", "subtitle": "Utilisez cette page pour demander des travailleurs, enregistrer l''intérêt des candidats ou demander à Ruthko un soutien en matière de dotation."}'::jsonb),
('jobs', 'es', '{"headline": "Captación de personal y oportunidades para candidatos.", "subtitle": "Use esta página para solicitar trabajadores, registrar el interés de candidatos o preguntar a Ruthko sobre apoyo en personal."}'::jsonb),

-- Partners section
('partners', 'en', '{"headline": "Partner with Ruthko across jobs, events, sponsorships, and business programs.", "subtitle": "Ruthko works with employers, sponsors, vendors, organizers, community leaders, investors, and institutions."}'::jsonb),
('partners', 'fr', '{"headline": "Partenariat avec Ruthko pour les emplois, événements, sponsorings et programmes d''affaires.", "subtitle": "Ruthko travaille avec les employeurs, sponsors, vendeurs, organisateurs, leaders communautaires, investisseurs et institutions."}'::jsonb),
('partners', 'es', '{"headline": "Asóciese con Ruthko en empleos, eventos, patrocinios y programas de negocios.", "subtitle": "Ruthko trabaja con empleadores, patrocinadores, vendedores, organizadores, líderes comunitarios, inversores e instituciones."}'::jsonb),

-- Sponsors section
('sponsors', 'en', '{"headline": "Sponsor Ruthko events and business programs.", "subtitle": "Choose a sponsor or vendor package. Ruthko will follow up with visibility details, invoice support, and next steps."}'::jsonb),
('sponsors', 'fr', '{"headline": "Sponsorisez les événements et programmes d''affaires de Ruthko.", "subtitle": "Choisissez un package sponsor ou vendeur. Ruthko assurera le suivi avec les détails de visibilité, le support de facturation et les prochaines étapes."}'::jsonb),
('sponsors', 'es', '{"headline": "Patrocine los eventos y programas de negocios de Ruthko.", "subtitle": "Elija un paquete de patrocinador o vendedor. Ruthko hará seguimiento con detalles de visibilidad, soporte de facturación y próximos pasos."}'::jsonb),

-- Social links
('social', 'en', '{
  "facebook":  "",
  "instagram": "",
  "linkedin":  "",
  "tiktok":    "",
  "youtube":   "",
  "twitter":   ""
}'::jsonb)

on conflict (section_key, language) do nothing;

-- ============================================================
-- Verification query — run after to confirm rows were inserted
-- ============================================================
-- select section_key, language, updated_at from site_content order by section_key, language;
