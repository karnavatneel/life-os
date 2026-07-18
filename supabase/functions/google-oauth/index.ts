// supabase/functions/google-oauth/index.ts
//
// Exchanges a Google OAuth "authorization code" (PKCE) for tokens, or
// refreshes an existing refresh_token — using GOOGLE_CLIENT_SECRET, which
// stays on the server and is never exposed to the browser bundle.
//
// Deploy:   supabase functions deploy google-oauth
// Secrets:  supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...
//
// Request body:
//   { action: "exchange", code, code_verifier, redirect_uri }
//   { action: "refresh",  refresh_token }

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return json({ error: 'server_misconfigured', error_description: 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set on the Edge Function.' }, 500);
    }

    const body = await req.json();
    const params = new URLSearchParams();
    params.set('client_id', clientId);
    params.set('client_secret', clientSecret);

    if (body.action === 'exchange') {
      if (!body.code || !body.code_verifier || !body.redirect_uri) {
        return json({ error: 'invalid_request', error_description: 'code, code_verifier, redirect_uri are required' }, 400);
      }
      params.set('grant_type', 'authorization_code');
      params.set('code', body.code);
      params.set('code_verifier', body.code_verifier);
      params.set('redirect_uri', body.redirect_uri);
    } else if (body.action === 'refresh') {
      if (!body.refresh_token) {
        return json({ error: 'invalid_request', error_description: 'refresh_token is required' }, 400);
      }
      params.set('grant_type', 'refresh_token');
      params.set('refresh_token', body.refresh_token);
    } else {
      return json({ error: 'invalid_request', error_description: 'action must be "exchange" or "refresh"' }, 400);
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const data = await tokenRes.json();
    if (!tokenRes.ok) {
      return json({ error: data.error ?? 'token_exchange_failed', error_description: data.error_description ?? '' }, tokenRes.status);
    }

    return json(data, 200);
  } catch (e) {
    return json({ error: 'internal_error', error_description: String(e) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
