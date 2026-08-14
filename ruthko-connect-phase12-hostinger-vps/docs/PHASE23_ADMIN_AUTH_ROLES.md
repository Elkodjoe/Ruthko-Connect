# Phase 23 — Admin Login and Role Permissions

## Overview

Phase 23 adds role-based access control on top of the existing Supabase Auth login system. Every admin page now checks the user's role from the `admin_profiles` table before allowing access.

## Roles

| Role   | Access level |
|--------|-------------|
| owner  | Full access including role management and owner-only settings |
| admin  | Full access except owner settings and role management |
| editor | Content, events, jobs, sponsors, partners, campaigns |
| viewer | Read-only: dashboard and reports only |

## Files Added

| File | Purpose |
|------|---------|
| `js/admin-auth.js` | Fetches `admin_profiles` row for current user; role caching in sessionStorage |
| `js/admin-roles.js` | Permission map, `ruthkoCanDo(action, role)`, `ruthkoApplyRoleUI(role)` |
| `js/admin-guard.js` | Runs after auth-guard.js; blocks inactive accounts, enforces page-level roles |
| `admin-login.html` | Enhanced login page with role legend and better UX |
| `supabase/phase23-admin-auth-roles.sql` | `admin_profiles` table, RLS policies, trigger |
| `docs/PHASE23_ADMIN_AUTH_ROLES.md` | This file |

## Database

### `admin_profiles` table

```sql
user_id    uuid (FK → auth.users, unique)
role       text — 'owner' | 'admin' | 'editor' | 'viewer'
full_name  text
is_active  boolean (default false — owner must activate)
```

RLS policies:
- Every user can SELECT their own row
- Active owners and admins can SELECT all rows
- Only active owners can INSERT/UPDATE/DELETE any row
- Any authenticated user can self-register as a pending viewer (is_active = false)

### Seeding the first owner

After connecting Supabase and logging in for the first time:

1. Go to Supabase Dashboard → Authentication → Users
2. Copy your user UUID
3. Run in SQL Editor:

```sql
insert into admin_profiles (user_id, role, full_name, is_active)
values ('YOUR-UUID', 'owner', 'Emmanuel Kodjoe', true)
on conflict (user_id) do update set role='owner', is_active=true;
```

## Script Load Order (all admin pages)

```html
<script src="js/supabase-config.js"></script>
<script src="js/auth.js"></script>
<script src="js/auth-guard.js"></script>   <!-- existing: redirects if not logged in -->
<script src="js/admin-auth.js"></script>   <!-- Phase 23: fetches admin_profiles -->
<script src="js/admin-roles.js"></script>  <!-- Phase 23: permission map + UI -->
<script src="js/admin-guard.js"></script>  <!-- Phase 23: role enforcement -->
```

## Permission System

### `ruthkoCanDo(action, role)`

```javascript
ruthkoCanDo('saveContent', 'editor') // true
ruthkoCanDo('manageRoles', 'admin')  // false
ruthkoCanDo('viewReports', 'viewer') // true
```

### Declarative HTML attributes

```html
<!-- Hide element if role not in list -->
<div data-requires-role="owner,admin">Owner/admin only content</div>

<!-- Hide if user cannot do this action -->
<button data-requires-permission="manageRoles">Manage Roles</button>

<!-- Disable button if user cannot do this action -->
<button data-permission-disable="saveContent">Save Content</button>
```

### `ruthkoApplyRoleUI(role)`

Called automatically by `admin-guard.js` after role is confirmed. Also fires `ruthko:role-ready` event:

```javascript
document.addEventListener('ruthko:role-ready', function(e) {
  console.log(e.detail.role); // 'editor'
});
```

## Page-Level Restriction

Add `data-page-role` to `<body>` to restrict a page to specific roles:

```html
<body data-page-role="owner">  <!-- owner only -->
<body data-page-role="owner,admin">  <!-- owner and admin -->
```

## Sample Mode

When `sampleMode: true` in `supabase-config.js`, any login attempt succeeds and the user is treated as `owner`. No `admin_profiles` row is required.

## Phase 22 Integration

- Viewer role cannot save shared content (save buttons are disabled by `admin-guard.js`)
- Editor and above can save hero and announcement content
- Phase 22's save status messages still display for all roles; only the button action is blocked

## Pages Protected

All 7 admin pages load the Phase 23 scripts:
- `admin.html`
- `content-manager.html`
- `ai-studio.html`
- `reports.html`
- `crm.html`
- `tasks.html`
- `campaigns.html`
