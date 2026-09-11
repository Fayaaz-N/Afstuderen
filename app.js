// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
const state = {
  step: 'idle',
  cashIn: 0,
  cashTarget: 0,
  kentekenInput: '',
  foundPlate: null,
};

// ─────────────────────────────────────────────
//  KENTEKEN DATABASE
// ─────────────────────────────────────────────
let kentekenDB = [
  { plate: 'AB-123-C', euro: 3.50, duur: '2u 15m', tijd: '13:22' },
  { plate: 'XX-555-Y', euro: 6.00, duur: '4u',     tijd: '10:05' },
];

function lookupPlate(input) {
  const clean = (s) => (s || '').replace(/-/g, '').toUpperCase();
  return kentekenDB.find(k => clean(k.plate) === clean(input));
}

// ─────────────────────────────────────────────
//  ADMIN CONFIG
// ─────────────────────────────────────────────
function getConfig() {
  const [duur, euroStr] = document.getElementById('cfg-duur').value.split('|');
  const euro = parseFloat(euroStr);
  return {
    kaartVast:    document.getElementById('cfg-kaart-vast').checked,
    muntDefect:   document.getElementById('cfg-munt-defect').checked,
    briefDefect:  document.getElementById('cfg-brief-defect').checked,
    barcodeDefect:document.getElementById('cfg-barcode-defect').checked,
    gepast:       document.getElementById('cfg-gepast').checked,
    ticketFout:   document.getElementById('cfg-ticket-fout').checked,
    duur,
    euro,
    euroStr: '€ ' + euro.toFixed(2).replace('.', ','),
    garage:  document.getElementById('cfg-garage').value,
    wachtrij:parseInt(document.getElementById('cfg-wachtrij').value),
  };
}

// ─────────────────────────────────────────────
//  KENTEKEN LIST UI
// ─────────────────────────────────────────────
function renderKentekenList() {
  const list = document.getElementById('kenteken-list');
  list.innerHTML = kentekenDB.map((k, i) => `
    <div class="kenteken-item">
      <span class="kenteken-item__plate">${k.plate}</span>
      <span class="kenteken-item__price">€ ${k.euro.toFixed(2).replace('.', ',')}</span>
      <button class="kenteken-item__remove" onclick="removeKenteken(${i})">✕</button>
    </div>
  `).join('');
}

function addKenteken() {
  const plateInput = document.getElementById('kenteken-new-plate');
  const priceInput = document.getElementById('kenteken-new-price');
  const plate = plateInput.value.trim().toUpperCase();
  const euro  = parseFloat(priceInput.value.replace(',', '.').replace('€', '').trim());

  if (!plate || isNaN(euro)) return;

  kentekenDB.push({ plate, euro, duur: getConfig().duur, tijd: 'Nu' });
  plateInput.value = '';
  priceInput.value = '';
  renderKentekenList();
}

function removeKenteken(index) {
  kentekenDB.splice(index, 1);
  renderKentekenList();
}

// ─────────────────────────────────────────────
//  HARDWARE SLOT HELPERS
// ─────────────────────────────────────────────
// SVG glow IDs map
const GLOW_MAP = {
  'slot-kaart':    'glow-kaart',
  'slot-barcode':  'glow-barcode',
  'slot-brief':    'glow-brief',
  'slot-munten':   'glow-munten',
  'slot-wissel':   'glow-wissel',
  'slot-kwitantie':'glow-kvt',
  'slot-intercom': 'glow-intercom',
};

const STATE_COLORS = {
  active:  { stroke: '#FFFFFF', fill: 'rgba(255,255,255,0.08)', anim: 'hw-pulse' },
  blink:   { stroke: '#CC1624', fill: 'rgba(204,22,36,0.15)',   anim: 'hw-blink' },
  success: { stroke: '#2E7D32', fill: 'rgba(46,125,50,0.15)',   anim: '' },
  error:   { stroke: '#CC1624', fill: 'rgba(204,22,36,0.1)',    anim: '' },
  '':      { stroke: 'transparent', fill: 'transparent',        anim: '' },
};

function setSlot(id, state, label) {
  const glowId = GLOW_MAP[id];
  if (!glowId) return;
  const el = document.getElementById(glowId);
  if (!el) return;

  const s = STATE_COLORS[state] || STATE_COLORS[''];
  el.setAttribute('stroke', s.stroke);
  el.setAttribute('fill', s.fill);

  // Remove old animation class
  el.style.animation = '';
  if (s.anim === 'hw-pulse') el.style.animation = 'hw-pulse 1.2s ease-in-out infinite alternate';
  if (s.anim === 'hw-blink') el.style.animation = 'hw-blink 0.7s step-end infinite';

  // LED on kaartmondje
  if (id === 'slot-kaart') {
    const led = document.getElementById('kaart-led');
    if (led) {
      const ledColors = { active: '#4488FF', blink: '#CC1624', success: '#2E7D32', error: '#CC1624', '': '#333' };
      led.setAttribute('fill', ledColors[state] || '#333');
      if (state === 'blink') led.style.animation = 'hw-blink 0.7s step-end infinite';
      else led.style.animation = '';
    }
    // Ticket LED at bottom slot
    const ledL = document.getElementById('ticket-led-l');
    const ledR = document.getElementById('ticket-led-r');
    if (ledL && ledR) {
      const c = ledColors[state] || '#333';
      ledL.setAttribute('fill', c);
      ledR.setAttribute('fill', c);
    }
    // Glow on ticket slot too
    const gt = document.getElementById('glow-ticket');
    if (gt) {
      gt.setAttribute('stroke', s.stroke);
      gt.setAttribute('fill', s.fill);
      gt.style.animation = el.style.animation;
    }
  }

  // Pin icon animation
  if (id === 'slot-pin') {
    const icon = document.getElementById('pin-icon-svg');
    if (icon) {
      icon.setAttribute('fill', state === 'active' ? '#FFFFFF' : '#333');
      icon.style.animation = state === 'active' ? 'hw-pulse 1s ease-in-out infinite alternate' : '';
    }
  }
}

function resetAllSlots() {
  setSlot('slot-kaart',    '', '🎫 Kaartmondje');
  setSlot('slot-barcode',  '', '▦ Barcode scanner');
  setSlot('slot-brief',    '', '💵 Briefgeld gleuf');
  setSlot('slot-munten',   '', '🪙 Munten invoer');
  setSlot('slot-wissel',   '', '🪙 Wisselgeld uitvoer');
  setSlot('slot-kwitantie','', '📄 Kwitantie');
  setSlot('slot-intercom', '', '📞\n\nIntercom');
  setPinSlot(false);
}

function setPinSlot(active) {
  setSlot('slot-pin', active ? 'active' : '', '');
  const icon = document.getElementById('pin-icon-svg');
  if (icon) {
    icon.setAttribute('fill', active ? '#FFFFFF' : '#333');
    icon.setAttribute('font-size', active ? '20' : '16');
    icon.style.animation = active ? 'hw-pulse 1s ease-in-out infinite alternate' : '';
  }
}

// ─────────────────────────────────────────────
//  SCREEN HELPERS
// ─────────────────────────────────────────────
function setScreen({ modifier = '', progress = 0, badge = null, badgeModifier = '', html = '' }) {
  const screen = document.getElementById('screen');

  // Reset modifier classes
  screen.className = 'screen' + (modifier ? ` screen--${modifier}` : '');

  // Badge
  const existingBadge = screen.querySelector('.screen__badge');
  if (existingBadge) existingBadge.remove();

  if (badge) {
    const el = document.createElement('div');
    el.className = 'screen__badge' + (badgeModifier ? ` screen__badge--${badgeModifier}` : '');
    el.textContent = badge;
    screen.appendChild(el);
  }

  document.getElementById('progress').style.width = progress + '%';
  document.getElementById('screen-content').innerHTML = html;
}

function setNavBar({ back = false, next = false, label = '—' }) {
  document.getElementById('btn-back').disabled = !back;
  document.getElementById('btn-next').disabled = !next;
  document.getElementById('nav-label').innerHTML = label;
}

// ─────────────────────────────────────────────
//  SCREENS
// ─────────────────────────────────────────────
function setZoom(on) {
  const wrap = document.getElementById('machine-wrap');
  if (wrap) wrap.classList.toggle('is-zoomed', on);
}

function showIdle() {
  state.step = 'idle';
  state.cashIn = 0;
  state.kentekenInput = '';
  resetAllSlots();
  setZoom(false);

  const cfg = getConfig();

  setScreen({
    html: `
      <p style="font-size:28px;opacity:.1;font-weight:900;color:#333;">P1</p>
      <p class="screen__title">Welkom bij P1 Parking</p>
      <p class="screen__subtitle">Houd uw parkeerticket bij de hand</p>
      <button class="btn btn--primary" onclick="showTicketKeuze()">Tik om te beginnen</button>
      <button class="btn btn--secondary" style="font-size:10px;" onclick="showKentekenInput()">🎫 Ticket kwijt of beschadigd?</button>
    `,
  });
  setNavBar({ label: 'Welkomscherm' });
}

// Hardware click handler called from SVG onclick
function onHwClick(hw) {
  if (state.step === 'idle') { showTicketKeuze(); return; }
  if (hw === 'kaart')   showKaartmondjeInvoer();
  if (hw === 'barcode') showBarcodeInvoer();
}

// ── Ticket keuze: kaartmondje of barcode scanner ──────────────────────────
function showTicketKeuze() {
  state.step = 'ticket';
  resetAllSlots();
  setZoom(true);
  const cfg = getConfig();

  if (cfg.ticketFout) {
    setSlot('slot-kaart',   'error', '✕ Ticket niet leesbaar');
    setSlot('slot-barcode', cfg.barcodeDefect ? 'error' : 'blink', cfg.barcodeDefect ? '▦ Defect' : '▦ ⚠ Niet leesbaar');
    setScreen({
      modifier: 'error',
      badge: 'Fout',
      badgeModifier: 'error',
      html: `
        <span class="icon--shake" style="font-size:28px;">⚠️</span>
        <p class="screen__title screen__title--error">Ticket kan niet<br>worden gelezen</p>
        <p class="screen__subtitle">Het ticket is mogelijk beschadigd,<br>verkreukeld of niet bij de hand.</p>
        <button class="btn btn--danger" onclick="showKentekenInput()">🔢 Voer kenteken in</button>
        <button class="btn btn--secondary" onclick="showIntercom()">📞 Bel de meldkamer</button>
      `,
    });
    setNavBar({ back: true, label: 'Ticket niet leesbaar' });
    return;
  }

  // Kaartmondje blocked = greyed out, barcode is primary option
  const kaartBlokkeerd = cfg.kaartVast;

  if (!kaartBlokkeerd) setSlot('slot-kaart',   'active', '🎫 Ticket invoeren');
  else                  setSlot('slot-kaart',   'blink',  '🎫 ⚠ Geblokkeerd');
  if (!cfg.barcodeDefect) setSlot('slot-barcode', 'active', '▦ Of scan barcode');

  const kaartBtnHtml = kaartBlokkeerd
    ? `<button class="pay-option pay-option--disabled">
        🎫 Kaartmondje
        <span class="pay-option__tag pay-option__tag--error">⚠ geblokkeerd</span>
       </button>`
    : `<button class="pay-option pay-option--selected" onclick="showKaartmondjeInvoer()">
        🎫 Kaartmondje
        <span class="pay-option__tag">voorkant →</span>
       </button>`;

  const barcodeBtnHtml = cfg.barcodeDefect
    ? `<button class="pay-option pay-option--disabled">
        ▦ Barcode scanner
        <span class="pay-option__tag pay-option__tag--error">⚠ defect</span>
       </button>`
    : `<button class="pay-option ${kaartBlokkeerd ? 'pay-option--selected' : ''}" onclick="showBarcodeInvoer()">
        ▦ Barcode scanner
        <span class="pay-option__tag">rechterkant →</span>
       </button>`;

  setScreen({
    progress: 15,
    badge: '1 / 4',
    html: `
      <p class="screen__title">Hoe wilt u uw ticket invoeren?</p>
      ${kaartBlokkeerd ? '<p class="screen__subtitle" style="color:var(--color-red);font-weight:600;">⚠ Kaartmondje is tijdelijk geblokkeerd</p>' : '<div class="screen__divider"></div>'}
      ${kaartBtnHtml}
      ${barcodeBtnHtml}
      <div class="screen__divider"></div>
      <button class="btn btn--secondary" style="font-size:10px;" onclick="showKentekenInput()">Ticket kwijt of beschadigd?</button>
    `,
  });
  setNavBar({ back: true, label: 'Stap 1 / 4 — Ticket invoeren' });
}

function showKaartmondjeInvoer() {
  const cfg = getConfig();

  if (cfg.kaartVast) {
    // Kaartje vastzit — show warning but still allow trying, suggest barcode
    setSlot('slot-kaart', 'blink', '');
    if (!cfg.barcodeDefect) setSlot('slot-barcode', 'active', '');
    setScreen({
      modifier: 'warning',
      badge: 'Let op',
      badgeModifier: 'warning',
      html: `
        <p style="font-size:22px;">⚠️</p>
        <p class="screen__title screen__title--warning">Er zit mogelijk een kaartje<br>vast in het mondje</p>
        <p class="screen__subtitle">Probeer het voorzichtig in te voeren,<br>of gebruik de barcode scanner.</p>
        <button class="btn btn--secondary" onclick="showBarcodeInvoer()">▦ Gebruik barcode scanner</button>
        <button class="btn btn--secondary" style="font-size:10px;opacity:.6;" onclick="forceKaartmondje()">Toch proberen via kaartmondje</button>
      `,
    });
    setNavBar({ back: true, label: 'Kaartmondje — let op' });
    return;
  }

  setSlot('slot-kaart',   'active', '🎫 ← Schuif ticket in');
  if (!cfg.barcodeDefect) setSlot('slot-barcode', '', '▦ Barcode scanner');

  // Make barcode overlay clickable to switch
  setTimeout(() => {
    const barcodeEl = document.getElementById('slot-barcode');
    if (barcodeEl && !cfg.barcodeDefect) {
      barcodeEl.classList.add('is-clickable');
      barcodeEl.onclick = () => showBarcodeInvoer();
    }
  }, 50);

  setScreen({
    progress: 20,
    badge: '1 / 4',
    html: `
      <p class="screen__title">Schuif uw ticket in<br>het kaartmondje</p>
      <svg width="64" height="38" viewBox="0 0 64 38" style="opacity:.25;margin:4px 0;">
        <rect x="0" y="8" width="46" height="22" rx="2" fill="none" stroke="#333" stroke-width="2"/>
        <line x1="6" y1="19" x2="40" y2="19" stroke="#333" stroke-width="1.5"/>
        <path d="M46 19 L64 19" stroke="#333" stroke-width="2" stroke-dasharray="3"/>
      </svg>
      <p class="screen__subtitle">Barcode naar boven,<br>schuif langzaam in de gleuf</p>
      <button class="btn btn--primary" onclick="showBetaalkeuze()">✓ Ticket ingevoerd</button>
    `,
  });
  setNavBar({ back: true, label: 'Kaartmondje' });
}

function forceKaartmondje() {
  // User insists — show normal kaartmondje screen but keep blink warning
  const cfg = getConfig();
  setSlot('slot-kaart', 'blink', '');
  setScreen({
    progress: 20,
    badge: '1 / 4',
    html: `
      <p class="screen__title">Schuif uw ticket in<br>het kaartmondje</p>
      <svg width="64" height="38" viewBox="0 0 64 38" style="opacity:.25;margin:4px 0;">
        <rect x="0" y="8" width="46" height="22" rx="2" fill="none" stroke="#333" stroke-width="2"/>
        <line x1="6" y1="19" x2="40" y2="19" stroke="#333" stroke-width="1.5"/>
        <path d="M46 19 L64 19" stroke="#333" stroke-width="2" stroke-dasharray="3"/>
      </svg>
      <p class="screen__subtitle" style="color:var(--color-orange);">⚠ Let op: mogelijk zit er nog<br>een kaartje in het mondje</p>
      <button class="btn btn--primary" onclick="showBetaalkeuze()">✓ Ticket ingevoerd</button>
    `,
  });
  setNavBar({ back: true, label: 'Kaartmondje' });
}

function showBarcodeInvoer() {
  const cfg = getConfig();
  setSlot('slot-barcode', 'active', '▦ ← Houd ticket voor scanner');
  if (!cfg.kaartVast) setSlot('slot-kaart', '', '🎫 Kaartmondje');
  else setSlot('slot-kaart', 'blink', '🎫 ⚠ Geblokkeerd');

  // Make kaartmondje overlay clickable to switch back (unless kaartje vastzit)
  setTimeout(() => {
    const kaartEl = document.getElementById('slot-kaart');
    if (kaartEl && !cfg.kaartVast) {
      kaartEl.classList.add('is-clickable');
      kaartEl.onclick = () => showKaartmondjeInvoer();
    }
  }, 50);

  setScreen({
    progress: 20,
    badge: '1 / 4',
    html: `
      <p class="screen__title">Houd uw ticket voor<br>de barcode scanner</p>
      <div style="font-size:32px;animation:tap-pulse 1s ease-in-out infinite alternate;">▦</div>
      <p class="screen__subtitle">Houd de barcode op het ticket<br>voor de scanner aan de rechterkant</p>
      <button class="btn btn--primary" onclick="showBetaalkeuze()">✓ Ticket gescand</button>
    `,
  });
  setNavBar({ back: true, label: 'Barcode scanner' });
}

// ── Betaalkeuze ────────────────────────────────────────────────────────────
function showBetaalkeuze() {
  state.step = 'betaalkeuze';
  resetAllSlots();
  const cfg = getConfig();

  setSlot('slot-kaart',  'success', '✓ Ticket gelezen');
  if (!cfg.barcodeDefect) setSlot('slot-barcode', 'success', '▦ Gelezen');

  const contantHtml = cfg.muntDefect
    ? `<button class="pay-option pay-option--disabled" onclick="showMuntenDefect()">
        💵 Contant betalen
        <span class="pay-option__tag pay-option__tag--error">⚠ defect</span>
       </button>`
    : `<button class="pay-option" onclick="showContant()">💵 Contant betalen</button>`;

  setScreen({
    progress: 50,
    badge: '2 / 4',
    html: `
      <p class="screen__title">Uw parkeertijd</p>
      <p class="screen__amount">${cfg.euroStr}</p>
      <p class="screen__amount-sub">${cfg.duur} · ${cfg.garage}</p>
      <div class="screen__divider"></div>
      <button class="pay-option pay-option--selected" onclick="showPin()">💳 Pinpas / Creditcard</button>
      ${contantHtml}
    `,
  });
  setNavBar({ back: true, next: true, label: 'Stap 2 / 4 — Betaalkeuze' });
}

// ── Muntenverwerker defect ─────────────────────────────────────────────────
function showMuntenDefect() {
  setSlot('slot-munten', 'blink', '🪙 ⚠ Defect');
  setSlot('slot-wissel', 'blink', '🪙 ⚠ Defect');
  setScreen({
    modifier: 'warning',
    badge: 'Let op',
    badgeModifier: 'warning',
    html: `
      <span class="icon--shake" style="font-size:28px;">⚠️</span>
      <p class="screen__title screen__title--warning">Contant betalen<br>is tijdelijk niet mogelijk</p>
      <p class="screen__subtitle">De muntenverwerker is buiten bedrijf.<br>Kies een andere betaalmethode.</p>
      <div class="screen__divider"></div>
      <button class="btn btn--primary" onclick="showPin()">💳 Betaal met pinpas</button>
      <button class="btn btn--secondary" onclick="showIntercom()">📞 Bel de meldkamer</button>
    `,
  });
}

// ── Pin betalen ────────────────────────────────────────────────────────────
function showPin() {
  state.step = 'pin';
  resetAllSlots();
  setSlot('slot-kaart', 'success', '✓ Gelezen');
  setPinSlot(true);

  setScreen({
    progress: 75,
    badge: '3 / 4',
    html: `
      <p class="screen__title">Houd uw pinpas<br>tegen de lezer</p>
      <div style="font-size:32px;animation:tap-pulse 1s ease-in-out infinite alternate;">💳</div>
      <p class="screen__subtitle">Of voer uw pincode in op de lezer</p>
    `,
  });
  setNavBar({ back: true, next: true, label: 'Stap 3 / 4 — Pinpas' });
}

// ── Contant betalen ────────────────────────────────────────────────────────
function showContant() {
  state.step = 'contant';
  state.cashIn = 0;
  state.cashTarget = getConfig().euro;
  resetAllSlots();
  setSlot('slot-kaart', 'success', '✓ Gelezen');

  const cfg = getConfig();
  if (cfg.gepast) {
    setSlot('slot-wissel', 'error', '🪙 Geen wisselgeld');
    setScreen({
      modifier: 'warning',
      badge: 'Let op',
      badgeModifier: 'warning',
      html: `
        <span style="font-size:28px;">💰</span>
        <p class="screen__title screen__title--warning">Betaal alstublieft gepast</p>
        <p class="screen__subtitle">Er is geen wisselgeld beschikbaar.<br>Vul exact ${cfg.euroStr} in.</p>
        <div class="screen__divider"></div>
        <button class="btn btn--warning" onclick="renderContantInvoer()">Ik begrijp het — doorgaan</button>
      `,
    });
    setNavBar({ back: true, label: 'Gepast betalen vereist' });
  } else {
    renderContantInvoer();
  }
}

function renderContantInvoer() {
  const cfg = getConfig();

  setSlot('slot-munten', 'active', '🪙 ← Munten invoeren');
  if (!cfg.briefDefect) setSlot('slot-brief', 'active', '💵 ← Biljet invoeren');
  else setSlot('slot-brief', 'blink', '💵 ⚠ Geblokkeerd');
  if (cfg.gepast) setSlot('slot-wissel', 'error', '🪙 Geen wisselgeld');

  const ing   = state.cashIn.toFixed(2).replace('.', ',');
  const tekort = Math.max(0, state.cashTarget - state.cashIn).toFixed(2).replace('.', ',');
  const vol   = state.cashIn >= state.cashTarget;

  const briefDisabled = cfg.briefDefect;

  setScreen({
    modifier: vol ? 'success' : '',
    progress: 65,
    badge: '3 / 4',
    html: `
      <p class="screen__title">Voer geld in</p>
      <div class="cash-display ${vol ? 'cash-display--paid' : ''}">
        <p class="cash-display__amount ${vol ? 'cash-display__amount--paid' : ''}">€ ${ing}</p>
        <p class="cash-display__label">Te betalen: ${cfg.euroStr} · Nog: € ${tekort}</p>
      </div>
      <div class="cash-buttons">
        <button class="btn btn--secondary" onclick="addCash(0.5)">🪙 50ct</button>
        <button class="btn btn--secondary" onclick="addCash(1)">🪙 €1</button>
        <button class="btn btn--secondary" onclick="addCash(2)">🪙 €2</button>
        <button class="btn btn--secondary ${briefDisabled ? 'pay-option--disabled' : ''}"
          onclick="${briefDisabled ? 'flashBriefGleuf()' : 'addCash(5)'}">💵 €5</button>
        <button class="btn btn--secondary ${briefDisabled ? 'pay-option--disabled' : ''}"
          onclick="${briefDisabled ? 'flashBriefGleuf()' : 'addCash(10)'}">💵 €10</button>
        <button class="btn btn--secondary ${briefDisabled ? 'pay-option--disabled' : ''}"
          onclick="${briefDisabled ? 'flashBriefGleuf()' : 'addCash(20)'}">💵 €20</button>
      </div>
      ${vol ? `<button class="btn btn--success" onclick="showBetaaldScherm()">✓ Doorgaan</button>` : ''}
    `,
  });
  setNavBar({ back: true, label: 'Stap 3 / 4 — Contant' });
}

function addCash(amount) {
  state.cashIn = Math.round((state.cashIn + amount) * 100) / 100;
  renderContantInvoer();
}

function flashBriefGleuf() {
  setSlot('slot-brief', 'blink', '💵 ⚠ Geblokkeerd');
  const content = document.getElementById('screen-content');
  const msg = document.createElement('p');
  msg.style.cssText = 'padding:5px 8px;background:#FFF3F3;border:1px solid var(--color-red);border-radius:4px;font-size:10px;color:var(--color-red);font-weight:600;text-align:center;width:100%;';
  msg.textContent = '⚠ Briefgeld gleuf is niet beschikbaar — gebruik munten';
  content.appendChild(msg);
  setTimeout(() => renderContantInvoer(), 2000);
}

// ── Betaling gelukt ────────────────────────────────────────────────────────
function showBetaaldScherm() {
  state.step = 'klaar';
  resetAllSlots();
  const cfg = getConfig();

  setSlot('slot-kaart',    'success', '📤 Ticket uitgeworpen');
  setSlot('slot-kwitantie','success', '📄 Kwitantie');

  const wissel = Math.round((state.cashIn - state.cashTarget) * 100) / 100;
  const wisselHtml = wissel > 0 && !cfg.gepast
    ? `<p class="screen__subtitle" style="color:var(--color-green);">Wisselgeld: € ${wissel.toFixed(2).replace('.', ',')}</p>`
    : '';

  if (wissel > 0 && !cfg.gepast) {
    setSlot('slot-wissel', 'success', `🪙 € ${wissel.toFixed(2).replace('.', ',')} terug`);
  }

  setScreen({
    modifier: 'success',
    progress: 100,
    badge: '✓ Klaar',
    badgeModifier: 'success',
    html: `
      <div class="success-icon">✓</div>
      <p class="screen__title screen__title--success">Betaling geslaagd</p>
      <p class="screen__subtitle">Bedankt voor uw betaling!<br>U kunt nu uitrijden.</p>
      ${wisselHtml}
      <p class="screen__subtitle" style="background:#FFF9E6;border:1px solid #F0D060;border-radius:6px;padding:6px 10px;color:#7A6000;font-weight:600;">🎫 Vergeet uw kaartje niet!</p>
      <button class="btn btn--primary" onclick="showIdle()">Nieuw bezoek</button>
    `,
  });
  setNavBar({ label: '✓ Betaling voltooid' });
}

// ── Kenteken invoer ────────────────────────────────────────────────────────
function showKentekenInput() {
  state.step = 'kenteken';
  state.kentekenInput = '';
  resetAllSlots();
  setZoom(true);
  renderKentekenInput();
}

function renderKentekenInput() {
  // Rij 1: cijfers
  const numRow  = ['1','2','3','4','5','6','7','8','9','0'];
  // Rij 2: QWERTYUIOP
  const row1    = ['Q','W','E','R','T','Y','U','I','O','P'];
  // Rij 3: ASDFGHJKL
  const row2    = ['A','S','D','F','G','H','J','K','L'];
  // Rij 4: ZXCVBNM + streepje
  const row3    = ['Z','X','C','V','B','N','M','-'];

  const rowHtml = (keys, extraClass = '') =>
    `<div style="display:flex;gap:4px;width:100%;justify-content:center;">
      ${keys.map(k => `<button class="keyboard__key ${extraClass}" style="flex:1;" onclick="typeKenteken('${k}')">${k}</button>`).join('')}
    </div>`;

  setScreen({
    progress: 30,
    html: `
      <p class="screen__title">Voer uw kenteken in</p>
      <div class="text-input">
        <span id="kenteken-display">${state.kentekenInput}</span>
        <span class="text-input__cursor"></span>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;width:100%;">
        ${rowHtml(numRow)}
        ${rowHtml(row1)}
        ${rowHtml(row2)}
        ${rowHtml(row3)}
        <div style="display:flex;gap:4px;width:100%;">
          <button class="keyboard__key" style="flex:1;" onclick="typeKenteken('⌫')">⌫</button>
        </div>
      </div>
      <button class="btn btn--primary" onclick="zoekKenteken()">Zoeken →</button>
    `,
  });
  setNavBar({ back: true, label: 'Kenteken invoeren' });
}

function typeKenteken(key) {
  if (key === '⌫') {
    state.kentekenInput = state.kentekenInput.slice(0, -1);
  } else if (state.kentekenInput.length < 9) {
    state.kentekenInput += key;
  }
  const el = document.getElementById('kenteken-display');
  if (el) el.textContent = state.kentekenInput;
}

function zoekKenteken() {
  const found = lookupPlate(state.kentekenInput);
  if (found) {
    state.foundPlate = found;
    showKentekenGevonden(found);
  } else {
    setScreen({
      modifier: 'error',
      badge: 'Niet gevonden',
      badgeModifier: 'error',
      html: `
        <span class="icon--shake" style="font-size:28px;">⚠️</span>
        <p class="screen__title screen__title--error">Kenteken niet gevonden</p>
        <p class="screen__subtitle">"${state.kentekenInput}" staat niet geregistreerd<br>in ons systeem.</p>
        <button class="btn btn--secondary" onclick="renderKentekenInput()">← Opnieuw proberen</button>
        <button class="btn btn--secondary" onclick="showIntercom()">📞 Bel de meldkamer</button>
      `,
    });
  }
}

function showKentekenGevonden(plate) {
  state.step = 'kenteken-betaal';
  resetAllSlots();
  setPinSlot(true);

  const euroStr = '€ ' + plate.euro.toFixed(2).replace('.', ',');
  const cfg = getConfig();

  setScreen({
    progress: 60,
    html: `
      <p class="screen__title">Kenteken gevonden</p>
      <div class="found-plate">
        <p class="found-plate__number">${plate.plate}</p>
        <p class="found-plate__meta">Ingecheckt: ${plate.tijd} · ${plate.duur} · ${cfg.garage}</p>
      </div>
      <p class="screen__amount">${euroStr}</p>
      <div class="screen__divider"></div>
      <button class="pay-option pay-option--selected" onclick="showPinKenteken()">💳 Pinpas / Creditcard</button>
      <button class="pay-option" onclick="showContantKenteken(${plate.euro})">💵 Contant betalen</button>
    `,
  });
  setNavBar({ back: true, label: `Kenteken ${plate.plate} gevonden` });
}

function showPinKenteken() {
  setPinSlot(true);
  setScreen({
    progress: 80,
    html: `
      <p class="screen__title">Houd uw pinpas<br>tegen de lezer</p>
      <div style="font-size:32px;animation:tap-pulse 1s ease-in-out infinite alternate;">💳</div>
      <p class="screen__subtitle">Of voer uw pincode in op de lezer</p>
    `,
  });
  setNavBar({ back: true, next: true, label: 'Betalen via kenteken' });
}

function showContantKenteken(euro) {
  state.cashIn = 0;
  state.cashTarget = euro;
  state.step = 'contant';
  resetAllSlots();
  renderContantInvoer();
}

// ── Intercom ───────────────────────────────────────────────────────────────
function showIntercom() {
  const cfg = getConfig();
  setSlot('slot-intercom', 'success', '📞\n\nVerbinden...');

  const wachtrij = cfg.wachtrij;
  const wachtrijHtml = wachtrij === 0
    ? 'U wordt direct verbonden.'
    : `Er ${wachtrij === 1 ? 'is' : 'zijn'} <span class="queue-indicator__count">${wachtrij} ${wachtrij === 1 ? 'persoon' : 'personen'}</span> voor u.`;

  setScreen({
    modifier: 'warning',
    badge: 'Intercom',
    badgeModifier: 'warning',
    html: `
      <div style="font-size:28px;animation:tap-pulse 1s ease-in-out infinite alternate;">📞</div>
      <p class="screen__title">Meldkamer wordt gebeld</p>
      <div class="queue-indicator">${wachtrijHtml}</div>
      <p class="screen__subtitle">Blijf bij het apparaat staan.<br>Een medewerker helpt u zo snel mogelijk.</p>
      <button class="btn btn--secondary" onclick="showIdle()">✕ Ophangen</button>
    `,
  });
  setNavBar({ label: 'Intercom actief' });
}

// ─────────────────────────────────────────────
//  NAV BAR BUTTONS
// ─────────────────────────────────────────────
function handleNext() {
  if (state.step === 'ticket')       showBetaalkeuze();
  else if (state.step === 'betaalkeuze') showPin();
  else if (state.step === 'pin')     showBetaaldScherm();
  else if (state.step === 'kenteken-betaal') showPinKenteken();
}

function handleBack() {
  if (state.step === 'ticket')            showIdle();
  else if (state.step === 'betaalkeuze')  showTicketKeuze();
  else if (state.step === 'pin')          showBetaalkeuze();
  else if (state.step === 'contant')      showBetaalkeuze();
  else if (state.step === 'kenteken')     showIdle();
  else if (state.step === 'kenteken-betaal') showKentekenInput();
  else showIdle();
}

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
renderKentekenList();
showIdle();
