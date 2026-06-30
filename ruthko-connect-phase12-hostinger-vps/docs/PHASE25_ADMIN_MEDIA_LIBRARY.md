# Phase 25 — Admin Media Library and File Uploads

## Overview

Phase 25 adds a full media management system. Admins upload, organize, preview, and reuse images, flyers, banners, logos, PDFs, and documents across the public site via Supabase Storage.

## Files Added

| File | Purpose |
|------|---------|
| `media-library.html` | Full admin media library page |
| `js/media-upload-service.js` | Supabase Storage upload/delete/URL service |
| `js/admin-media-library.js` | CRUD for `media_assets` table, upload+save combo |
| `js/media-picker.js` | Reusable modal picker for selecting media on any admin page |
| `supabase/phase25-admin-media-library.sql` | Table, RLS policies, storage bucket SQL |
| `docs/PHASE25_ADMIN_MEDIA_LIBRARY.md` | This file |

## Database

### `media_assets` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| file_name | text | Original filename |
| file_path | text | Path in Supabase Storage bucket |
| file_url | text | Public URL |
| bucket_name | text | `ruthko-media` |
| mime_type | text | e.g. image/png |
| file_size | bigint | Bytes |
| media_type | text | image, pdf, document |
| category | text | See category list |
| title | text | Admin-set display name |
| alt_text | text | Accessibility description |
| description | text | Optional notes |
| uploaded_by | uuid | FK → auth.users |
| uploaded_by_email | text | Denormalized |
| is_active | boolean | Soft-delete flag |

### RLS Policies

| Policy | Who |
|--------|-----|
| SELECT | Public (is_active = true) |
| INSERT | Active owner, admin, editor |
| UPDATE | Active owner, admin, editor |
| DELETE | Active owner, admin only |

## Supabase Storage Setup

1. Go to Supabase Dashboard → Storage → Buckets
2. Create bucket: `ruthko-media` (set to **Public**)
3. Add storage policies (see SQL file comments for exact SQL)

### Bucket folder structure

```
ruthko-media/
  public/logos/
  public/banners/
  public/events/
  public/sponsors/
  public/partners/
  public/jobs/
  public/reports/
  public/social/
  public/general/
```

## Allowed File Types

`jpg`, `jpeg`, `png`, `webp`, `gif`, `svg`, `pdf`, `doc`, `docx` — max 20 MB each

## Media Categories

`logo` · `banner` · `event flyer` · `sponsor logo` · `partner logo` · `team photo` · `job document` · `report` · `social graphic` · `general`

## Admin Permissions

| Role | Upload | Edit | Delete | View |
|------|--------|------|--------|------|
| owner | ✓ | ✓ | ✓ | ✓ |
| admin | ✓ | ✓ | ✓ | ✓ |
| editor | ✓ | ✓ | ✗ | ✓ |
| viewer | ✗ | ✗ | ✗ | ✓ |

## Media Picker (Reusable Modal)

Add to any admin page:
```html
<script src="js/media-upload-service.js"></script>
<script src="js/admin-media-library.js"></script>
<script src="js/media-picker.js"></script>
```

Usage:
```javascript
ruthkoMediaPicker.open({
  title: 'Select Hero Image',
  contentSlot: 'hero.imageUrl',   // saves to Phase 21/22 content layer
  filter: function(asset) { return asset.media_type === 'image'; },
  onSelect: function(asset) {
    document.getElementById('heroPreview').src = asset.file_url;
  }
});
```

## Phase 21/22 Integration

When `contentSlot` is set in the picker options, the selected URL is saved into the `ruthko_content_v1` localStorage key under the specified dot-path. Phase 22's `ruthkoApplyContent()` will pick it up on next page load.

Example content slots:
- `hero.imageUrl` — hero section background
- `events.bannerUrl` — event banner
- `sponsors.logoUrl` — sponsor logo
- `partners.logoUrl` — partner logo
- `social.graphicUrl` — social graphic

## Audit Log Integration

Every action is logged via `ruthkoAuditLog.log()`:

| Action | Trigger |
|--------|---------|
| `media_upload` | File uploaded successfully |
| `media_update` | Title/alt/category edited |
| `media_delete` | File deleted |
| `media_select` | File chosen via picker |
| `media_copy_url` | URL copied to clipboard |

## Sample Mode

When `sampleMode: true`:
- Files are converted to data URLs and stored in `localStorage` (`ruthko_media_sample_v1`)
- DB rows stored in `localStorage` (`ruthko_media_assets_v1`)
- No Supabase calls are made
- Full library UI works without Supabase credentials

## Script Load Order (admin pages)

```html
<script src="js/media-upload-service.js"></script>
<script src="js/admin-media-library.js"></script>
<script src="js/media-picker.js"></script>
```

`media-library.html` also loads Phase 23/24 scripts for role enforcement and audit logging.

## Sidebar Position

Media Library appears at position 4 in the sidebar (after AI Studio, before Event Ops):

```
Quick Change → AI Studio → Media Library → Event Ops
```
