# Phase 22 — Supabase Admin Persistence

Moves the Phase 21 shared content system from localStorage into Supabase,
while keeping localStorage and JSON as automatic fallbacks.

---

## What was added

| File | Purpose |
|---|---|
| `supabase/phase22-admin-persistence.sql` | Creates `site_content` table, RLS policy, trigger, and seed data |
| `js/supabase-content-service.js` | Low-level CRUD for the `site_content` table |
| `js/admin-content-sync.js` | Orchestrates 3-tier load/save; updates admin UI with save status |

---

## Database setup

Run `supabase/phase22-admin-persistence.sql` in your Supabase project → SQL Editor.

This creates:

```sql
site_content (
  id           uuid PRIMARY KEY,
  section_key  text NOT NULL,        -- 'hero', 'announcement', 'contact', etc.
  language     text NOT NULL,        -- 'en', 'fr', 'es'
  content_json jsonb NOT NULL,       -- freeform content per section
  is_active    boolean DEFAULT true,
  updated_at   timestamptz,
  updated_by   text                  -- admin email set on save
  UNIQUE (section_key, language)
)
```

RLS is enabled. Public visitors can SELECT active rows (needed for public pages).
Admin writes currently require the Supabase service-role key on the server.
Phase 23 will add `auth.role() = 'authenticated'` policies for login-gated writes.

---

## Content load order (public pages and admin)

```
1. Supabase (site_content table, is_active = true)
   ↓ if unavailable or empty
2. localStorage key: ruthko_content_v1
   ↓ if empty
3. data/site-content.json (static JSON file)
   ↓ if fetch fails
4. Hardcoded defaults in admin-data.js
```

The source is cached in `localStorage.ruthko_content_source_v1`.

---

## Save behavior

When admin clicks Save on Hero or Announcement Banner:

| Supabase configured? | Result |
|---|---|
| Yes — upsert succeeds | "Saved to Supabase ✓" (green) |
| Yes — upsert fails | "Saved locally only" (yellow) — localStorage still updated |
| No (sampleMode or missing keys) | "Saved locally only" (yellow) |

Both Supabase and localStorage are always updated on save.
Export JSON and Import JSON buttons from Phase 21 remain functional.

---

## Section keys seeded

| section_key | Languages |
|---|---|
| `hero` | en, fr, es |
| `announcement` | en, fr, es |
| `contact` | en |
| `events` | en, fr, es |
| `jobs` | en, fr, es |
| `partners` | en, fr, es |
| `sponsors` | en, fr, es |
| `social` | en |

---

## Pages updated

All five public pages (`index.html`, `events.html`, `jobs.html`, `partners.html`,
`sponsors.html`) now load in this script order:

```html
<script src="js/supabase-content-service.js"></script>
<script src="js/admin-data.js"></script>
<script src="js/admin-content-sync.js"></script>
```

`content-manager.html` also loads all three, plus the existing `content-manager.js`.

---

## What Phase 23 will add

- Admin login via Supabase Auth
- RLS update/insert policies: `auth.role() = 'authenticated'`
- Per-admin `updated_by` tracking using `auth.email()`
- Protected admin routes (redirect to login if no session)
