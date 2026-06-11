// ─── Config ──────────────────────────────────────────────────────────────────
// Values come from config.js, which is generated at build time (Amplify)
// or copied from config.example.js for local development.
const { cognitoDomain, clientId, redirectUri } = window.APP_CONFIG;

const TOKEN_KEY = 'hti_id_token';

// ─── JWT Helpers ─────────────────────────────────────────────────────────────
function decodeJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

function isTokenExpired(claims) {
  return claims.exp * 1000 < Date.now();
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
  window.location.href = url.toString();
}

// ─── Authorization Code Exchange ─────────────────────────────────────────────
async function exchangeCodeForTokens(code) {
  const res = await fetch(`https://${cognitoDomain}/oauth2/token`, {
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
    throw new Error(`Token exchange failed: ${err}`);
  }

  const { id_token } = await res.json();
  storeToken(id_token);

  // Remove ?code=... from the URL bar without triggering a reload
  window.history.replaceState({}, '', window.location.pathname);

  return id_token;
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
(async () => {
  try {
    let token;

    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');

    if (code) {
      token = await exchangeCodeForTokens(code);
    } else {
      token = getStoredToken();
    }

    if (!token) {
      redirectToLogin();
      return;
    }

    const claims = decodeJwt(token);

    if (isTokenExpired(claims)) {
      clearToken();
      redirectToLogin();
      return;
    }

    const name = claims.given_name || claims.name || claims.email || 'there';
    const greetSpan = document.querySelector('.greet span');
    if (greetSpan) greetSpan.textContent = name;

  } catch (err) {
    console.error('Auth error:', err);
    clearToken();
    redirectToLogin();
  }
})();