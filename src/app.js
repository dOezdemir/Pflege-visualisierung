// ==== Helpers ====
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const show = el => el && (el.style.display = 'block'), hide = el => el && (el.style.display = 'none');
const toggle = el => el && (el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none');
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const stdTitel = t => ({ liniendiagramm: 'Liniendiagramm', balkendiagramm: 'Balkendiagramm', kreisdiagramm: 'Kreisdiagramm', zeitstrahl: 'Zeitstrahl', ampel: 'Ampelsymbol', trendpfeil: 'Trendpfeil', symbol: 'Icon', farbcodierung: 'Farbkodierung', text: 'Text' })[t] || t;

// ==== DOM ====
const area = $('#arbeitsflaeche'), insp = $('#inspektor'), noSel = $('#hinweis-keine-auswahl');
const radiosGruppe = $$('input[name="metaGruppe"]'), btnBeispiele = $('#btnBeispiele');
const feld = {
  titel: $('#eigTitel'), farbeAllg: $('#eigFarbeAllgemein'), farbeAmpel: $('#eigFarbeAmpel'), farbePalette: $('#eigFarbePalette'),
  trend: $('#eigTrend'), pfeil: $('#eigPfeilgroesse'), farbkodGroesse: $('#eigFarbkodierungGroesse'),
  iconFA: $('#eigIconFA'), iconSize: $('#eigIconGroesse'), ampelScale: $('#eigAmpelSkalierung'),
  fortschritt: $('#eigFortschritt'), fortOut: $('#eigFortschrittAusgabe'),
  text: $('#eigText'), textSize: $('#eigTextgroesse'), w: $('#eigBreite'), h: $('#eigHoehe'),
  tag: $('#eigKategorie'), del: $('#elementLoeschen'), kreisLabels: $('#eigKreisStichpunkte')
};
const ui = {
  speichern: $('#speichern'), laden: $('#laden'), datei: $('#dateieingabe'), reset: $('#zuruecksetzen'),
  notiz: $('#notizUmschalten'), teilnehmer: $('#teilnehmerId'), aufgabe: $('#aufgabe')
};

// ==== Konstanten / Zustand ====
const FARBE = { neutral: '#1e88e5', gruen: '#43a047', gelb: '#fbc02d', rot: '#e53935', orange: '#fb8c00', violett: '#7e57c2', grau: '#9e9e9e', braun: '#795548', schwarz: '#000' };
const AMP = ['rot', 'gelb', 'gruen'], TYP_DIAG = ['liniendiagramm', 'balkendiagramm', 'kreisdiagramm', 'zeitstrahl'], TYP_KOMPAKT = ['ampel', 'trendpfeil', 'symbol', 'farbcodierung'];
let idZ = 0, sel = null, erstelltAm = new Date().toISOString(); const events = [], charts = new Map();

// ==== Palette & DnD ====
function initPalette() {
  $$('#seitenleisteLinks .paletten-element').forEach(el => el.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', el.dataset.typ); e.dataTransfer.effectAllowed = 'copy';
  }));
}
area.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
area.addEventListener('drop', e => {
  e.preventDefault(); const t = e.dataTransfer.getData('text/plain'); if (!t) return;
  const r = area.getBoundingClientRect(); addElement(t, e.clientX - r.left, e.clientY - r.top);
});

// ==== Element anlegen / Auswahl / Drag ====
function addElement(typ, x, y) {
  const el = document.createElement('div'); el.className = 'leinwand-element'; el.dataset.typ = typ; el.dataset.id = `el-${++idZ}`;
  Object.assign(el.dataset, {
    titel: stdTitel(typ), farbe: 'neutral', trend: 'gleich', icon: 'fa-stethoscope', text: '', fortschritt: '50',
    textgroesse: '14', icongroesse: '42', pfeilgroesse: '32', ampelskalierung: '1', gruppentag: '', kreislabels: '', fixedsize: '0'
  });
  const komp = TYP_KOMPAKT.includes(typ);
  Object.assign(el.style, { left: (x - 20) + 'px', top: (y - 20) + 'px', width: komp ? 'auto' : '460px', height: komp ? 'auto' : '240px' });
  const head = document.createElement('header'); head.textContent = el.dataset.titel;
  const body = document.createElement('div'); body.className = 'inhalt'; body.textContent = `(${typ}-Platzhalter)`;
  el.append(head, body); area.appendChild(el); makeDraggable(el); render(el); select(el); return el;
}
function select(el) { sel?.classList.remove('ausgewaehlt'); sel = el; if (sel) { sel.classList.add('ausgewaehlt'); fillInspector(sel); } else { hide(insp); show(noSel); } }
area.addEventListener('mousedown', e => { if (e.target === area) select(null); });
function makeDraggable(el) {
  let drag = false, sx = 0, sy = 0, sl = 0, st = 0;
  el.addEventListener('mousedown', e => {
    if (e.button !== 0) return; select(el); drag = true; sx = e.clientX; sy = e.clientY;
    sl = parseInt(el.style.left || '0', 10); st = parseInt(el.style.top || '0', 10);
    const move = ev => {
      if (!drag) return; const A = area.getBoundingClientRect(), R = el.getBoundingClientRect();
      const L = clamp(sl + (ev.clientX - sx), 0, A.width - R.width), T = clamp(st + (ev.clientY - sy), 0, A.height - R.height);
      el.style.left = L + 'px'; el.style.top = T + 'px';
    };
    const up = () => { drag = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); e.preventDefault();
  });
}

// ==== Charts ====
function killChart(el) { const c = charts.get(el.dataset.id); if (c) { c.destroy(); charts.delete(el.dataset.id); } }
function chartIn(container, typ, farbe) {
  container.innerHTML = ''; const cv = document.createElement('canvas'); container.appendChild(cv);
  const ctx = cv.getContext('2d'), base = FARBE[farbe] || FARBE.neutral;
  const labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], dLine = [78, 82, 76, 90, 88, 84, 80], dBar = [14, 9, 12, 7, 16, 11, 10];
  return new Chart(ctx, {
    type: (typ === 'liniendiagramm' ? 'line' : 'bar'),
    data: {
      labels, datasets: [{
        label: (typ === 'liniendiagramm' ? 'Wert' : 'Anzahl'), data: (typ === 'liniendiagramm' ? dLine : dBar),
        borderColor: base, backgroundColor: (typ === 'liniendiagramm' ? 'transparent' : base + '33'), tension: .3, borderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: '#eee' } } }
    }
  });
}

// ==== Compact fit helper ====
function fitCompactContentToBox(el) {
  if (!TYP_KOMPAKT.includes(el.dataset.typ)) return;
  const w = parseInt(el.style.width, 10) || el.getBoundingClientRect().width || 1;
  const h = parseInt(el.style.height, 10) || el.getBoundingClientRect().height || 1;
  const m = Math.max(1, Math.min(w, h));
  switch (el.dataset.typ) {
    case 'trendpfeil': el.dataset.pfeilgroesse = String(clamp(Math.floor(m * 0.8), 12, 400)); break;
    case 'symbol': el.dataset.icongroesse = String(clamp(Math.floor(m * 0.8), 8, 512)); break;
    case 'farbcodierung': el.dataset.icongroesse = String(clamp(Math.floor(m * 0.7), 8, 512)); break;
    case 'ampel': {
      // Basisgröße der Ampel (ungefähr): 28 x 80 (Breite x Höhe)
      const s = clamp(Math.min(w / 28, h / 80), 0.3, 5);
      el.dataset.ampelskalierung = String(+s.toFixed(2));
      break;
    }
  }
}

// ==== Render ====
function render(el) {
  const typ = el.dataset.typ, col = el.dataset.farbe || 'neutral', head = el.querySelector('header'), c = el.querySelector('.inhalt');
  const isDiag = TYP_DIAG.includes(typ), komp = TYP_KOMPAKT.includes(typ);
  head.style.display = isDiag ? 'block' : 'none'; head.textContent = el.dataset.titel || '';
  Object.assign(el.style, isDiag ? { border: '2px solid #ccc', background: '#fff', padding: '10px' } : { border: 'none', background: 'transparent', padding: komp ? '0' : '' });

  // Reset + bei fixedsize den Inhalt auf Boxmaß strecken (für zentriertes Scaling)
  Object.assign(c.style, { display: '', alignItems: '', justifyContent: '', fontSize: '', padding: '', whiteSpace: '', color: '', width: '', height: '' });
  if (komp && el.dataset.fixedsize === '1') { c.style.width = '100%'; c.style.height = '100%'; c.style.display = 'flex'; c.style.alignItems = 'center'; c.style.justifyContent = 'center'; }

  killChart(el);
  if (komp && el.dataset.fixedsize === '1') fitCompactContentToBox(el); // Größen aus Box ableiten

  const base = FARBE[col] || FARBE.neutral, R = {
    trendpfeil() {
      const map = { auf: '↑', ab: '↓', gleich: '→' };
      c.innerHTML = `<div style="font-size:${parseInt(el.dataset.pfeilgroesse || '32', 10)}px;color:${base};">${map[el.dataset.trend] || '→'}</div>`;
      if (!(komp && el.dataset.fixedsize === '1')) Object.assign(c.style, { display: 'flex', alignItems: 'center', justifyContent: 'center' });
    },
    symbol() {
      const ic = (el.dataset.icon || 'fa-stethoscope').startsWith('fa-') ? el.dataset.icon : 'fa-stethoscope';
      c.innerHTML = `<i class="fa-solid ${ic}"></i>`; const i = c.querySelector('i'); i.style.fontSize = (parseInt(el.dataset.icongroesse || '42', 10)) + 'px'; i.style.color = base;
      if (!(komp && el.dataset.fixedsize === '1')) Object.assign(c.style, { display: 'flex', alignItems: 'center', justifyContent: 'center' });
    },
    ampel() {
      const f = AMP.includes(col) ? col : 'gruen';
      c.innerHTML = `<div class="ampel" style="transform:scale(${parseFloat(el.dataset.ampelskalierung || '1')});">
        <div class="lampe rot"   style="opacity:${f === 'rot' ? 1 : .25}"></div>
        <div class="lampe gelb"  style="opacity:${f === 'gelb' ? 1 : .25}"></div>
        <div class="lampe gruen" style="opacity:${f === 'gruen' ? 1 : .25}"></div></div>`;
      if (!(komp && el.dataset.fixedsize === '1')) Object.assign(c.style, { display: 'flex', alignItems: 'center', justifyContent: 'center' });
    },
    zeitstrahl() {
      const p = clamp(parseInt(el.dataset.fortschritt || '50', 10), 0, 100);
      c.innerHTML = `<div class="zeitstrahl">
        <div class="zs-track"><div class="zs-rail"></div><div class="zs-thumb"></div></div>
        <div class="zs-ticks">${[0, 25, 50, 75, 100].map(t => `<span style="left:${t}%"></span>`).join('')}</div>
        <div class="zs-labels"><span>0%</span><span>100%</span></div></div>`;
      c.querySelector('.zeitstrahl').style.setProperty('--zs-color', base);
      const thumb = c.querySelector('.zs-thumb'), rail = c.querySelector('.zs-rail'); thumb.style.setProperty('--p', p);
      let dragging = false; const toP = x => { const r = rail.getBoundingClientRect(); return Math.round((clamp(x - r.left, 0, r.width) / r.width) * 100); };
      thumb.addEventListener('mousedown', e => { dragging = true; e.preventDefault(); });
      document.addEventListener('mousemove', e => {
        if (!dragging) return; const np = toP(e.clientX); el.dataset.fortschritt = String(np);
        thumb.style.setProperty('--p', np); if (feld.fortschritt) { feld.fortschritt.value = np; feld.fortOut.textContent = np + '%'; }
      });
      document.addEventListener('mouseup', () => dragging = false);
    },
    text() { c.textContent = el.dataset.text || 'Text…'; c.style.fontSize = (parseInt(el.dataset.textgroesse || '14', 10)) + 'px'; c.style.whiteSpace = 'pre-wrap'; c.style.padding = '6px'; },
    farbcodierung() {
      const s = parseInt(el.dataset.icongroesse || '24', 10);
      c.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
        <div style="width:${s}px;height:${s}px;border-radius:4px;background:${base};"></div></div>`;
    },
    kreisdiagramm() {
      const labels = (el.dataset.kreislabels || '').split(/\n+/).map(s => s.trim()).filter(Boolean), data = labels.length ? labels.map(() => 1) : [1];
      const al = ['FF', 'E6', 'CC', 'B3', '99', '80', '66', '4D', '33', '1A'], colors = data.map((_, i) => base + al[i % al.length]);
      c.innerHTML = ''; const cv = document.createElement('canvas'); c.appendChild(cv); const ctx = cv.getContext('2d');
      const ch = new Chart(ctx, {
        type: 'pie', data: { labels: labels.length ? labels : [''], datasets: [{ data, backgroundColor: colors, borderColor: '#fff', borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: labels.length > 0, position: 'bottom' }, tooltip: { enabled: false } } }
      });
      charts.set(el.dataset.id, ch);
    },
    liniendiagramm() { charts.set(el.dataset.id, chartIn(c, 'liniendiagramm', col)); },
    balkendiagramm() { charts.set(el.dataset.id, chartIn(c, 'balkendiagramm', col)); }
  };
  (R[typ] || (() => { c.textContent = `(${typ}-Platzhalter)` }))();

  // Auto-Fit nur für kompakte Elemente, wenn nicht manuell fixiert
  if (komp && el.dataset.fixedsize !== '1') {
    const r = c.getBoundingClientRect();
    el.style.width = Math.ceil(r.width) + 'px';
    el.style.height = Math.ceil(r.height) + 'px';
  }
}

// ==== Inspector & Bindings ====
function fillInspector(el) {
  hide(noSel); show(insp); const typ = el.dataset.typ;
  $$('.nur-trendpfeil,.nur-symbol,.nur-text,.nur-ampel,.nur-zeitstrahl,.nur-farbcodierung,.nur-kreis').forEach(hide);
  show($('.groessenraster')); hide($('.farbe-allgemein'));
  const S = {
    ampel: ['.nur-ampel', '.farbe-allgemein'], farbcodierung: ['.nur-farbcodierung', '.farbe-allgemein'],
    trendpfeil: ['.nur-trendpfeil', '.farbe-allgemein'], symbol: ['.nur-symbol', '.farbe-allgemein'],
    text: ['.nur-text'], zeitstrahl: ['.nur-zeitstrahl', '.farbe-allgemein'],
    kreisdiagramm: ['.nur-kreis', '.farbe-allgemein'], liniendiagramm: ['.farbe-allgemein'], balkendiagramm: ['.farbe-allgemein']
  };
  (S[typ] || []).forEach(s => show($(s)));

  feld.titel.value = el.dataset.titel || '';
  if (typ === 'ampel') feld.farbeAmpel.value = AMP.includes(el.dataset.farbe) ? el.dataset.farbe : 'gruen';
  else if (typ === 'farbcodierung') feld.farbePalette.value = el.dataset.farbe || 'neutral';
  else feld.farbeAllg.value = el.dataset.farbe || 'neutral';
  feld.trend.value = el.dataset.trend || 'gleich'; feld.pfeil.value = parseInt(el.dataset.pfeilgroesse || '32', 10);
  feld.iconFA.value = el.dataset.icon || 'fa-stethoscope'; feld.iconSize.value = parseInt(el.dataset.icongroesse || '42', 10);
  feld.ampelScale.value = parseFloat(el.dataset.ampelskalierung || '1');
  const p = clamp(parseInt(el.dataset.fortschritt || '50', 10), 0, 100); feld.fortschritt.value = p; feld.fortOut.textContent = p + '%';
  feld.text.value = el.dataset.text || ''; feld.textSize.value = parseInt(el.dataset.textgroesse || '14', 10);
  feld.w.value = parseInt(el.style.width || '260', 10); feld.h.value = parseInt(el.style.height || '140', 10);
  feld.tag.value = el.dataset.gruppentag || '';
  if (typ === 'kreisdiagramm' && feld.kreisLabels) feld.kreisLabels.value = el.dataset.kreislabels || '';
  if (typ === 'farbcodierung' && feld.farbkodGroesse) feld.farbkodGroesse.value = parseInt(el.dataset.icongroesse || '24', 10);
}
const RERENDER = () => sel && render(sel);
function bindMap(list) {
  for (const m of list) {
    const i = m.input; if (!i) continue; const h = () => { if (!sel) return; if (m.if && !m.if(sel)) return; m.set(sel, i); };
    i.addEventListener('input', h); i.addEventListener('change', h);
  }
}
bindMap([
  { input: feld.titel, set: (el, i) => { el.dataset.titel = i.value; RERENDER(); } },
  { input: feld.farbeAllg, if: el => !['ampel', 'farbcodierung'].includes(el.dataset.typ), set: (el, i) => { el.dataset.farbe = i.value; RERENDER(); } },
  { input: feld.farbeAmpel, if: el => el.dataset.typ === 'ampel', set: (el, i) => { el.dataset.farbe = AMP.includes(i.value) ? i.value : 'gruen'; RERENDER(); } },
  { input: feld.farbePalette, if: el => el.dataset.typ === 'farbcodierung', set: (el, i) => { el.dataset.farbe = i.value; RERENDER(); } },
  { input: feld.farbkodGroesse, if: el => el.dataset.typ === 'farbcodierung', set: (el, i) => { el.dataset.icongroesse = String(clamp(parseInt(i.value || '24', 10), 8, 64)); RERENDER(); } },
  { input: feld.kreisLabels, set: (el, i) => { el.dataset.kreislabels = i.value || ''; RERENDER(); } },
  { input: feld.trend, set: (el, i) => { el.dataset.trend = i.value; RERENDER(); } },
  { input: feld.pfeil, set: (el, i) => { el.dataset.pfeilgroesse = String(clamp(parseInt(i.value || '32', 10), 12, 400)); RERENDER(); } },
  { input: feld.iconFA, set: (el, i) => { el.dataset.icon = i.value || 'fa-stethoscope'; RERENDER(); } },
  { input: feld.iconSize, set: (el, i) => { el.dataset.icongroesse = String(clamp(parseInt(i.value || '42', 10), 8, 512)); RERENDER(); } },
  { input: feld.ampelScale, set: (el, i) => { el.dataset.ampelskalierung = String(clamp(parseFloat(i.value || '1'), 0.3, 5)); RERENDER(); } },
  { input: feld.fortschritt, set: (el, i) => { const p = clamp(parseInt(i.value || '50', 10), 0, 100); el.dataset.fortschritt = String(p); feld.fortOut.textContent = p + '%'; RERENDER(); } },
  { input: feld.text, set: (el, i) => { el.dataset.text = i.value; RERENDER(); } },
  { input: feld.textSize, set: (el, i) => { el.dataset.textgroesse = String(clamp(parseInt(i.value || '14', 10), 10, 200)); RERENDER(); } },
  // Größe – setzt fixedsize=1 und skaliert Inhalt passend zur Box
  { input: feld.w, set: (el, i) => { el.style.width = clamp(parseInt(i.value || '260', 10), 60, 5000) + 'px'; el.dataset.fixedsize = '1'; fitCompactContentToBox(el); RERENDER(); } },
  { input: feld.h, set: (el, i) => { el.style.height = clamp(parseInt(i.value || '140', 10), 40, 5000) + 'px'; el.dataset.fixedsize = '1'; fitCompactContentToBox(el); RERENDER(); } },
  { input: feld.tag, set: (el, i) => { el.dataset.gruppentag = i.value; } }
]);
feld.del?.addEventListener('click', () => { if (!sel) return; killChart(sel); sel.remove(); sel = null; hide(insp); show(noSel); });
document.addEventListener('keydown', e => { if (e.key === 'Delete' && sel) { killChart(sel); sel.remove(); sel = null; hide(insp); show(noSel); } });

// ==== Notiz ====
let note = null;
function ensureNote() {
  if (note) return note;
  note = document.createElement('div'); note.className = 'notiz-panel';
  note.innerHTML = `<div class="notiz-kopf"><span>Anmerkung</span><button class="schliessen" aria-label="Schließen">&times;</button></div>
    <div class="notiz-inhalt"><textarea placeholder="Notiz hier eingeben..."></textarea></div>`;
  area.appendChild(note);
  note.querySelector('.schliessen').addEventListener('click', () => note.style.display = 'none');
  let d = false, sx = 0, sy = 0, sl = 0, st = 0; const head = note.querySelector('.notiz-kopf');
  head.addEventListener('mousedown', e => {
    d = true; sx = e.clientX; sy = e.clientY;
    const r = note.getBoundingClientRect(), a = area.getBoundingClientRect(); sl = r.left - a.left; st = r.top - a.top;
    const mv = ev => {
      if (!d) return; const A = area.getBoundingClientRect(), R = note.getBoundingClientRect();
      const L = clamp(sl + (ev.clientX - sx), 0, A.width - R.width), T = clamp(st + (ev.clientY - sy), 0, A.height - R.height);
      Object.assign(note.style, { left: L + 'px', top: T + 'px', right: 'auto' });
    };
    const up = () => { d = false; document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); e.preventDefault();
  });
  return note;
}
ui.notiz?.addEventListener('click', () => toggle(ensureNote()));

// ==== Export / Import / Reset ====
function exportData() {
  const items = $$('.leinwand-element').map(el => {
    const rect = { left: parseInt(el.style.left || '0', 10), top: parseInt(el.style.top || '0', 10), width: el.offsetWidth, height: el.offsetHeight };
    return {
      typ: el.dataset.typ, titel: el.dataset.titel || '', farbe: el.dataset.farbe || 'neutral', trend: el.dataset.trend || 'gleich',
      icon: el.dataset.icon || '', text: el.dataset.text || '', fortschritt: el.dataset.fortschritt || '50', textgroesse: el.dataset.textgroesse || '14',
      icongroesse: el.dataset.icongroesse || '42', pfeilgroesse: el.dataset.pfeilgroesse || '32', ampelskalierung: el.dataset.ampelskalierung || '1',
      gruppentag: el.dataset.gruppentag || '', kreislabels: el.dataset.kreislabels || '', rect
    };
  });
  const n = ensureNote(), A = area.getBoundingClientRect(), nr = n.getBoundingClientRect();
  const notiz = {
    sichtbar: n.style.display !== 'none', left: parseInt(n.style.left ? n.style.left : (nr.left - A.left), 10) || 20,
    top: parseInt(n.style.top ? n.style.top : (nr.top - A.top), 10) || 20, text: n.querySelector('textarea').value || ''
  };
  const gruppe = document.querySelector('input[name="metaGruppe"]:checked')?.value || '';
  return {
    schema: 'ui-box-builder.v2', studie: {
      teilnehmerId: ui.teilnehmer?.value || '', aufgabe: ui.aufgabe?.value || '',
      gruppe, erstelltAm, beendetAm: new Date().toISOString()
    }, elemente: items, analyse: { ereignisse: events }, notiz
  };
}
function importData(d) {
  if (!d) return; resetAll();
  const s = d.studie || d.study;
  if (s) {
    if (ui.teilnehmer) ui.teilnehmer.value = s.teilnehmerId ?? s.participantId ?? ''; if (ui.aufgabe) ui.aufgabe.value = s.aufgabe ?? s.task ?? '';
    const g = s.gruppe ?? s.group; if (g) document.querySelector(`input[name="metaGruppe"][value="${g}"]`)?.click();
    erstelltAm = s.erstelltAm ?? s.createdAt ?? new Date().toISOString();
  }
  const items = d.elemente || (Array.isArray(d.items) ? d.items.map(it => ({
    typ: (it.typ || it.type), titel: it.titel ?? it.title, farbe: it.farbe ?? it.color,
    trend: it.trend, icon: it.icon, text: it.text, fortschritt: it.fortschritt ?? it.progress, textgroesse: it.textgroesse ?? it.textSize,
    icongroesse: it.icongroesse ?? it.iconSize, pfeilgroesse: it.pfeilgroesse ?? it.arrowSize, ampelskalierung: it.ampelskalierung ?? it.trafficScale,
    gruppentag: it.gruppentag ?? it.groupTag, kreislabels: it.kreislabels ?? it.pieLabels ?? '', rect: it.rect
  })) : []);
  items.forEach(it => {
    const el = addElement(it.typ, it.rect.left + 10, it.rect.top + 10);
    Object.assign(el.dataset, {
      titel: it.titel || stdTitel(it.typ), farbe: it.farbe || 'neutral', trend: it.trend || 'gleich', icon: it.icon || '',
      text: it.text || '', fortschritt: it.fortschritt || '50', textgroesse: it.textgroesse || '14', icongroesse: it.icongroesse || '42',
      pfeilgroesse: it.pfeilgroesse || '32', ampelskalierung: it.ampelskalierung || '1', gruppentag: it.gruppentag || '', kreislabels: it.kreislabels || ''
    });
    el.style.left = it.rect.left + 'px'; el.style.top = it.rect.top + 'px';
    el.style.width = it.rect.width + 'px'; el.style.height = it.rect.height + 'px';
    if (TYP_KOMPAKT.includes(it.typ)) { el.dataset.fixedsize = '1'; fitCompactContentToBox(el); }
    render(el);
  });
  const n = d.notiz || d.note; if (n) {
    const p = ensureNote(); p.style.display = (n.sichtbar ?? n.visible) ? 'block' : 'none';
    p.style.left = (n.left ?? 20) + 'px'; p.style.top = (n.top ?? 20) + 'px'; p.style.right = 'auto'; p.querySelector('textarea').value = n.text || '';
  }
}
function resetAll() {
  $$('.leinwand-element').forEach(el => { killChart(el); el.remove(); });
  sel = null; hide(insp); show(noSel); charts.clear(); idZ = 0;
  const n = ensureNote(); n.style.display = 'none'; n.style.left = 'auto'; n.style.right = '20px'; n.style.top = '20px'; n.querySelector('textarea').value = '';
}

// ==== Buttons ====
ui.speichern?.addEventListener('click', () => {
  const data = exportData(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'layout.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});
ui.laden && ui.datei && (ui.laden.addEventListener('click', () => ui.datei.click()),
  ui.datei.addEventListener('change', e => {
    const f = e.target.files?.[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { try { importData(JSON.parse(r.result)) } catch { alert('Ungültige JSON-Datei.') } finally { ui.datei.value = ''; } }; r.readAsText(f);
  }));
ui.reset?.addEventListener('click', resetAll);

// ==== Beispiele (Gruppe A) ====
function updateBeispielBtn() { if (btnBeispiele) btnBeispiele.hidden = (document.querySelector('input[name="metaGruppe"]:checked')?.value !== 'A'); }
radiosGruppe.forEach(r => r.addEventListener('change', updateBeispielBtn)); updateBeispielBtn();
btnBeispiele?.addEventListener('click', () => {
  const g = document.querySelector('input[name="metaGruppe"]:checked')?.value; if (g !== 'A') return;
  importData({
    schema: 'ui-box-builder.v2', studie: { teilnehmerId: '', aufgabe: 'pflege', gruppe: 'A', erstelltAm: new Date().toISOString(), beendetAm: '' },
    analyse: { ereignisse: [] }, notiz: { sichtbar: false, left: 20, top: 20, text: '' },
    elemente: [
      { typ: 'liniendiagramm', titel: 'Vitalwerte Verlauf', farbe: 'gruen', trend: 'gleich', icon: '', text: '', fortschritt: '50', textgroesse: '14', icongroesse: '42', pfeilgroesse: '32', ampelskalierung: '1', gruppentag: 'Vitalwerte', rect: { left: 40, top: 40, width: 400, height: 200 } },
      { typ: 'ampel', titel: '', farbe: 'rot', trend: 'gleich', icon: '', text: '', fortschritt: '50', textgroesse: '14', icongroesse: '42', pfeilgroesse: '32', ampelskalierung: '1', gruppentag: 'Atemweg', rect: { left: 480, top: 60, width: 60, height: 60 } }
    ]
  });
});

// ==== Start ====
initPalette(); hide(insp); show(noSel);
