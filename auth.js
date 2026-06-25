// ─── Config ──────────────────────────────────────────────────────────────────
// Values come from config.js, which is generated at build time (Amplify)
// or copied from config.example.js for local development.

console.log('[auth.js] ▶ script loaded');
console.log('[auth.js] window.APP_CONFIG =', window.APP_CONFIG);

if (!window.APP_CONFIG) {
  console.error('[auth.js] ✗ window.APP_CONFIG is undefined — config.js may not have loaded');
  throw new Error('[auth.js] APP_CONFIG not defined');
}

const { cognitoDomain, clientId, redirectUri } = window.APP_CONFIG;

console.log('[auth.js] Config values:', {
  cognitoDomain: cognitoDomain || '✗ MISSING',
  clientId:      clientId      || '✗ MISSING',
  redirectUri:   redirectUri   || '✗ MISSING',
});

const TOKEN_KEY = 'hti_id_token';

// ─── JWT Helpers ─────────────────────────────────────────────────────────────
function decodeJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (e) {
    console.error('[auth.js] ✗ decodeJwt failed — token may be malformed:', e);
    return null;
  }
}

function isTokenExpired(claims) {
  const expMs   = claims.exp * 1000;
  const nowMs   = Date.now();
  const expired = expMs < nowMs;
  console.log('[auth.js] Token expiry check:', {
    exp:        new Date(expMs).toISOString(),
    now:        new Date(nowMs).toISOString(),
    isExpired:  expired,
  });
  return expired;
}

// ─── Session Storage ─────────────────────────────────────────────────────────
function getStoredToken()  { return sessionStorage.getItem(TOKEN_KEY); }
function storeToken(token) { sessionStorage.setItem(TOKEN_KEY, token); }
function clearToken()      { sessionStorage.removeItem(TOKEN_KEY); }

// ─── Cognito Hosted UI ───────────────────────────────────────────────────────
function redirectToLogin() {
  const url = new URL(`https://${cognitoDomain}/login`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  console.warn('[auth.js] ➜ Redirecting to Cognito login:', url.toString());
  window.location.href = url.toString();
}

// ─── Sign Out ────────────────────────────────────────────────────────────────
function signOut() {
  console.log('[auth.js] signOut() called — clearing token and redirecting to Cognito logout');
  clearToken();
  const url = new URL(`https://${cognitoDomain}/logout`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('logout_uri', redirectUri);
  console.warn('[auth.js] ➜ Redirecting to logout URL:', url.toString());
  window.location.href = url.toString();
}

// ─── Authorization Code Exchange ─────────────────────────────────────────────
async function exchangeCodeForTokens(code) {
  console.log('[auth.js] exchangeCodeForTokens() — exchanging code for tokens...');

  const tokenEndpoint = `https://${cognitoDomain}/oauth2/token`;
  console.log('[auth.js] Token endpoint:', tokenEndpoint);
  console.log('[auth.js] Params:', { client_id: clientId, redirect_uri: redirectUri });

  const res = await fetch(tokenEndpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      client_id:    clientId,
      redirect_uri: redirectUri,
      code
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[auth.js] ✗ Token exchange failed:', res.status, err);
    throw new Error(`Token exchange failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  console.log('[auth.js] ✓ Token exchange succeeded. Keys returned:', Object.keys(data));

  if (!data.id_token) {
    console.error('[auth.js] ✗ No id_token in response — got:', data);
    throw new Error('No id_token returned from Cognito');
  }

  storeToken(data.id_token);
  console.log('[auth.js] ✓ id_token stored in sessionStorage');

  // Remove ?code=... from the URL bar without triggering a reload
  window.history.replaceState({}, '', window.location.pathname);
  console.log('[auth.js] ✓ ?code= removed from URL bar');

  return data.id_token;
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
(async () => {
  console.log('[auth.js] ▶ Bootstrap starting...');
  console.log('[auth.js] Current URL:', window.location.href);

  try {
    let token;

    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');

    if (code) {
      console.log('[auth.js] ✓ ?code= found in URL — starting token exchange');
      token = await exchangeCodeForTokens(code);
    } else {
      console.log('[auth.js] No ?code= in URL — checking sessionStorage for existing token');
      token = getStoredToken();

      if (token) {
        console.log('[auth.js] ✓ Found stored token in sessionStorage');
      } else {
        console.warn('[auth.js] ✗ No stored token found');
      }
    }

    if (!token) {
      console.warn('[auth.js] No token available — redirecting to login');
      redirectToLogin();
      return;
    }

    const claims = decodeJwt(token);

    if (!claims) {
      console.error('[auth.js] ✗ Failed to decode token — clearing and redirecting to login');
      clearToken();
      redirectToLogin();
      return;
    }

    console.log('[auth.js] Token claims:', {
      sub:        claims.sub,
      email:      claims.email,
      given_name: claims.given_name,
      exp:        new Date(claims.exp * 1000).toISOString(),
      iss:        claims.iss,
      aud:        claims.aud,
    });

    if (isTokenExpired(claims)) {
      console.warn('[auth.js] ✗ Token is expired — clearing and redirecting to login');
      clearToken();
      redirectToLogin();
      return;
    }

    console.log('[auth.js] ✓ Token is valid and not expired');

    const name = claims.given_name 'there';
    console.log('[auth.js] Greeting user as:', name);

    const greetSpan = document.querySelector('.greet span');
    if (greetSpan) {
      greetSpan.textContent = name;
      console.log('[auth.js] ✓ Greeting span updated');
    } else {
      console.warn('[auth.js] ✗ .greet span not found in DOM — greeting not updated');
    }

    console.log('[auth.js] ✅ Auth bootstrap complete');

  } catch (err) {
    console.error('[auth.js] ✗ Uncaught error in bootstrap:', err);
    clearToken();
    redirectToLogin();
  }
})();
