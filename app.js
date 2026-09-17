// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
const state = {
    step: 'idle',   // idle | betaalkeuze | pin | pincode | contant | kenteken | kt-betaal | klaar
    cashIn: 0,
    cashTarget: 0,
    kentekenInput: '',
    ticketInMachine: false,   // alleen waar na invoer via de gleuf
    foundPlate: null,
    pincode: '',
};

// ─────────────────────────────────────────────
//  KENTEKEN DB
// ─────────────────────────────────────────────
let kentekenDB = [
    { plate: 'AB-123-C', euro: 3.50, duur: '2u 15m', tijd: '13:22' },
    { plate: 'XX-555-Y', euro: 6.00, duur: '4u',     tijd: '10:05' },
];

function lookupPlate(input) {
    const clean = s => (s || '').replace(/-/g, '').toUpperCase();
    return kentekenDB.find(k => clean(k.plate) === clean(input));
}

// ─────────────────────────────────────────────
//  CONFIG
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
        duur, euro,
        euroStr: '€ ' + euro.toFixed(2).replace('.', ','),
        garage:  document.getElementById('cfg-garage').value,
        wachtrij:parseInt(document.getElementById('cfg-wachtrij').value),
    };
}

// ─────────────────────────────────────────────
//  KENTEKEN LIST UI
// ─────────────────────────────────────────────
function renderKentekenList() {
    document.getElementById('kenteken-list').innerHTML = kentekenDB.map((k, i) => `
    <div class="kenteken-item">
      <span class="kenteken-item__plate">${k.plate}</span>
      <span class="kenteken-item__price">€ ${k.euro.toFixed(2).replace('.', ',')}</span>
      <button class="kenteken-item__remove" onclick="removeKenteken(${i})">✕</button>
    </div>`).join('');
}

function addKenteken() {
    const p = document.getElementById('kenteken-new-plate').value.trim().toUpperCase();
    const e = parseFloat(document.getElementById('kenteken-new-price').value.replace(',', '.').replace('€', '').trim());
    if (!p || isNaN(e)) return;
    kentekenDB.push({ plate: p, euro: e, duur: getConfig().duur, tijd: 'Nu' });
    document.getElementById('kenteken-new-plate').value = '';
    document.getElementById('kenteken-new-price').value = '';
    renderKentekenList();
}

function removeKenteken(i) {
    kentekenDB.splice(i, 1);
    renderKentekenList();
}

// ─────────────────────────────────────────────
//  GLOW SYSTEM
//  Elke hardware-element heeft een glow-* rect in de SVG
//  States: '' | 'active' (wit pulsend) | 'blink' (rood knipperend) | 'success' (groen) | 'error' (rood)
// ─────────────────────────────────────────────
const GLOW_IDS = [
    'glow-ticket',        // ticket bak (in/uit, links)
    'glow-barcode',       // barcode scanner (rood, links)
    'glow-wissel',        // wisselgeld returnbak (zwart, links)
    'glow-pinpas',        // pinpas gleuf (rechts, onder pinpad)
    'glow-munten',        // munten verticaal (zilver, rechts)
    'glow-kwitantie',     // kwitantie gleuf (horizontaal, rechts)
    'glow-brief',         // briefgeld gleuf (rechtsonder)
    'glow-intercom',      // intercom
];

const GLOW_COLORS = {
    active:  { stroke: 'rgba(255,255,255,0.9)', fill: 'rgba(255,255,255,0.1)', anim: 'hw-pulse 1.2s ease-in-out infinite alternate' },
    blink:   { stroke: '#CC1624', fill: 'rgba(204,22,36,0.15)',   anim: 'hw-blink 0.7s step-end infinite' },
    success: { stroke: '#2E7D32', fill: 'rgba(46,125,50,0.15)',   anim: '' },
    error:   { stroke: '#CC1624', fill: 'rgba(204,22,36,0.1)',    anim: '' },
    '':      { stroke: 'transparent', fill: 'transparent',        anim: '' },
};

function setGlow(glowId, state) {
    const el = document.getElementById(glowId);
    if (!el) return;
    const s = GLOW_COLORS[state] || GLOW_COLORS[''];
    el.setAttribute('stroke', s.stroke);
    el.setAttribute('fill', s.fill);
    el.style.animation = s.anim;
}

function clearAllGlows() {
    GLOW_IDS.forEach(id => setGlow(id, ''));
    // Reset kaart LED
    const led = document.getElementById('kaart-led');
    if (led) led.setAttribute('fill', '#333');
}

function setKaartLed(color) {
    const led = document.getElementById('kaart-led');
    if (led) led.setAttribute('fill', color);
    const pinled = document.getElementById('pin-led');
    if (pinled && color === '#2E7D32') pinled.setAttribute('fill', color);
    if (pinled && color === '#333') pinled.setAttribute('fill', '#333');
}

// ─────────────────────────────────────────────
//  SCREEN HELPER
// ─────────────────────────────────────────────
function setScreen({ modifier = '', progress = 0, badge = null, badgeModifier = '', html = '' }) {
    const screen = document.getElementById('screen');
    screen.className = 'screen' + (modifier ? ` screen--${modifier}` : '');
    const existing = screen.querySelector('.screen__badge');
    if (existing) existing.remove();
    if (badge) {
        const b = document.createElement('div');
        b.className = 'screen__badge' + (badgeModifier ? ` screen__badge--${badgeModifier}` : '');
        b.textContent = badge;
        screen.appendChild(b);
    }
    document.getElementById('progress').style.width = progress + '%';
    document.getElementById('screen-content').innerHTML = html;
}

function setNavBar({ back = false, next = false, label = '—' }) {
    // De nav-bar is uit index.html verwijderd; deze functie wordt nog wel
    // overal aangeroepen. Null-safe houden, anders breekt de hele flow.
    const btnBack  = document.getElementById('btn-back');
    const btnNext  = document.getElementById('btn-next');
    const navLabel = document.getElementById('nav-label');

    if (btnBack)  btnBack.disabled  = !back;
    if (btnNext)  btnNext.disabled  = !next;
    if (navLabel) navLabel.innerHTML = label;

    // Elke stap eindigt hier, ná het zetten van state.step.
    // Handig aanhaakpunt om het mobiele aanzicht bij te werken.
    syncMobielAanzicht();
}

/* ─────────────────────────────────────────────
   MOBIEL AANZICHT
   Per stap bepalen we waar de bezoeker moet kijken.
   'scherm'   = lezen of typen op het display  -> machine breed, scroll naar scherm
   'hardware' = iets fysieks doen aan de automaat -> hele machine in beeld
───────────────────────────────────────────── */
const STAP_FOCUS = {
    idle:         'scherm',     // welkomscherm lezen en een route kiezen
    betaalkeuze:  'scherm',     // bedrag lezen en betaalmethode kiezen
    pin:          'hardware',   // pas voor de lezer houden
    pincode:      'hardware',   // pincode op de terminal, die zit op de machine
    contant:      'hardware',   // munt- en briefgleuf lichten op, die moet je zien
    kenteken:     'scherm',     // toetsenbord staat op het display
    'kt-betaal':  'hardware',   // alsnog met de pas betalen
    klaar:        'hardware',   // ticket uit de bak pakken
    afgebroken:   'hardware',   // ticket én geld terugnemen
};

function syncMobielAanzicht() {
    if (!isMobile()) return;

    const wrap = document.getElementById('machine-wrap');
    if (!wrap) return;

    const schermGericht = (STAP_FOCUS[state.step] || 'hardware') === 'scherm';
    wrap.classList.toggle('is-zoomed', schermGericht);

    // Even wachten tot de breedte-overgang loopt, anders scrollen we naar de oude positie
    clearTimeout(window._viewTimer);
    window._viewTimer = setTimeout(() => {
        if (schermGericht) {
            const scherm = document.getElementById('machine-screen');
            if (scherm) scherm.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        } else {
            const stage = document.querySelector('.layout__stage');
            if (stage) stage.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }
    }, 300);
}

function setZoom(on) {
    const wrap = document.getElementById('machine-wrap');
    if (!wrap) return;

    // Op een telefoon bepaalt de stap het aanzicht, niet een tik van de bezoeker.
    // Anders staat de hardware buiten beeld precies wanneer je die moet aanraken.
    if (isMobile()) { syncMobielAanzicht(); return; }

    wrap.classList.toggle('is-zoomed', on);
}

/* ─────────────────────────────────────────────
   ADMIN PANEL — lade op mobiel
───────────────────────────────────────────── */
function isMobile() {
    return window.matchMedia('(max-width: 900px)').matches;
}

function setPanel(open) {
    const panel    = document.getElementById('admin-panel');
    const backdrop = document.getElementById('panel-backdrop');
    const toggle   = document.getElementById('panel-toggle');

    if (panel)    panel.classList.toggle('is-open', open);
    if (backdrop) backdrop.classList.toggle('is-open', open);
    if (toggle) {
        toggle.classList.toggle('is-active', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Admin Panel sluiten' : 'Admin Panel openen');
    }
}

function togglePanel() {
    const panel = document.getElementById('admin-panel');
    setPanel(!(panel && panel.classList.contains('is-open')));
}

function closePanel() {
    setPanel(false);
}

// Escape sluit de lade
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
});

// Terug naar desktopbreedte: lade altijd dicht, anders blijft hij hangen
window.addEventListener('resize', () => {
    if (!isMobile()) closePanel();
});

// ─────────────────────────────────────────────
//  HARDWARE CLICK — CONTEXT AWARE
// ─────────────────────────────────────────────
function onHwClick(hw) {

    switch (state.step) {

        case 'idle':
            // Alleen ticket gleuf en barcode scanner starten de flow
            if (hw === 'ticket')      { setZoom(true); insertTicket();    }
            if (hw === 'barcode')     { setZoom(true); scanBarcode();     }
            break;

        case 'betaalkeuze':
            // Geen hardware interactie in dit scherm
            break;

        case 'pin':
            // Pinpas gleuf of contactloze lezer betaalt
            if (hw === 'pinpas' || hw === 'contactloos') betaalPin();
            break;

        case 'contant':
            // Geen directe hardware click — knoppen op scherm
            break;

        case 'klaar':
            // Ticket gleuf links = ticket ophalen, wisselbak = geld pakken
            if (hw === 'ticket') haalTicketOp();
            if (hw === 'wissel') haalWisselgeldOp();
            break;

        case 'afgebroken':
            // Betaling afgebroken: ticket en ingeworpen geld terugnemen
            if (hw === 'ticket') haalTicketTerug();
            if (hw === 'wissel') haalGeldTerug();
            break;

        case 'kenteken':
        case 'kt-betaal':
            if (hw === 'pinpas' || hw === 'contactloos') betaalPin();
            break;
    }
}

// ─────────────────────────────────────────────
//  SCREEN: IDLE
// ─────────────────────────────────────────────
function showIdle() {
    state.step = 'idle';
    state.cashIn = 0;
    state.cashTarget = 0;
    state.kentekenInput = '';
    state.foundPlate = null;
    state.ticketInMachine = false;
    if (window._ticketTimer) clearTimeout(window._ticketTimer);
    if (window._wisselTimer) clearTimeout(window._wisselTimer);
    clearAllGlows();
    setZoom(false);

    // Reset pinpad scherm naar idle state
    showPinpadDots(false);

    const cfg = getConfig();

    // Kaartmondje geblokkeerd: de gleuf is geen optie meer. Niet aanbieden
    // wat niet kan — dat is precies de fout die de echte automaat maakt.
    if (cfg.kaartVast) {
        setGlow('glow-ticket', 'error');
        setGlow('glow-barcode', 'active');
        setKaartLed('#CC1624');

        setScreen({
            modifier: 'dark',
            html: `
      <p style="font-size:20px;opacity:.4;font-weight:900;color:#4488FF;letter-spacing:2px;">P1</p>
      <p class="screen__title" style="color:white;">Welkom bij P1 Parking</p>
      <div class="screen__divider" style="background:#333;"></div>
      <p class="screen__subtitle" style="color:#FF8A8A;font-weight:600;">
        ⚠ Kaartgleuf buiten gebruik — er zit een kaartje vast
      </p>
      <button class="btn btn--primary" style="background:#333;" onclick="scanBarcode()">▦ Ticket scannen via barcode</button>
      <button class="btn btn--secondary" style="font-size:10px;border-color:#555;color:#AAA;" onclick="showKentekenInput()">Ticket kwijt of beschadigd?</button>
      <button class="btn btn--secondary" style="font-size:10px;border-color:#555;color:#AAA;" onclick="showIntercom()">📞 Bel de meldkamer</button>
    `,
        });
        setNavBar({ label: 'Kaartgleuf buiten gebruik' });
        return;
    }

    // Op idle: kaartmondje pulseert zacht
    setGlow('glow-ticket', 'active');
    setGlow('glow-barcode', 'active');
    setKaartLed('#4488FF');

    setScreen({
        modifier: 'dark',
        html: `
      <p style="font-size:20px;opacity:.4;font-weight:900;color:#4488FF;letter-spacing:2px;">P1</p>
      <p class="screen__title" style="color:white;">Welkom bij P1 Parking</p>
      <div class="screen__divider" style="background:#333;"></div>
      <button class="btn btn--primary" onclick="insertTicket()">🎫 Ticket invoeren via gleuf</button>
      <button class="btn btn--primary" style="background:#333;" onclick="scanBarcode()">▦ Ticket scannen via barcode</button>
      <button class="btn btn--secondary" style="font-size:10px;border-color:#555;color:#AAA;" onclick="showKentekenInput()">Ticket kwijt of beschadigd?</button>
    `,
    });
    setNavBar({ label: 'Welkomscherm' });
}

// ─────────────────────────────────────────────
//  TICKET INVOER (gleuf links)
// ─────────────────────────────────────────────
function insertTicket() {
    const cfg = getConfig();
    clearAllGlows();

    // Kaartmondje geblokkeerd — hard blokkeren. Er zit een kaartje vast,
    // dus een tweede ticket erin duwen maakt het alleen erger.
    if (cfg.kaartVast) {
        setGlow('glow-ticket', 'error');
        setGlow('glow-barcode', 'active');
        setKaartLed('#CC1624');
        setScreen({
            modifier: 'error',
            badge: 'Buiten gebruik',
            badgeModifier: 'error',
            html: `
        <span style="font-size:24px;" class="icon--shake">⚠️</span>
        <p class="screen__title screen__title--error">Kaartgleuf buiten gebruik</p>
        <p class="screen__subtitle">Er zit een kaartje vast in het mondje.<br>Voer uw ticket hier niet in.</p>
        <button class="btn btn--primary" onclick="scanBarcode()">▦ Gebruik de barcode scanner</button>
        <button class="btn btn--secondary" onclick="showKentekenInput()">🔢 Voer kenteken in</button>
        <button class="btn btn--secondary" style="font-size:10px;opacity:.7;" onclick="showIdle()">✕ Annuleren</button>
      `,
        });
        setNavBar({ back: true, label: 'Kaartgleuf buiten gebruik' });
        return;
    }

    // Ticket beschadigd of kwijt
    if (cfg.ticketFout) {
        setGlow('glow-ticket', 'error');
        setKaartLed('#CC1624');
        setScreen({
            modifier: 'error',
            badge: 'Fout',
            badgeModifier: 'error',
            html: `
        <span style="font-size:24px;" class="icon--shake">⚠️</span>
        <p class="screen__title screen__title--error">Ticket kan niet worden gelezen</p>
        <p class="screen__subtitle">Het ticket is mogelijk beschadigd<br>of verkreukeld.</p>
        <button class="btn btn--danger" onclick="showKentekenInput()">🔢 Voer kenteken in</button>
        <button class="btn btn--secondary" onclick="showIntercom()">📞 Bel de meldkamer</button>
      `,
        });
        setNavBar({ back: true, label: 'Ticket niet leesbaar' });
        return;
    }

    // Ticket OK — kort flash dan door naar betaalkeuze
    state.ticketInMachine = true;
    setGlow('glow-ticket', 'success');
    setKaartLed('#2E7D32');
    setScreen({
        modifier: 'success',
        progress: 30,
        html: `
      <div class="success-icon" style="width:36px;height:36px;font-size:18px;">✓</div>
      <p class="screen__title screen__title--success">Ticket gelezen</p>
      <p class="screen__subtitle">Even geduld...</p>
    `,
    });
    setTimeout(() => showBetaalkeuze(), 800);
}

// forceInsertTicket verwijderd: bij een geblokkeerde gleuf mag er geen
// omweg zijn om alsnog een ticket in te voeren.

// ─────────────────────────────────────────────
//  BARCODE SCAN
// ─────────────────────────────────────────────
function scanBarcode() {
    const cfg = getConfig();
    clearAllGlows();

    if (cfg.barcodeDefect) {
        setGlow('glow-barcode', 'error');
        setScreen({
            modifier: 'error',
            badge: 'Fout',
            badgeModifier: 'error',
            html: `
        <span style="font-size:24px;" class="icon--shake">▦</span>
        <p class="screen__title screen__title--error">Barcode kan niet worden gelezen</p>
        <p class="screen__subtitle">De scanner is buiten gebruik.</p>
        ${cfg.kaartVast
                ? ''
                : '<button class="btn btn--primary" onclick="insertTicket()">🎫 Voer uw ticket in de gleuf in</button>'}
        <button class="btn btn--secondary" onclick="showKentekenInput()">🔢 Voer kenteken in</button>
        <button class="btn btn--secondary" style="font-size:10px;" onclick="showIntercom()">📞 Bel de meldkamer</button>
      `,
        });
        setNavBar({ back: true, label: 'Barcode scanner defect' });
        return;
    }

    if (cfg.ticketFout) {
        setGlow('glow-barcode', 'error');
        setKaartLed('#CC1624');
        setScreen({
            modifier: 'error',
            badge: 'Fout',
            badgeModifier: 'error',
            html: `
        <span style="font-size:24px;" class="icon--shake">⚠️</span>
        <p class="screen__title screen__title--error">Ticket kan niet worden gelezen</p>
        <p class="screen__subtitle">De barcode is beschadigd of verkreukeld.</p>
        <button class="btn btn--danger" onclick="showKentekenInput()">🔢 Voer kenteken in</button>
        <button class="btn btn--secondary" onclick="showIntercom()">📞 Bel de meldkamer</button>
      `,
        });
        setNavBar({ back: true, label: 'Ticket niet leesbaar' });
        return;
    }

    setGlow('glow-barcode', 'active');
    setScreen({
        progress: 30,
        html: `
      <div style="font-size:26px;animation:tap-pulse 0.6s ease-in-out 3;">▦</div>
      <p class="screen__title screen__title--success" style="color:#2E7D32;">Barcode gelezen</p>
      <p class="screen__subtitle">Even geduld...</p>
    `,
    });
    setTimeout(() => {
        clearAllGlows();
        showBetaalkeuze();
    }, 800);
}

// ─────────────────────────────────────────────
//  BETAALKEUZE
// ─────────────────────────────────────────────
function showBetaalkeuze() {
    state.step = 'betaalkeuze';
    state.cashTarget = getConfig().euro;
    clearAllGlows(); // geen glows op keuze scherm

    const cfg = getConfig();

    const contantHtml = cfg.muntDefect
        ? `<button class="pay-option pay-option--disabled" onclick="showMuntenDefect()">
        💵 Contant betalen
        <span class="pay-option__tag pay-option__tag--error">⚠ defect</span>
       </button>`
        : `<button class="pay-option" onclick="showContant()">💵 Contant betalen</button>`;

    setScreen({
        progress: 40,
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

// ─────────────────────────────────────────────
//  PIN BETALEN
// ─────────────────────────────────────────────
function showPin() {
    state.step = 'pin';
    clearAllGlows();

    // Pinpas gleuf + contactloos vlakje pulseren
    setGlow('glow-pinpas', 'active');

    const cfg = getConfig();
    setScreen({
        progress: 65,
        badge: '3 / 4',
        html: `
      <p class="screen__title">Betaal met uw bankpas</p>
      <div style="font-size:26px;animation:tap-pulse 1s ease-in-out infinite alternate;">💳</div>
      <p class="screen__subtitle">Steek uw pas in de pinpas gleuf →<br><span style="font-size:9px;color:#AAA;">of gebruik de contactloze betaalknop op de terminal</span></p>
    `,
    });
    setNavBar({ back: true, label: 'Stap 3 / 4 — Bankpas' });
}


function showPinpadDots(on) {
    // Switch pinpad screen between idle state and dot state
    ['pin-screen-idle','pin-screen-idle2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('visibility', on ? 'hidden' : 'visible');
    });
    ['pin-screen-label','pin-svg-dot-1','pin-svg-dot-2','pin-svg-dot-3','pin-svg-dot-4'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('visibility', on ? 'visible' : 'hidden');
    });
}

function updatePinpadDots(count) {
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById('pin-svg-dot-' + i);
        if (!el) return;
        if (i <= count) {
            el.textContent = '●';
            el.setAttribute('fill', '#FFFFFF');
        } else {
            el.textContent = '○';
            el.setAttribute('fill', '#336699');
        }
    }
}
function showPincodeInvoer() {
    state.step = 'pincode';
    state.cashIn = state.cashTarget;
    state.pincode = '';
    clearAllGlows();
    setGlow('glow-pinpas', 'active');

    // Groot scherm: wacht op pinpad terminal
    setScreen({
        progress: 80,
        badge: '3 / 4',
        html: `
      <div style="font-size:26px;animation:tap-pulse 1.2s ease-in-out infinite alternate;">💳</div>
      <p class="screen__title">Voer uw pincode in<br>op de terminal →</p>
      <p class="screen__subtitle" style="font-size:9px;color:#AAA;">Gebruik de toetsen op het pinpad rechts</p>
    `,
    });
    setNavBar({ back: true, label: 'Stap 3 / 4 — Pincode' });

    // Pinpad scherm (SVG): toon bolletjes
    showPinpadDots(true);
    updatePinpadDots(0);
    state.pincode = '';
}

// Aangeroepen door de fysieke toetsen op de SVG pinterminal
function terminalToets(k) {
    if (state.step !== 'pincode') return;

    if (k === 'clear') {
        state.pincode = '';
    } else if (k === 'ok') {
        if (state.pincode.length >= 4) bevestigPin();
        return;
    } else if (state.pincode.length < 4) {
        state.pincode += k;
    }

    // Update dots op het SVG pinpad scherm
    updatePinpadDots(state.pincode.length);

    // Flash de toets op het pinpad visueel
    flashTerminalToets(k);

    // Na 4 cijfers automatisch naar bevestig
    if (state.pincode.length === 4) {
        setTimeout(() => bevestigPin(), 600);
    }
}

function flashTerminalToets(k) {
    // Highlight de pinpad glow kort
    setGlow('glow-pinpas', 'active');
    setTimeout(() => {
        if (state.step === 'pincode') setGlow('glow-pinpas', 'active');
    }, 150);
}

function bevestigPin() {
    clearAllGlows();
    setGlow('glow-pinpas', 'success');
    // Reset pinpad scherm naar idle
    showPinpadDots(false);
    setScreen({
        modifier: 'success',
        progress: 90,
        html: `
      <div class="success-icon" style="width:36px;height:36px;font-size:18px;">✓</div>
      <p class="screen__title screen__title--success">Betaling goedgekeurd</p>
      <p class="screen__subtitle">Even geduld...</p>
    `,
    });
    setTimeout(() => {
        clearAllGlows();
        showKlaar();
    }, 900);
}

function betaalPin() {
    showPincodeInvoer();
}

// ─────────────────────────────────────────────
//  MUNTENVERWERKER DEFECT
// ─────────────────────────────────────────────
function showMuntenDefect() {
    clearAllGlows();
    setGlow('glow-munten', 'blink');
    setScreen({
        modifier: 'warning',
        badge: 'Let op',
        badgeModifier: 'warning',
        html: `
      <span style="font-size:24px;" class="icon--shake">⚠️</span>
      <p class="screen__title screen__title--warning">Contant betalen<br>is tijdelijk niet mogelijk</p>
      <p class="screen__subtitle">De muntenverwerker is buiten bedrijf.</p>
      <button class="btn btn--primary" onclick="showPin()">💳 Betaal met pinpas</button>
      <button class="btn btn--secondary" onclick="showIntercom()">📞 Bel de meldkamer</button>
    `,
    });
    setNavBar({ back: true, label: 'Muntenverwerker defect' });
}

// ─────────────────────────────────────────────
//  CONTANT BETALEN
// ─────────────────────────────────────────────
function showContant() {
    state.step = 'contant';
    state.cashIn = 0;
    clearAllGlows();

    const cfg = getConfig();

    // Gepast betalen — melding eerst
    if (cfg.gepast) {
        setGlow('glow-wissel', 'error');
        setScreen({
            modifier: 'warning',
            badge: 'Let op',
            badgeModifier: 'warning',
            html: `
        <span style="font-size:24px;">💰</span>
        <p class="screen__title screen__title--warning">Betaal alstublieft gepast</p>
        <p class="screen__subtitle">Er is geen wisselgeld beschikbaar.<br>Vul exact ${cfg.euroStr} in.</p>
        <button class="btn btn--warning" onclick="renderContant()">Ik begrijp het — doorgaan</button>
      `,
        });
        setNavBar({ back: true, label: 'Gepast betalen vereist' });
    } else {
        renderContant();
    }
}

function renderContant() {
    const cfg = getConfig();
    clearAllGlows();

    // Actieve glows: munten altijd, brief alleen als niet defect
    setGlow('glow-munten', 'active');
    if (!cfg.briefDefect) {
        setGlow('glow-brief',   'active');
    } else {
        setGlow('glow-brief',   'error');
    }
    if (cfg.gepast) setGlow('glow-wissel', 'error');

    const ing    = state.cashIn.toFixed(2).replace('.', ',');
    const tekort = Math.max(0, state.cashTarget - state.cashIn).toFixed(2).replace('.', ',');
    const vol    = state.cashIn >= state.cashTarget;

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
        <button class="btn btn--secondary" onclick="addCash(.5)">🪙 50ct</button>
        <button class="btn btn--secondary" onclick="addCash(1)">🪙 €1</button>
        <button class="btn btn--secondary" onclick="addCash(2)">🪙 €2</button>
        <button class="btn btn--secondary ${cfg.briefDefect ? 'pay-option--disabled' : ''}"
          onclick="${cfg.briefDefect ? 'flashBriefDefect()' : 'addCash(5)'}">💵 €5</button>
        <button class="btn btn--secondary ${cfg.briefDefect ? 'pay-option--disabled' : ''}"
          onclick="${cfg.briefDefect ? 'flashBriefDefect()' : 'addCash(10)'}">💵 €10</button>
        <button class="btn btn--secondary ${cfg.briefDefect ? 'pay-option--disabled' : ''}"
          onclick="${cfg.briefDefect ? 'flashBriefDefect()' : 'addCash(20)'}">💵 €20</button>
      </div>
      ${vol ? `<button class="btn btn--success" onclick="showKlaar()">✓ Doorgaan</button>` : ''}
    `,
    });
    setNavBar({ back: true, label: 'Stap 3 / 4 — Contant' });
}

function addCash(amount) {
    const cfg = getConfig();
    const nieuw = Math.round((state.cashIn + amount) * 100) / 100;

    // Gepast betalen vereist: er is geen wisselgeld in de automaat.
    // Te veel inwerpen kan dus niet worden afgerekend — de betaling
    // wordt afgebroken en het ingeworpen geld gaat terug.
    if (cfg.gepast && nieuw > state.cashTarget) {
        state.cashIn = nieuw;
        betalingAfgebroken(Math.round((nieuw - state.cashTarget) * 100) / 100);
        return;
    }

    state.cashIn = nieuw;
    renderContant();
}

/* Te veel ingeworpen bij gepast betalen: ticket terug, geld terug. */
function betalingAfgebroken(teveel) {
    state.step = 'afgebroken';
    clearAllGlows();

    setGlow('glow-wissel', 'active');   // geld komt terug in de wisselbak
    if (state.ticketInMachine) {
        setGlow('glow-ticket', 'active');   // ticket wordt uitgeworpen
        setKaartLed('#CC1624');
    }

    const ingeworpen = state.cashIn.toFixed(2).replace('.', ',');

    setScreen({
        modifier: 'error',
        badge: 'Afgebroken',
        badgeModifier: 'error',
        html: `
      <span style="font-size:24px;" class="icon--shake">⚠️</span>
      <p class="screen__title screen__title--error">Betaling afgebroken</p>
      <p class="screen__subtitle">
        <strong>Neem uw geld uit de wisselbak.</strong><br>
        Er is geen wisselgeld — u moet gepast betalen (${getConfig().euroStr}).
      </p>
      <p class="screen__subtitle" id="wissel-reminder"
        style="color:var(--color-green);font-weight:600;cursor:pointer;"
        onclick="haalGeldTerug()">
        💰 Neem € ${ingeworpen} terug ↙
      </p>
      ${state.ticketInMachine
            ? `<p class="screen__subtitle" id="ticket-reminder"
               style="font-weight:600;color:#1A1A1A;cursor:pointer;" onclick="haalTicketTerug()">
               🎫 Neem uw ticket uit de gleuf links ←
             </p>`
            : `<p class="screen__subtitle" style="color:#6B6B6B;">Bewaar uw ticket — u heeft het nog nodig.</p>`}
    `,
    });
    setNavBar({ label: 'Betaling afgebroken — neem ticket en geld terug' });

    state.geldTerug = false;
    state.ticketTerug = !state.ticketInMachine;

    // Vergeet uw wisselgeld niet
    if (window._wisselTimer) clearTimeout(window._wisselTimer);
    window._wisselTimer = setTimeout(() => {
        if (state.geldTerug) return;
        const el = document.getElementById('wissel-reminder');
        if (el) {
            el.style.cssText = 'font-weight:700;color:#CC1624;background:#FFF5F5;border:1px solid #CC1624;border-radius:6px;padding:6px 10px;cursor:pointer;animation:shake 0.4s ease;';
            el.textContent = '⚠ Vergeet uw geld niet!';
        }
        setGlow('glow-wissel', 'blink');
    }, 5000);
}

function haalGeldTerug() {
    if (state.step !== 'afgebroken') return;
    state.geldTerug = true;
    if (window._wisselTimer) clearTimeout(window._wisselTimer);
    setGlow('glow-wissel', 'success');
    const el = document.getElementById('wissel-reminder');
    if (el) { el.style.cssText = 'color:#2E7D32;font-weight:600;'; el.textContent = '✓ Geld teruggenomen'; }
    checkAfgebrokenKlaar();
}

function haalTicketTerug() {
    if (state.step !== 'afgebroken') return;
    state.ticketTerug = true;
    setGlow('glow-ticket', 'success');
    setKaartLed('#2E7D32');
    const el = document.getElementById('ticket-reminder');
    if (el) { el.style.cssText = 'color:#2E7D32;font-weight:600;'; el.textContent = '✓ Ticket teruggenomen'; }
    checkAfgebrokenKlaar();
}

function checkAfgebrokenKlaar() {
    if (!(state.geldTerug && state.ticketTerug)) return;
    setTimeout(() => {
        setScreen({
            modifier: 'dark',
            html: `
        <p class="screen__title" style="color:white;">Betaling niet voltooid</p>
        <p class="screen__subtitle">Probeer het opnieuw met gepast geld,<br>of betaal met uw pinpas.</p>
      `,
        });
        setTimeout(() => showIdle(), 2200);
    }, 700);
}

function flashBriefDefect() {
    setGlow('glow-brief', 'blink');
    const content = document.getElementById('screen-content');
    const msg = document.createElement('p');
    msg.style.cssText = 'padding:4px 8px;background:#FFF3F3;border:1px solid #CC1624;border-radius:4px;font-size:9px;color:#CC1624;font-weight:600;text-align:center;width:100%;margin-top:4px;';
    msg.textContent = '⚠ Briefgeld gleuf is niet beschikbaar — gebruik munten';
    content.appendChild(msg);
    setTimeout(() => renderContant(), 2000);
}

// ─────────────────────────────────────────────
//  KLAAR SCHERM
// ─────────────────────────────────────────────
function showKlaar() {
    state.step = 'klaar';
    clearAllGlows();

    const cfg = getConfig();
    const wissel = Math.round((state.cashIn - state.cashTarget) * 100) / 100;
    const heeftWissel = wissel > 0 && !cfg.gepast;

    // Kaartmondje pulseert alleen als het ticket er ook daadwerkelijk in zit
    if (state.ticketInMachine) {
        setGlow('glow-ticket', 'active');
        setKaartLed('#2E7D32');
    }

    // Wisselgeld gleuf alleen actief als er wisselgeld is
    if (heeftWissel) {
        setGlow('glow-wissel',    'active');
        setGlow('glow-kwitantie', 'active');
    }

    const wisselHtml = heeftWissel
        ? `<p class="screen__subtitle" id="wissel-reminder"
        style="color:var(--color-green);font-weight:600;cursor:pointer;"
        onclick="haalWisselgeldOp()">
        💰 Wisselgeld: € ${wissel.toFixed(2).replace('.', ',')} — klik om op te pakken ↙
       </p>`
        : '';

    // Het ticket komt alleen terug als het er ook in is gegaan. Bij een
    // barcodescan of de kentekenroute houdt de bezoeker het zelf vast.
    const ticketTerugNodig = state.ticketInMachine;

    const ticketHtml = ticketTerugNodig
        ? `<div class="screen__divider"></div>
       <p class="screen__subtitle" id="ticket-reminder"
        style="font-weight:600;color:#1A1A1A;cursor:pointer;" onclick="haalTicketOp()">
        🎫 Pak uw ticket uit de gleuf links ←
       </p>`
        : `<div class="screen__divider"></div>
       <p class="screen__subtitle" style="color:#6B6B6B;">Bewaar uw ticket — u heeft het nodig bij de uitrit.</p>
       <button class="btn btn--success" onclick="haalTicketOp()">✓ Klaar</button>`;

    setScreen({
        modifier: 'success',
        progress: 100,
        badge: '✓ Klaar',
        badgeModifier: 'success',
        html: `
      <div class="success-icon">✓</div>
      <p class="screen__title screen__title--success">Betaling geslaagd!</p>
      <p class="screen__subtitle">U kunt nu uitrijden.</p>
      ${wisselHtml}
      <button class="btn btn--secondary" style="font-size:10px;" onclick="printKwitantie()">📄 Kwitantie afdrukken</button>
      ${ticketHtml}
    `,
    });
    setNavBar({ label: ticketTerugNodig ? '✓ Betaling voltooid — pak uw ticket' : '✓ Betaling voltooid' });

    // Na 5 seconden: subtiele reminder als ticket nog niet is gepakt
    if (window._ticketTimer) clearTimeout(window._ticketTimer);
    if (ticketTerugNodig) {
        window._ticketTimer = setTimeout(() => {
            const el = document.getElementById('ticket-reminder');
            if (el) {
                el.style.cssText = 'font-weight:700;color:#CC1624;background:#FFF5F5;border:1px solid #CC1624;border-radius:6px;padding:6px 10px;cursor:pointer;animation:shake 0.4s ease;';
                el.textContent = '⚠ Vergeet uw ticket niet!';
            }
            setGlow('glow-ticket', 'blink');
            setKaartLed('#CC1624');
        }, 5000);
    }

    // Hetzelfde voor het wisselgeld — uit de survey bleek dat bezoekers
    // vaak doorlopen zodra het ticket eruit is.
    if (window._wisselTimer) clearTimeout(window._wisselTimer);
    if (heeftWissel) {
        state.wisselGepakt = false;
        window._wisselTimer = setTimeout(() => {
            if (state.wisselGepakt) return;
            const el = document.getElementById('wissel-reminder');
            if (el) {
                el.style.cssText = 'font-weight:700;color:#CC1624;background:#FFF5F5;border:1px solid #CC1624;border-radius:6px;padding:6px 10px;cursor:pointer;animation:shake 0.4s ease;';
                el.textContent = '⚠ Vergeet uw wisselgeld niet!';
            }
            setGlow('glow-wissel', 'blink');
        }, 5000);
    }
}

function haalWisselgeldOp() {
    if (state.step !== 'klaar') return;
    state.wisselGepakt = true;
    if (window._wisselTimer) clearTimeout(window._wisselTimer);
    setGlow('glow-wissel',    'success');
    setGlow('glow-kwitantie', 'success');
    // Update reminder text
    const el = document.getElementById('wissel-reminder');
    if (el) {
        el.style.cssText = 'color:#2E7D32;font-weight:600;';
        el.textContent = '✓ Wisselgeld gepakt';
    }
}

function haalTicketOp() {
    if (state.step !== 'klaar') return;
    if (window._ticketTimer) clearTimeout(window._ticketTimer);
    clearAllGlows();
    setScreen({
        modifier: 'success',
        progress: 100,
        html: `
      <div class="success-icon">✓</div>
      <p class="screen__title screen__title--success">Fijn rijden!</p>
      <p class="screen__subtitle">Tot ziens bij P1 Parking.</p>
    `,
    });
    setNavBar({ label: 'Tot ziens!' });
    setTimeout(() => showIdle(), 2000);
}

function printKwitantie() {
    // Kwitantie / wisselgeld gleuf actief
    setGlow('glow-kwitantie', 'active');
    const content = document.getElementById('screen-content');
    const msg = document.createElement('p');
    msg.style.cssText = 'font-size:9px;color:#2E7D32;font-weight:600;text-align:center;width:100%;';
    msg.textContent = '📄 Kwitantie wordt afgedrukt...';
    content.appendChild(msg);
    setTimeout(() => {
        setGlow('glow-kwitantie', 'success');
        msg.textContent = '📄 Pak uw kwitantie uit de gleuf →';
    }, 1200);
}

// ─────────────────────────────────────────────
//  KENTEKEN FLOW
// ─────────────────────────────────────────────
function showKentekenInput() {
    state.step = 'kenteken';
    state.kentekenInput = '';
    clearAllGlows();
    renderKentekenInput();
}

function renderKentekenInput() {
    const numRow = ['1','2','3','4','5','6','7','8','9','0'];
    const row1   = ['Q','W','E','R','T','Y','U','I','O','P'];
    const row2   = ['A','S','D','F','G','H','J','K','L'];
    const row3   = ['Z','X','C','V','B','N','M','-'];
    const rowHtml = keys =>
        `<div style="display:flex;gap:4px;width:100%;justify-content:center;">
      ${keys.map(k => `<button class="keyboard__key" style="flex:1;" onclick="typeKenteken('${k}')">${k}</button>`).join('')}
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
        <div style="display:flex;gap:4px;">
          <button class="keyboard__key" style="flex:1;" onclick="typeKenteken('⌫')">⌫</button>
        </div>
      </div>
      <button class="btn btn--primary" onclick="zoekKenteken()">Zoeken →</button>
    `,
    });
    setNavBar({ back: true, label: 'Kenteken invoeren' });
}

function typeKenteken(k) {
    if (k === '⌫') state.kentekenInput = state.kentekenInput.slice(0, -1);
    else if (state.kentekenInput.length < 9) state.kentekenInput += k;
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
        <span class="icon--shake" style="font-size:24px;">⚠️</span>
        <p class="screen__title screen__title--error">Kenteken niet gevonden</p>
        <p class="screen__subtitle">"${state.kentekenInput}" staat niet geregistreerd.</p>
        <button class="btn btn--secondary" onclick="renderKentekenInput()">← Opnieuw proberen</button>
        <button class="btn btn--secondary" onclick="showIntercom()">📞 Bel de meldkamer</button>
      `,
        });
    }
}

function showKentekenGevonden(k) {
    state.step = 'kt-betaal';
    state.cashTarget = k.euro;
    clearAllGlows();
    setGlow('glow-pinpas', 'active');

    const euroStr = '€ ' + k.euro.toFixed(2).replace('.', ',');
    const cfg = getConfig();
    setScreen({
        progress: 55,
        html: `
      <p class="screen__title">Kenteken gevonden</p>
      <div class="found-plate">
        <p class="found-plate__number">${k.plate}</p>
        <p class="found-plate__meta">Ingecheckt: ${k.tijd} · ${k.duur} · ${cfg.garage}</p>
      </div>
      <p class="screen__amount">${euroStr}</p>
      <div class="screen__divider"></div>
      <button class="pay-option pay-option--selected" onclick="showPinKenteken()">💳 Pinpas / Creditcard</button>
      <button class="pay-option" onclick="showContantKenteken(${k.euro})">💵 Contant betalen</button>
    `,
    });
    setNavBar({ back: true, label: `Kenteken ${k.plate} gevonden` });
}

function showPinKenteken() {
    clearAllGlows();
    setGlow('glow-pinpas', 'active');
    setScreen({
        progress: 75,
        html: `
      <p class="screen__title">Betaal met uw bankpas</p>
      <div style="font-size:26px;animation:tap-pulse 1s ease-in-out infinite alternate;">💳</div>
      <p class="screen__subtitle">Tik uw pas op de contactloze lezer →<br>of steek uw pas in de pinpas gleuf →</p>
    `,
    });
    setNavBar({ back: true, next: true, label: 'Betalen via kenteken' });
}

function showContantKenteken(euro) {
    state.cashIn = 0;
    state.cashTarget = euro;
    state.step = 'contant';
    clearAllGlows();
    showContant();
}

// ─────────────────────────────────────────────
//  INTERCOM
// ─────────────────────────────────────────────
function showIntercom() {
    clearAllGlows();
    setGlow('glow-intercom', 'active');
    const cfg = getConfig();
    const wq = cfg.wachtrij;
    const wqHtml = wq === 0
        ? 'U wordt direct verbonden.'
        : `Er ${wq === 1 ? 'is' : 'zijn'} <span class="queue-indicator__count">${wq} ${wq === 1 ? 'persoon' : 'personen'}</span> voor u.`;
    setScreen({
        modifier: 'warning',
        badge: 'Intercom',
        badgeModifier: 'warning',
        html: `
      <div style="font-size:26px;animation:tap-pulse 1s ease-in-out infinite alternate;">📞</div>
      <p class="screen__title">Meldkamer wordt gebeld</p>
      <div class="queue-indicator">${wqHtml}</div>
      <p class="screen__subtitle">Blijf bij het apparaat staan.</p>
      <button class="btn btn--secondary" onclick="showIdle()">✕ Ophangen</button>
    `,
    });
    setNavBar({ label: 'Intercom actief' });
}

// De nav-knoppen zijn uit de interface verwijderd; handleNext en
// handleBack zijn daarmee vervallen.

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
renderKentekenList();
showIdle();