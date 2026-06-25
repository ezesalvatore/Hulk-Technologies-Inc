const CATEGORY_LABELS = {
  laptops:  'Laptops',
  desktops: 'Desktop Workstations',
  monitors: 'Monitors',
  switches: 'Network Switches',
  av:       'AV Equipment'
};

// ─── Diagnostics ─────────────────────────────────────────────────────────────
console.log('[script.js] loaded');
console.log('[script.js] window.APP_CONFIG =', window.APP_CONFIG);

if (!window.APP_CONFIG) {
  console.error('[script.js] APP_CONFIG is undefined. Check these in order:');
  console.error('  1. Open DevTools → Network tab → look for config.js');
  console.error('     If it shows 404, config.js is not in the Amplify build artifacts');
  console.error('  2. Check the Amplify build log — did generate-config.js run?');
  console.error('  3. Are all 5 env vars set in Amplify console → Environment variables?');
  throw new Error('[script.js] APP_CONFIG not defined — see console errors above');
}

console.log('[script.js] APP_CONFIG loaded OK:', {
  cognitoDomain:    window.APP_CONFIG.cognitoDomain    ? '✓ set' : '✗ empty',
  clientId:         window.APP_CONFIG.clientId         ? '✓ set' : '✗ empty',
  redirectUri:      window.APP_CONFIG.redirectUri      ? '✓ set' : '✗ empty',
  listEquipmentUrl: window.APP_CONFIG.listEquipmentUrl ? '✓ set' : '✗ empty',
  reserveUrl:       window.APP_CONFIG.reserveUrl       ? '✓ set' : '✗ empty',
});

const { listEquipmentUrl: LIST_EQUIPMENT_URL, reserveUrl: RESERVE_URL } = window.APP_CONFIG;

let equipmentCache = null;

async function fetchEquipment() {
  if (equipmentCache) return equipmentCache;
  const res = await fetch(LIST_EQUIPMENT_URL);
  if (!res.ok) throw new Error(`Failed to load equipment (${res.status})`);
  equipmentCache = await res.json();
  return equipmentCache;
}

async function openCategory(category) {
  const rowsEl    = document.getElementById('rows');
  const titleEl   = document.getElementById('listTitle');
  const metaEl    = document.getElementById('listMeta');
  const gridEl    = document.getElementById('catalogGrid');
  const listEl    = document.getElementById('listView');

  // Show list view immediately with a loading state
  titleEl.textContent = CATEGORY_LABELS[category] ?? category;
  metaEl.textContent  = 'Loading...';
  rowsEl.innerHTML    = '';
  gridEl.style.display = 'none';
  listEl.style.display = 'block';
  document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });

  try {
    const all   = await fetchEquipment();
    const items = all.filter(item => item.category === category);

    metaEl.textContent = `${items.length} model${items.length !== 1 ? 's' : ''} available for reservation`;

    rowsEl.innerHTML = items.map(item => {
      let cls = '', label = `${item.stock} in stock`;
      if (item.stock === 0)       { cls = 'out'; label = 'Out of stock'; }
      else if (item.stock <= 10)  { cls = 'low'; label = `Only ${item.stock} left`; }

      const btn = !item.available || item.stock === 0
        ? `<button class="reserve" disabled>Unavailable</button>`
        : `<button class="reserve" onclick="reserve('${item.equipmentId}', this)">Reserve</button>`;

      return `<div class="row">
        <div class="ricon"><img src="${item.imageKey}" alt="${item.name}"></div>
        <div>
          <div class="name">${item.name}</div>
          <div class="spec">${item.spec}</div>
        </div>
        <div class="price">$${item.costPerDay}<small>PER DAY</small></div>
        <div class="stock ${cls}"><span class="d"></span>${label}</div>
        ${btn}
      </div>`;
    }).join('');

  } catch (err) {
    console.error('openCategory error:', err);
    metaEl.textContent = 'Failed to load equipment. Please try again.';
  }
}

function showCategories() {
  document.getElementById('listView').style.display  = 'none';
  document.getElementById('catalogGrid').style.display = 'block';
}

function getUserEmail() {
  try {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const idToken = params.get('id_token') || sessionStorage.getItem('id_token');
    if (idToken) {
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      return payload.email || '2kfinest14@gmail.com';
    }
  } catch (e) {
    console.warn('Could not extract email from token:', e);
  }
  return '2kfinest14@gmail.com';
}

async function reserve(equipmentId, btn) {

  btn.disabled = true;
  btn.textContent = 'Reserving...';

  try {

    const response = await fetch(RESERVE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
     body: JSON.stringify({
  equipmentId: equipmentId,
  userEmail: getUserEmail()
})
    });

    const result = await response.json();

    console.log(result);

    if (!response.ok) {
      throw new Error(result.message || 'Reservation failed');
    }

    btn.classList.add('queued');
    btn.textContent = 'Reserved ✓';

    alert('Reservation successful');

  } catch (err) {

    console.error(err);

    btn.disabled = false;
    btn.textContent = 'Reserve';

    alert(err.message);
  }
}
