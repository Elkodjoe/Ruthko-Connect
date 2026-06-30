# Phase 24 — Admin Audit Log and Change History

## Overview

Phase 24 adds complete accountability to Ruthko Connect's admin system. Every important admin action is recorded, filterable, exportable, and linked to content version history for rollback support.

## Files Added

| File | Purpose |
|------|---------|
| `js/admin-audit-log.js` | Core logger: writes to Supabase + localStorage, hooks Phase 22/23 events |
| `js/admin-change-history.js` | Version save/load/restore for content sections |
| `admin-audit.html` | Audit log viewer with filters, search, export, version restore |
| `supabase/phase24-admin-audit-log.sql` | Tables, RLS policies, indexes |
| `docs/PHASE24_ADMIN_AUDIT_LOG.md` | This file |

## Database

### `admin_audit_logs`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| admin_user_id | uuid | FK → auth.users |
| admin_email | text | Denormalized for display |
| admin_role | text | Role at time of action |
| action_type | text | See action list below |
| entity_type | text | site_content, event, job, etc. |
| entity_id | text | Row ID of affected entity |
| entity_label | text | Human-readable name |
| before_json | jsonb | Previous state |
| after_json | jsonb | New state |
| user_agent | text | Browser |
| created_at | timestamptz | Auto-set |

### `admin_change_versions`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| entity_type | text | e.g. site_content |
| entity_key | text | e.g. hero, announcement |
| language | text | en, fr, es |
| version_number | integer | Auto-incremented per entity+lang |
| content_json | jsonb | Full content snapshot |
| changed_by | uuid | User ID |
| changed_by_email | text | Denormalized |
| change_note | text | Optional restore/save note |
| created_at | timestamptz | Auto-set |

## Tracked Actions

```
admin_login        admin_logout       content_save       content_import
content_export     announcement_update event_create      event_update
event_delete       job_create         job_update         job_delete
partner_update     sponsor_update     campaign_create    campaign_send
task_create        task_update        settings_update    role_update
access_denied
```

## Permissions

| Role   | Audit Log Access | Version Restore |
|--------|-----------------|-----------------|
| owner  | All records | Yes |
| admin  | All records | Yes |
| editor | Own changes only | View only |
| viewer | No access | No access |

## Script Load Order

All 7 admin pages + admin-audit.html load:

```html
<script src="js/admin-audit-log.js"></script>
<script src="js/admin-change-history.js"></script>
```

`admin-audit.html` also loads Phase 23 scripts:
```html
<script src="js/admin-auth.js"></script>
<script src="js/admin-roles.js"></script>
<script src="js/admin-guard.js"></script>
```

## Phase 22 Integration

`admin-audit-log.js` listens for events fired by `admin-content-sync.js`:
- `ruthko:save-status` → logs `content_save`
- `ruthko:content-synced` → logs `content_save` (full sync)

When Phase 22 is merged to main, content saves are automatically logged.

## Phase 23 Integration

`admin-audit-log.js` listens for:
- `ruthko:role-ready` → logs `admin_login`

`admin-guard.js` (Phase 23) fires access denied events which are captured.

## Public API

```javascript
// Log a custom action
ruthkoAuditLog.log('event_create', {
  entityType: 'event',
  entityLabel: 'Ruthko Summit 2026',
  after: { title: 'Ruthko Summit 2026', date: '2026-09-01' }
});

// Fetch logs
var result = await ruthkoAuditLog.getLogs({ limit: 100, actionType: 'content_save' });

// Export CSV
ruthkoAuditLog.exportCsv(result.data);

// Save a content version
await ruthkoChangeHistory.saveVersion('site_content', 'hero', 'en', contentObj, { note: 'Updated headline' });

// Restore a version (owner/admin only)
var result = await ruthkoChangeHistory.restoreVersion(versionId, 'owner');
```

## Sidebar

Audit Log appears between Reports and CRM in all admin pages (position 6 of 13):

```
Reports → Audit Log → CRM & Sales
```

## Sample Mode

In sample mode (`sampleMode: true`), all logging works via `localStorage`. No Supabase rows are written. The audit log viewer reads from localStorage and shows all captured actions.
