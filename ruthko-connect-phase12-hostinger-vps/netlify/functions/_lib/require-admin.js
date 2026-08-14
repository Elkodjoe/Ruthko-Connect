// Server-side counterpart to js/admin-auth.js's client-side role check.
// The client already resolves a Supabase session and looks up the caller's
// row in admin_profiles — this verifies the same session token and role
// server-side, because a client-side check alone is not a real authorization
// boundary (a caller can just skip the browser and hit the endpoint directly).
//
// Fails CLOSED, not open: if Supabase isn't configured (sample mode /
// placeholder credentials), privileged actions are refused rather than
// silently allowed through. The previous behavior — allow everything when
// ADMIN_SETTINGS_TOKEN wasn't set — is exactly the bug this replaces.

async function requireAdmin(event, { allowedRoles = ['owner', 'admin'] } = {}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return {
      authorized: false,
      statusCode: 503,
      error: 'Supabase is not configured on this server — admin actions are disabled until real credentials are set (see .env.example).',
    };
  }

  const headers = event.headers || {};
  const authHeader = headers.authorization || headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return { authorized: false, statusCode: 401, error: 'Missing admin session token' };
  }

  let user;
  try {
    const userRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) {
      return { authorized: false, statusCode: 401, error: 'Invalid or expired session' };
    }
    user = await userRes.json();
  } catch (error) {
    return { authorized: false, statusCode: 502, error: 'Could not verify session with Supabase' };
  }
  if (!user || !user.id) {
    return { authorized: false, statusCode: 401, error: 'Invalid session' };
  }

  let profile;
  try {
    const profileRes = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/admin_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=role,is_active`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!profileRes.ok) {
      return { authorized: false, statusCode: 502, error: 'Could not verify admin role' };
    }
    const rows = await profileRes.json();
    profile = rows[0];
  } catch (error) {
    return { authorized: false, statusCode: 502, error: 'Could not verify admin role' };
  }

  if (!profile || !profile.is_active) {
    return { authorized: false, statusCode: 403, error: 'No active admin profile for this account' };
  }
  if (!allowedRoles.includes(profile.role)) {
    return { authorized: false, statusCode: 403, error: `Requires one of: ${allowedRoles.join(', ')}` };
  }

  return { authorized: true, user, profile };
}

// Supports two auth paths: a static shared secret (ADMIN_SETTINGS_TOKEN, for
// simple ops without full Supabase Auth wired up client-side yet) or a real
// Supabase admin session (requireAdmin above). An unset token env var falls
// back to requiring a verified session — it never means "skip authorization."
async function checkAdminAuthorized(event, opts = {}) {
  const requiredToken = process.env.ADMIN_SETTINGS_TOKEN;
  if (requiredToken) {
    const headers = event.headers || {};
    const supplied = headers['x-admin-settings-token'] || headers['X-Admin-Settings-Token'];
    if (supplied === requiredToken) return { authorized: true };
    return { authorized: false, statusCode: 401, error: 'Invalid admin settings token' };
  }
  return requireAdmin(event, opts);
}

module.exports = { requireAdmin, checkAdminAuthorized };
