// ─────────────────────────────────────────────────────────────────────────────
// config.example.js — TEMPLATE ONLY, safe to commit
//
// For local development:
//   1. Copy this file to config.js  (cp config.example.js config.js)
//   2. Fill in your values
//   3. config.js is gitignored — never commit it
//
// For production (Amplify):
//   config.js is generated automatically by amplify.yml from env vars
//   set in the Amplify console. You do not need to touch this file there.
// ─────────────────────────────────────────────────────────────────────────────

window.APP_CONFIG = {
  cognitoDomain:    'YOUR_DOMAIN_PREFIX.auth.us-east-1.amazoncognito.com',
  clientId:         'YOUR_COGNITO_CLIENT_ID',
  redirectUri:      'http://localhost:8080',
  listEquipmentUrl: 'YOUR_API_GATEWAY_BASE_URL/list-equipment',
  reserveUrl:       'YOUR_API_GATEWAY_BASE_URL/reserve'
};
