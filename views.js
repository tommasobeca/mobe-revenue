/* MoBe Revenue Tracker — UI kit, router, viste */
'use strict';
const I = (() => {
  const p = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    left: '<path d="m15 6-6 6 6 6"/>', right: '<path d="m9 6 6 6-6 6"/>', down: '<path d="M12 4v11m-5-4 5 5 5-5M5 20h14"/>',
    home: '<path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    ext: '<path d="M9 6h9v9M18 6 6 18"/>',
  };
  return (n, sw = 1.6) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p[n] || ''}</svg>`;
})();

/* ---------------- toast / modal / confirm ---------------- */
function toast(msg, kind = '', action = null) {
  const el = document.createElement('div'); el.className = 'toast ' + kind; const sp = document.createElement('span'); sp.textContent = msg; el.appendChild(sp);
  if (action) { const b = document.createElement('button'); b.className = 'toast-act'; b.textContent = action.label; b.onclick = () => { el.remove(); action.run(); }; el.appendChild(b); }
  $('#toast-root').innerHTML = ''; $('#toast-root').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = 0; setTimeout(() => el.remove(), 300); }, action ? 4200 : kind === 'err' ? 4200 : 2200);
}
const Modal = {
  stack: [],
  open({ title = '', body = '', foot = '', size = '', onMount, onClose }) {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true"><div class="modal-h"><div class="h2">${title}</div><button class="btn ghost icon sm x" data-x aria-label="Chiudi">${I('x')}</button></div><div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}</div>`;
    $('#modal-root').appendChild(bg); document.body.classList.add('modal-open');
    const m = { el: bg.firstElementChild, close: () => { bg.remove(); Modal.stack = Modal.stack.filter(x => x !== m); if (!Modal.stack.length) document.body.classList.remove('modal-open'); onClose && onClose(); } };
    bg.addEventListener('mousedown', (e) => { if (e.target === bg) m.close(); });
    bg.querySelectorAll('[data-x]').forEach(b => b.onclick = () => m.close());
    Modal.stack.push(m); onMount && onMount(m.el, m);
    const f = m.el.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 40);
    return m;
  },
  closeTop() { const m = Modal.stack[Modal.stack.length - 1]; if (m) m.close(); return !!m; },
};
function confirmDlg(msg, { ok = 'Elimina', title = 'Sei sicuro?' } = {}) {
  return new Promise((res) => {
    let done = false;
    const m = Modal.open({ title, size: 'sm', body: `<p class="muted">${msg}</p>`, foot: `<button class="btn ghost" data-x>Annulla</button><button class="btn danger" data-ok>${ok}</button>`, onClose: () => { if (!done) res(false); } });
    m.el.querySelector('[data-ok]').onclick = () => { done = true; m.close(); res(true); };
  });
}

/* ---------------- stato + router ---------------- */
const ui = {
  year: (() => { const y = +localStorage.getItem('mobe-rev-year'); return y || new Date().getFullYear(); })(),
  q: '',
};
function setYear(y) { ui.year = y; try { localStorage.setItem('mobe-rev-year', String(y)); } catch (e) { } }
const Router = {
  parse() {
    const h = location.hash.replace(/^#/, '');
    let m;
    if ((m = h.match(/^m-(\d{4})-(\d{2})-c-([a-z0-9]+)$/))) return { view: 'clientMonth', y: +m[1], m: +m[2], cid: m[3] };
    if ((m = h.match(/^m-(\d{4})-(\d{2})$/))) return { view: 'month', y: +m[1], m: +m[2] };
    if ((m = h.match(/^cliente-([a-z0-9]+)$/))) return { view: 'client', cid: m[1] };
    if (h === 'clienti') return { view: 'clients' };
    return { view: 'home' };
  },
  go(h) { h = h || 'home'; if (location.hash === '#' + h) this.render(); else location.hash = '#' + h; },
  render(keepScroll) {
    const r = this.parse(); this.current = r;
    if (r.y && r.m >= 1 && r.m <= 12 && r.y !== ui.year) setYear(r.y);
    const main = $('#main'); const st = main.scrollTop;
    $('#fab').onclick = () => entryModal({});
    (Views[r.view] || Views.home)(r);
    main.scrollTop = keepScroll ? st : 0;
    const fab = $('#fab'); const showFab = r.view !== 'clients' && r.view !== 'client';
    fab.hidden = !showFab;
    fab.innerHTML = `${I('plus', 1.8)}<span>${r.view === 'clientMonth' ? 'Entrata' : 'Nuova entrata'}</span>`;
  },
};
const ymHash = (y, m) => `m-${D.ym(y, m)}`;

/* ---------------- frammenti UI ---------------- */
const logoImg = (cls = '') => `<img class="${cls}" src="logo.png" alt="MoBe Visuals">`;
function bar(backHref, backLabel) {
  return `<header class="bar"><a class="back" href="#${backHref}">${I('left')}<span>${esc(backLabel)}</span></a>
    <a class="bar-brand" href="#home" aria-label="Home">${logoImg()}</a>
    <a class="bar-home" href="#home" aria-label="Torna alla home">${I('home')}</a></header>`;
}
function statGrid(s, extra = []) {
  const cells = [
    ['Entrate', Money.fmt(s.tot), ''],
    ['Accantonamento 30%', Money.fmt(s.quota), 'acc'],
    ['Netto', Money.fmt(s.netto), ''],
    ...extra,
  ];
  return `<div class="stats s${cells.length}">${cells.map(([l, n, c]) => `<div class="stat ${c}"><div class="l">${l}</div><div class="n">${n}</div></div>`).join('')}</div>`;
}
function statusPill(ym, cid, count) {
  const st = Data.monthStatus(ym, cid);
  if (st.paid) return `<span class="pill paid">${I('check', 2)}Pagata</span>`;
  if (st.sent) return `<span class="pill sent">Fattura inviata</span>`;
  return count ? `<span class="pill todo">Da fatturare</span>` : '';
}
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

/* ---------------- viste ---------------- */
const Views = {};

Views.home = () => {
  const y = ui.year; const years = Data.years(); const all = Data.inYear(y); const s = sum(all);
  const today = new Date(); const curYM = D.ym(today.getFullYear(), today.getMonth() + 1);
  const months = MONTHS_L.map((name, i) => ({ name, m: i + 1, s: sum(Data.inMonth(y, i + 1)) }));
  const max = Math.max(1, ...months.map(x => x.s.tot));
  const d = new Date();
  $('#main').innerHTML = `<div class="page home">
    <header class="home-top">
      <a class="home-brand" href="#home" aria-label="MoBe Visuals">${logoImg()}</a>
      <div class="home-id"><span class="home-title">Revenue <em>Tracker</em></span><span class="home-date">${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}</span></div>
      <button class="home-add" data-act="quick" title="Nuova entrata" aria-label="Nuova entrata">${I('plus', 1.4)}</button>
    </header>
    <nav class="years" role="tablist" aria-label="Anno">${years.map(x => `<button class="${x === y ? 'on' : ''}" data-year="${x}" role="tab" aria-selected="${x === y}">${x}</button>`).join('')}</nav>
    <section class="dash" aria-label="Riepilogo ${y}">
      <div class="dash-main"><div class="dl">Fatturato annuale <span class="dy">${y}</span></div><div class="dv" id="k-tot">${Money.fmt(s.tot)}</div></div>
      <div class="dash-acc"><div class="dl">Accantonamento 30%</div><div class="dv2" id="k-quota">${Money.fmt(s.quota)}</div></div>
      <div class="dash-foot">
        <div><span>Netto annuale</span><b>${Money.fmt(s.netto)}</b></div>
        <div><span>Registrazioni</span><b>${s.count}</b></div>
        <div><span>Clienti attivi</span><b>${s.clients}</b></div>
      </div>
    </section>
    <div class="sec-h months-h"><span class="sec-t">I mesi del ${y}</span><span class="sec-c">${months.filter(x => x.s.count).length}/12 con entrate</span></div>
    <div class="months">${months.map(x => {
      const cur = D.ym(y, x.m) === curYM; const has = x.s.count > 0;
      // clienti con entrate nel mese non ancora segnati come "Pagata"
      const open = has ? new Set(Data.inMonth(y, x.m).map(e => e.clientId).filter(cid => !Data.monthStatus(D.ym(y, x.m), cid).paid)).size : 0;
      const stTitle = !has ? 'Nessuna registrazione' : open ? `${open} ${open === 1 ? 'cliente' : 'clienti'} da incassare` : 'Tutto pagato';
      return `<a class="mcard ${has ? 'has' : ''} ${open ? 'open' : ''} ${cur ? 'cur' : ''}" href="#${ymHash(y, x.m)}" aria-label="${x.name} ${y}: ${stTitle}">
        <div class="mc-top"><span class="mn">${pad(x.m)}</span>${cur ? '<span class="now">Ora</span>' : ''}<i class="dot" title="${stTitle}"></i></div>
        <div class="mname">${x.name}</div>
        <div class="mtot">${has ? Money.fmt(x.s.tot) : '<span class="nil">—</span>'}</div>
        <div class="mq">${has ? `30% ${Money.fmt(x.s.quota)}` : '&nbsp;'}</div>
        <div class="mbar" title="Quota sul mese migliore dell’anno"><span style="width:${has ? Math.max(3, x.s.tot / max * 100) : 0}%"></span></div>
      </a>`;
    }).join('')}</div>
    <nav class="home-foot"><a href="#clienti">${I('users')}Database clienti <span class="cnt">${Store.all('clients').length}</span></a>
      <button data-act="csv">${I('down')}Esporta ${y}</button></nav>
    <div class="account">${esc(Auth.user?.email || '')} · <button data-act="import">Importa backup</button> · <button data-act="out">Esci</button></div>
  </div>`;
  $$('[data-year]').forEach(b => b.onclick = () => { setYear(+b.dataset.year); Router.render(true); });
  $('[data-act="quick"]').onclick = () => entryModal({});
  $('[data-act="csv"]').onclick = () => exportCSV(y);
  $('[data-act="out"]').onclick = signOut;
  $('[data-act="import"]').onclick = importModal;
};

Views.month = ({ y, m }) => {
  if (m < 1 || m > 12) return Router.go('');
  const es = Data.inMonth(y, m); const s = sum(es);
  const clients = Data.monthClients(y, m).map(c => ({ c, s: sum(es.filter(e => e.clientId === c.id)) }))
    .sort((a, b) => b.s.tot - a.s.tot || a.c.name.localeCompare(b.c.name, 'it'));
  const prev = m === 1 ? [y - 1, 12] : [y, m - 1]; const next = m === 12 ? [y + 1, 1] : [y, m + 1];
  $('#main').innerHTML = `${bar('', String(y))}<div class="page">
    <div class="head">
      <div class="eyebrow">Mese · ${y}</div>
      <div class="head-row"><h1 class="h1">${MONTHS_L[m - 1]} <em>${y}</em></h1>
        <div class="mnav"><a href="#${ymHash(...prev)}" aria-label="Mese precedente">${I('left')}</a><a href="#${ymHash(...next)}" aria-label="Mese successivo">${I('right')}</a></div></div>
    </div>
    ${statGrid(s, [['Registrazioni', String(s.count), 'sm'], ['Clienti attivi', String(s.clients), 'sm']])}
    <div class="sec-h"><span class="sec-t">Clienti del mese</span><button class="btn sm" data-act="add-client">${I('plus')}Aggiungi cliente</button></div>
    ${clients.length ? `<div class="clist">${clients.map(({ c, s: cs }) => `
      <a class="ccard" href="#${ymHash(y, m)}-c-${c.id}">
        <div class="ini">${esc(c.name.trim().slice(0, 1).toUpperCase())}</div>
        <div class="cc-main"><div class="cc-name">${esc(c.name)}</div><div class="cc-sub">${cs.count ? plural(cs.count, 'registrazione', 'registrazioni') : 'Nessuna entrata ancora'}${cs.quota ? ` · 30% ${Money.fmt(cs.quota)}` : ''}</div>${(() => { const p = statusPill(D.ym(y, m), c.id, cs.count); return p ? `<div class="cc-st">${p}</div>` : ''; })()}</div>
        <div class="cc-tot">${Money.fmt(cs.tot)}</div>
        <span class="chev">${I('right')}</span>
      </a>`).join('')}
      <div class="ctotal"><span>Totale mese</span><b>${Money.fmt(s.tot)}</b></div></div>`
    : `<div class="empty"><div class="h2">Nessuna entrata a ${MONTHS_L[m - 1].toLowerCase()}</div><p>Aggiungi un cliente al mese e registra il primo compenso. I totali si aggiornano da soli.</p><button class="btn primary" data-act="add-client">${I('plus')}Aggiungi cliente</button></div>`}
  </div>`;
  $$('[data-act="add-client"]').forEach(b => b.onclick = () => clientPicker(y, m));
  $('#fab').onclick = () => entryModal({ y, m });
};

Views.clientMonth = ({ y, m, cid }) => {
  const c = Data.client(cid);
  if (!c) { $('#main').innerHTML = `${bar(ymHash(y, m), MONTHS_L[m - 1])}<div class="page"><div class="empty"><div class="h2">Cliente non trovato</div><p>Potrebbe essere stato eliminato.</p></div></div>`; return; }
  const es = Data.sortByDate(Data.inMonth(y, m).filter(e => e.clientId === cid)); const s = sum(es);
  $('#main').innerHTML = `${bar(ymHash(y, m), `${MONTHS_L[m - 1]} ${y}`)}<div class="page">
    <div class="head">
      <div class="eyebrow">${MONTHS_L[m - 1]} ${y}</div>
      <div class="head-row"><h1 class="h1">${esc(c.name)}</h1><a class="btn sm ghost" href="#cliente-${c.id}">Storico ${I('ext')}</a></div>
    </div>
    ${statGrid(s, [['Registrazioni', String(s.count), 'sm']])}
    ${(() => { const st = Data.monthStatus(D.ym(y, m), cid); return `<div class="status">
      <label class="chk big st-sent"><input type="checkbox" data-st="sent" ${st.sent ? 'checked' : ''}><span class="box"></span><span><b>Fattura inviata</b><small>${st.sent && st.sentAt ? 'Segnata il ' + D.fmt(st.sentAt) : 'Non ancora inviata'}</small></span></label>
      <label class="chk big st-paid"><input type="checkbox" data-st="paid" ${st.paid ? 'checked' : ''}><span class="box"></span><span><b>Pagata</b><small>${st.paid && st.paidAt ? 'Segnata il ' + D.fmt(st.paidAt) : 'Non ancora pagata'}</small></span></label>
    </div>`; })()}
    <div class="sec-h"><span class="sec-t">Entrate</span><button class="btn sm primary" data-act="add-entry">${I('plus')}Aggiungi entrata</button></div>
    ${es.length ? `<div class="elist">${es.map(e => entryRow(e)).join('')}
      <div class="ctotal"><span>Totale cliente</span><b>${Money.fmt(s.tot)}</b></div></div>`
    : `<div class="empty"><div class="h2">Ancora nessuna entrata</div><p>Registra il primo compenso di ${esc(c.name)} per ${MONTHS_L[m - 1].toLowerCase()}.</p><button class="btn primary" data-act="add-entry">${I('plus')}Aggiungi entrata</button>
      <div><button class="btn ghost sm mt" data-act="unlink">Togli il cliente da questo mese</button></div></div>`}
  </div>`;
  const add = () => entryModal({ y, m, clientId: cid });
  $$('[data-act="add-entry"]').forEach(b => b.onclick = add); $('#fab').onclick = add;
  const ul = $('[data-act="unlink"]'); if (ul) ul.onclick = async () => { await Data.unlinkClient(D.ym(y, m), cid); Router.go(ymHash(y, m)); };
  $$('[data-st]').forEach(cb => cb.onchange = async () => {
    await Data.setMonthStatus(D.ym(y, m), cid, cb.dataset.st, cb.checked);
    toast(`${cb.dataset.st === 'paid' ? 'Pagata' : 'Fattura inviata'}: ${cb.checked ? 'sì' : 'no'}`, 'ok');
  });
  bindEntryRows();
};

function entryRow(e, showClient = false) {
  const q = Money.quota(e.amountCents, e.scorporo);
  const c = showClient ? Data.client(e.clientId) : null;
  return `<div class="erow" data-eid="${e.id}">
    <button class="e-main" data-edit aria-label="Modifica entrata">
      <span class="e-date"><b>${D.long(e.date)}</b><small>${D.fmt(e.date)}${c ? ' · ' + esc(c.name) : ''}</small>${e.note ? `<span class="e-note">${esc(e.note)}</span>` : ''}</span>
      <span class="e-amt">${Money.fmt(e.amountCents)}<small>${e.scorporo ? `30% ${Money.fmt(q)} · netto ${Money.fmt(e.amountCents - q)}` : 'nessuno scorporo'}</small></span>
    </button>
    <label class="chk tgl" title="Scorpora 30%"><input type="checkbox" data-scorporo ${e.scorporo ? 'checked' : ''}><span class="box"></span><span class="t">30%</span></label>
    <button class="btn ghost icon sm" data-del aria-label="Elimina entrata">${I('trash')}</button>
  </div>`;
}
function bindEntryRows() {
  $$('.erow').forEach(row => {
    const e = () => Store.get('entries', row.dataset.eid);
    row.querySelector('[data-edit]').onclick = () => { const x = e(); x && entryModal({ entry: x }); };
    row.querySelector('[data-scorporo]').onchange = async (ev) => { const x = e(); if (!x) return; await Data.saveEntry(Object.assign({}, x, { scorporo: ev.target.checked })); toast(ev.target.checked ? 'Scorporo 30% attivato' : 'Scorporo 30% disattivato', 'ok'); };
    row.querySelector('[data-del]').onclick = () => { const x = e(); x && deleteEntry(x); };
  });
}
async function deleteEntry(e) {
  if (!await confirmDlg(`Elimini l’entrata del ${D.fmt(e.date)} da ${Money.fmt(e.amountCents)}? Anche la sua quota del 30% verrà tolta dai totali.`, { title: 'Elimina entrata' })) return false;
  await Data.deleteEntry(e.id); toast('Entrata eliminata', 'ok'); return true;
}

Views.clients = () => {
  const list = Data.clients(); const q = ui.q.trim().toLowerCase();
  const rows = list.filter(c => !q || c.name.toLowerCase().includes(q) || (c.info || '').toLowerCase().includes(q))
    .map(c => ({ c, s: sum(Data.entries(e => e.clientId === c.id)) }));
  $('#main').innerHTML = `${bar('', 'Home')}<div class="page">
    <div class="head"><div class="eyebrow">Database</div>
      <div class="head-row"><h1 class="h1">Clienti <em>${list.length}</em></h1><button class="btn sm primary" data-act="new">${I('plus')}Nuovo cliente</button></div></div>
    ${list.length ? `<div class="search">${I('search')}<input class="inp bare" id="q" placeholder="Cerca cliente" value="${esc(ui.q)}" autocomplete="off"></div>
    <div class="clist">${rows.map(({ c, s }) => `<a class="ccard" href="#cliente-${c.id}">
      <div class="ini">${esc(c.name.trim().slice(0, 1).toUpperCase())}</div>
      <div class="cc-main"><div class="cc-name">${esc(c.name)}</div><div class="cc-sub">${plural(s.count, 'registrazione', 'registrazioni')}${s.quota ? ` · 30% ${Money.fmt(s.quota)}` : ''}${c.info ? ' · ' + esc(c.info) : ''}</div></div>
      <div class="cc-tot">${Money.fmt(s.tot)}</div><span class="chev">${I('right')}</span></a>`).join('') || `<div class="empty sm">Nessun cliente corrisponde a “${esc(ui.q)}”.</div>`}</div>`
    : `<div class="empty"><div class="h2">Nessun cliente</div><p>Crea il primo cliente: sarà disponibile in tutti i mesi e in tutti gli anni.</p><button class="btn primary" data-act="new">${I('plus')}Nuovo cliente</button></div>`}
  </div>`;
  $$('[data-act="new"]').forEach(b => b.onclick = () => clientForm(null, (c) => Router.go('cliente-' + c.id)));
  const qi = $('#q'); if (qi) qi.oninput = () => { ui.q = qi.value; const pos = qi.selectionStart; Views.clients(); const n = $('#q'); n.focus(); n.setSelectionRange(pos, pos); };
};

Views.client = ({ cid }) => {
  const c = Data.client(cid);
  if (!c) { $('#main').innerHTML = `${bar('clienti', 'Clienti')}<div class="page"><div class="empty"><div class="h2">Cliente non trovato</div><p>Potrebbe essere stato eliminato.</p></div></div>`; return; }
  const es = Data.sortByDate(Data.entries(e => e.clientId === cid)).reverse(); const s = sum(es);
  const groups = new Map(); es.forEach(e => { const k = e.date.slice(0, 7); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); });
  $('#main').innerHTML = `${bar('clienti', 'Clienti')}<div class="page">
    <div class="head"><div class="eyebrow">Cliente · dal ${D.fmt(new Date(c.createdAt || now()).toISOString().slice(0, 10))}</div>
      <div class="head-row"><h1 class="h1">${esc(c.name)}</h1>
        <div class="btn-row"><button class="btn sm" data-act="edit">${I('edit')}Modifica</button><button class="btn sm danger icon" data-act="del" aria-label="Elimina cliente">${I('trash')}</button></div></div>
      ${c.info ? `<p class="info">${esc(c.info)}</p>` : ''}</div>
    ${statGrid(s, [['Registrazioni', String(s.count), 'sm']])}
    <div class="sec-h"><span class="sec-t">Storico entrate</span><button class="btn sm primary" data-act="add-entry">${I('plus')}Aggiungi entrata</button></div>
    ${es.length ? Array.from(groups.entries()).map(([k, list]) => {
      const [yy, mm] = k.split('-').map(Number); const gs = sum(list);
      return `<div class="hgroup"><a class="hg-h" href="#${ymHash(yy, mm)}-c-${c.id}"><span>${MONTHS_L[mm - 1]} ${yy}</span>${statusPill(k, c.id, list.length)}<b>${Money.fmt(gs.tot)}</b>${I('right')}</a>
        <div class="elist">${Data.sortByDate(list).map(e => entryRow(e)).join('')}</div></div>`;
    }).join('') : `<div class="empty sm">Nessuna entrata registrata per questo cliente.</div>`}
  </div>`;
  $('[data-act="edit"]').onclick = () => clientForm(c);
  $('[data-act="del"]').onclick = async () => {
    const n = es.length;
    const ok = await confirmDlg(`Elimini <b>${esc(c.name)}</b> dal database? ${n ? `Verranno eliminate anche le sue <b>${plural(n, 'registrazione', 'registrazioni')}</b> (${Money.fmt(s.tot)}) da tutti i mesi e gli anni.` : 'Non ha registrazioni.'} L’operazione non si può annullare.`, { title: 'Elimina cliente', ok: 'Elimina cliente' });
    if (!ok) return; await Data.deleteClient(c.id); toast('Cliente eliminato', 'ok'); Router.go('clienti');
  };
  $('[data-act="add-entry"]').onclick = () => entryModal({ clientId: cid });
  bindEntryRows();
};

/* ---------------- moduli ---------------- */
function clientForm(c, onSaved) {
  const m = Modal.open({
    title: c ? 'Modifica cliente' : 'Nuovo cliente', size: 'sm',
    body: `<div class="field"><label class="lbl">Nome cliente</label><input class="inp" id="cf-name" autofocus value="${esc(c ? c.name : '')}" placeholder="es. Studio dalla Nave" autocomplete="off"></div>
      <div class="field"><label class="lbl">Informazioni <span class="dim">facoltative</span></label><textarea class="ta" id="cf-info" rows="3" placeholder="Referente, P.IVA, note…">${esc(c ? c.info || '' : '')}</textarea></div>`,
    foot: `<button class="btn ghost" data-x>Annulla</button><button class="btn primary" data-ok>${c ? 'Salva' : 'Crea cliente'}</button>`,
  });
  const save = async () => {
    const name = $('#cf-name', m.el).value.trim(); const info = $('#cf-info', m.el).value;
    if (!name) { $('#cf-name', m.el).classList.add('bad'); return toast('Inserisci il nome del cliente', 'err'); }
    if (Data.nameTaken(name, c && c.id)) return toast('Esiste già un cliente con questo nome', 'err');
    const saved = c ? await Data.updateClient(c.id, { name, info: info.trim() }) : await Data.createClient(name, info);
    m.close(); toast(c ? 'Cliente aggiornato' : 'Cliente creato', 'ok'); onSaved && onSaved(saved);
  };
  $('[data-ok]', m.el).onclick = save;
  $('#cf-name', m.el).onkeydown = (e) => { if (e.key === 'Enter') save(); };
}

function clientPicker(y, m) {
  const ym = D.ym(y, m); const inMonth = new Set(Data.monthClients(y, m).map(c => c.id));
  const md = Modal.open({
    title: `Aggiungi cliente a ${MONTHS_L[m - 1]}`, size: 'sm',
    body: `<div class="search in-modal">${I('search')}<input class="inp bare" id="cp-q" autofocus placeholder="Cerca o crea un cliente" autocomplete="off"></div><div class="pick" id="cp-list"></div>`,
  });
  const draw = () => {
    const q = $('#cp-q', md.el).value.trim(); const ql = q.toLowerCase();
    const list = Data.clients().filter(c => !ql || c.name.toLowerCase().includes(ql));
    const exact = list.some(c => c.name.toLowerCase() === ql);
    $('#cp-list', md.el).innerHTML = (q && !exact ? `<button class="pk new" data-new>${I('plus')}<span>Crea “<b>${esc(q)}</b>”</span></button>` : '') +
      list.map(c => `<button class="pk ${inMonth.has(c.id) ? 'in' : ''}" data-id="${c.id}"><span class="ini">${esc(c.name.slice(0, 1).toUpperCase())}</span><span class="pk-n">${esc(c.name)}</span>${inMonth.has(c.id) ? `<span class="pk-s">già nel mese</span>` : ''}</button>`).join('') +
      (!list.length && !q ? `<div class="pk-empty">Il database è vuoto. Scrivi il nome per creare il primo cliente.</div>` : '');
    $$('[data-id]', md.el).forEach(b => b.onclick = async () => { await Data.linkClient(ym, b.dataset.id); md.close(); Router.go(`${ymHash(y, m)}-c-${b.dataset.id}`); });
    const nb = $('[data-new]', md.el); if (nb) nb.onclick = async () => { const c = await Data.createClient(q); await Data.linkClient(ym, c.id); md.close(); toast('Cliente creato e aggiunto al mese', 'ok'); Router.go(`${ymHash(y, m)}-c-${c.id}`); };
  };
  $('#cp-q', md.el).oninput = draw;
  $('#cp-q', md.el).onkeydown = (e) => { if (e.key === 'Enter') { const f = $('#cp-list .pk', md.el); f && f.click(); } };
  draw();
}

/* entrata: nuova (opz. cliente/mese preimpostati) o modifica */
function entryModal({ entry = null, clientId = null, y = null, m = null }) {
  const editing = !!entry;
  const cid0 = entry ? entry.clientId : clientId;
  const date = entry ? entry.date : todayISO(); // nuova entrata: sempre la data di oggi
  const clients = Data.clients(); const fixed = !!cid0;
  const md = Modal.open({
    title: editing ? 'Modifica entrata' : 'Nuova entrata', size: 'sm',
    body: `${fixed ? `<div class="for">${I('users')}<span>${esc(Data.client(cid0)?.name || '')}</span></div>` : `
      <div class="field"><label class="lbl">Cliente</label>
        <select class="sel" id="ef-client">${clients.length ? '<option value="">Scegli un cliente…</option>' : ''}${clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}<option value="__new">+ Nuovo cliente…</option></select>
        <input class="inp mt-s" id="ef-newname" placeholder="Nome del nuovo cliente" autocomplete="off" hidden></div>`}
      <div class="field two">
        <div><label class="lbl">Data</label><input class="inp" type="date" id="ef-date" value="${date}" required></div>
        <div><label class="lbl">Compenso</label><div class="eur"><span>€</span><input class="inp" id="ef-amt" inputmode="decimal" placeholder="0,00" value="${entry ? Money.plain(entry.amountCents) : ''}" autocomplete="off" ${fixed ? 'autofocus' : ''}></div></div>
      </div>
      <div class="field"><label class="lbl">Lavoro <span class="dim">commento facoltativo</span></label><input class="inp" id="ef-note" maxlength="160" placeholder="es. Reel torneo biliardino, 2 video verticali" value="${esc(entry ? entry.note || '' : '')}" autocomplete="off"></div>
      <label class="chk big"><input type="checkbox" id="ef-sc" ${entry && entry.scorporo ? 'checked' : ''}><span class="box"></span><span><b>Scorpora 30%</b><small>Accantona il 30% di questa entrata</small></span></label>
      <div class="preview" id="ef-prev"></div>`,
    foot: `${editing ? `<button class="btn ghost danger l" data-del>${I('trash')}Elimina</button>` : ''}<button class="btn ghost" data-x>Annulla</button><button class="btn primary" data-ok>${editing ? 'Salva modifiche' : 'Salva entrata'}</button>`,
  });
  const el = md.el; const amt = $('#ef-amt', el); const sc = $('#ef-sc', el); const sel = $('#ef-client', el);
  if (sel) { if (clients.length === 1) sel.value = clients[0].id; else if (!clients.length) { sel.value = '__new'; $('#ef-newname', el).hidden = false; }
    sel.onchange = () => { const n = $('#ef-newname', el); n.hidden = sel.value !== '__new'; if (!n.hidden) n.focus(); }; }
  const prev = () => {
    const c = Money.parse(amt.value); const box = $('#ef-prev', el);
    if (c === null) { box.innerHTML = amt.value.trim() ? `<span class="warn">Importo non valido</span>` : `<span class="dim">Inserisci il compenso</span>`; return; }
    const q = Money.quota(c, sc.checked);
    box.innerHTML = `<div><span>Entrata</span><b>${Money.fmt(c)}</b></div><div class="${sc.checked ? 'acc' : ''}"><span>Quota 30%</span><b>${Money.fmt(q)}</b></div><div><span>Netto</span><b>${Money.fmt(c - q)}</b></div>`;
  };
  amt.oninput = prev; sc.onchange = prev; prev();
  const save = async () => {
    let cid = cid0;
    if (!fixed) {
      if (sel.value === '__new') {
        const name = $('#ef-newname', el).value.trim(); if (!name) return toast('Scrivi il nome del nuovo cliente', 'err');
        const ex = Data.clients().find(c => c.name.toLowerCase() === name.toLowerCase());
        cid = ex ? ex.id : (await Data.createClient(name)).id;
      } else cid = sel.value;
      if (!cid) return toast('Scegli un cliente', 'err');
    }
    const d = $('#ef-date', el).value; if (!D.valid(d)) return toast('Scegli una data valida', 'err');
    const cents = Money.parse(amt.value); if (cents === null || cents <= 0) { amt.focus(); return toast('Inserisci un compenso valido', 'err'); }
    $('[data-ok]', el).disabled = true;
    await Data.saveEntry({ id: entry && entry.id, clientId: cid, date: d, amountCents: cents, scorporo: sc.checked, note: $('#ef-note', el).value });
    md.close();
    const { y: ny, m: nm } = D.parts(d); const r = Router.current;
    const elsewhere = (r.view === 'clientMonth' || r.view === 'month') && (r.y !== ny || r.m !== nm);
    if (elsewhere) toast(`${editing ? 'Spostata' : 'Registrata'} in ${MONTHS_L[nm - 1]} ${ny}`, 'ok', { label: 'Vai', run: () => Router.go(`${ymHash(ny, nm)}-c-${cid}`) });
    else toast(editing ? 'Entrata aggiornata' : `Entrata registrata · ${MONTHS_L[nm - 1]} ${ny}`, 'ok');
  };
  $('[data-ok]', el).onclick = save;
  amt.onkeydown = (e) => { if (e.key === 'Enter') save(); };
  $('#ef-note', el).onkeydown = (e) => { if (e.key === 'Enter') save(); };
  const db = $('[data-del]', el); if (db) db.onclick = async () => { if (await deleteEntry(entry)) md.close(); };
}

/* ---------------- accesso ---------------- */
function loginView(msg = '') {
  $('#fab').hidden = true;
  let mode = 'in';
  const draw = () => {
    $('#main').innerHTML = `<div class="page login">
      <div class="login-brand">${logoImg()}</div>
      <div class="home-meta">Revenue Tracker</div>
      <form class="login-card" novalidate>
        <div class="h2">${mode === 'in' ? 'Accedi' : 'Crea il tuo account'}</div>
        <p class="muted">${mode === 'in' ? 'Entra per vedere le tue entrate su questo dispositivo.' : 'Usa la tua email e scegli una password di almeno 8 caratteri.'}</p>
        <div class="field"><label class="lbl">Email</label><input class="inp" type="email" id="lg-email" autocomplete="email" autocapitalize="none" inputmode="email" required></div>
        <div class="field"><label class="lbl">Password</label><input class="inp" type="password" id="lg-pass" autocomplete="${mode === 'in' ? 'current-password' : 'new-password'}" minlength="8" required></div>
        <div class="login-msg" id="lg-msg">${esc(msg)}</div>
        <button class="btn primary block" type="submit">${mode === 'in' ? 'Accedi' : 'Crea account'}</button>
        <button class="btn ghost block" type="button" data-sw>${mode === 'in' ? 'Prima volta? Crea un account' : 'Hai già un account? Accedi'}</button>
      </form></div>`;
    $('[data-sw]').onclick = () => { mode = mode === 'in' ? 'up' : 'in'; msg = ''; draw(); };
    $('.login-card').onsubmit = async (ev) => {
      ev.preventDefault();
      const email = $('#lg-email').value.trim(); const pass = $('#lg-pass').value; const out = $('#lg-msg');
      if (!email || pass.length < (mode === 'up' ? 8 : 1)) { out.textContent = mode === 'up' ? 'Inserisci email e una password di almeno 8 caratteri.' : 'Inserisci email e password.'; return; }
      const btn = $('.login-card [type=submit]'); btn.disabled = true; out.textContent = '';
      try {
        if (mode === 'in') { const u = await Auth.signIn(email, pass); await openApp(u); }
        else {
          const r = await Auth.signUp(email, pass);
          if (r.session) await openApp(r.user);
          else { mode = 'in'; msg = 'Account creato. Ti abbiamo mandato un’email: conferma l’indirizzo, poi torna qui e accedi.'; draw(); $('#lg-email').value = email; }
        }
      } catch (e) {
        btn.disabled = false;
        const m = String(e.message || e);
        out.textContent = /Invalid login/i.test(m) ? 'Email o password non corretti.' : /not confirmed/i.test(m) ? 'Devi prima confermare l’email: apri il link che ti abbiamo mandato.' : /already registered/i.test(m) ? 'Esiste già un account con questa email: accedi.' : /fetch|network/i.test(m) ? 'Nessuna connessione. Riprova quando sei online.' : m;
      }
    };
  };
  draw();
}

/* ---------------- rete / sincronizzazione ---------------- */
function netBadge() {
  const el = $('#net'); const n = Store.pendingCount();
  if (!Store.online || n) { el.hidden = false; el.textContent = !Store.online ? (n ? `Offline · ${plural(n, 'modifica', 'modifiche')} da sincronizzare` : 'Offline · dati salvati sul telefono') : 'Sincronizzazione…'; el.className = 'net' + (Store.online ? ' sync' : ''); }
  else el.hidden = true;
  document.body.classList.toggle('has-net', !el.hidden);
}

/* ---------------- export CSV ---------------- */
function exportCSV(year) {
  const es = Data.sortByDate(year ? Data.inYear(year) : Data.entries());
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`; const num = (c) => (c / 100).toFixed(2).replace('.', ',');
  const rows = [['Data', 'Cliente', 'Lavoro', 'Compenso', 'Scorporo 30%', 'Quota 30%', 'Netto', 'Fattura inviata', 'Pagata']];
  es.forEach(e => { const qc = Money.quota(e.amountCents, e.scorporo); const st = Data.monthStatus(e.date.slice(0, 7), e.clientId);
    rows.push([D.fmt(e.date), Data.client(e.clientId)?.name, e.note, num(e.amountCents), e.scorporo ? 'Sì' : 'No', num(qc), num(e.amountCents - qc), st.sent ? 'Sì' : 'No', st.paid ? 'Sì' : 'No']); });
  const csv = '﻿' + rows.map(r => r.map(q).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }); const name = `MoBe-entrate-${year || 'tutte'}.csv`;
  const file = new File([blob], name, { type: 'text/csv' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(() => { }); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ---------------- importa backup (dalla versione dentro Claude) ---------------- */
function importModal() {
  const m = Modal.open({ title: 'Importa backup', size: 'sm',
    body: `<p class="muted" style="margin-bottom:14px">Incolla qui il backup copiato dalla versione di MoBe Revenue Tracker dentro Claude. Clienti, entrate e stati di fattura vengono aggiunti; quelli già presenti vengono aggiornati, niente viene duplicato.</p>
      <textarea class="ta" id="im-txt" rows="6" placeholder="Incolla il backup…"></textarea><div class="login-msg" id="im-msg"></div>`,
    foot: `<button class="btn ghost" data-x>Annulla</button><button class="btn primary" data-ok>Importa</button>` });
  $('[data-ok]', m.el).onclick = async () => {
    const out = $('#im-msg', m.el); let d;
    try { d = JSON.parse($('#im-txt', m.el).value.trim()); } catch (e) { out.textContent = 'Il testo incollato non è un backup valido.'; return; }
    if (!d || !Array.isArray(d.clients) || !Array.isArray(d.entries)) { out.textContent = 'Il backup non contiene clienti ed entrate.'; return; }
    const ok = (o) => o && typeof o.id === 'string' && /^[\w-]+$/.test(o.id);
    const cl = d.clients.filter(c => ok(c) && c.name); const ids = new Set(cl.map(c => c.id).concat(Store.all('clients').map(c => c.id)));
    const en = d.entries.filter(e => ok(e) && ids.has(e.clientId) && D.valid(e.date) && Number.isInteger(e.amountCents) && e.amountCents > 0);
    const li = (d.links || []).filter(l => ok(l) && ids.has(l.clientId) && /^\d{4}-\d{2}$/.test(l.ym));
    $('[data-ok]', m.el).disabled = true;
    for (const c of cl) await Store.put('clients', { id: c.id, name: String(c.name).trim(), info: c.info || '', createdAt: c.createdAt || now() });
    for (const e of en) { const q = Money.quota(e.amountCents, e.scorporo); await Store.put('entries', { id: e.id, clientId: e.clientId, date: e.date, amountCents: e.amountCents, scorporo: !!e.scorporo, quotaCents: q, nettoCents: e.amountCents - q, note: e.note || '', createdAt: e.createdAt || now(), modifiedAt: e.modifiedAt || now() }); }
    for (const l of li) await Store.put('links', { id: l.id, ym: l.ym, clientId: l.clientId, invoiceSent: !!l.invoiceSent, invoiceSentAt: l.invoiceSentAt || null, paid: !!l.paid, paidAt: l.paidAt || null, createdAt: l.createdAt || now() });
    m.close(); toast(`Importati ${cl.length} clienti, ${en.length} entrate e ${li.length} stati`, 'ok');
  };
}

/* ---------------- avvio ---------------- */
let started = false;
async function openApp(user) {
  $('#main').innerHTML = `<div class="boot"><div class="boot-mark">MoBe</div><div class="boot-sub">Caricamento entrate…</div></div>`;
  try { await Store.start(user.id); }
  catch (e) { console.error(e); $('#main').innerHTML = `<div class="page"><div class="empty"><div class="h2">Serve la connessione</div><p>La prima apertura su questo dispositivo deve scaricare i tuoi dati. Collegati a internet e riprova.</p><button class="btn primary" onclick="location.reload()">Riprova</button></div></div>`; return; }
  if (!started) {
    started = true;
    window.addEventListener('hashchange', () => Auth.user && Router.render());
    let t; Store.on(() => { netBadge(); clearTimeout(t); t = setTimeout(() => { const a = document.activeElement; if (a && (a.id === 'q' || a.closest('.modal'))) return; Router.render(true); }, 30); });
  }
  netBadge(); Router.render();
}
async function signOut() {
  if (Store.pendingCount() && !await confirmDlg(`Ci sono ${plural(Store.pendingCount(), 'modifica', 'modifiche')} non ancora sincronizzate: uscendo andranno perse. Esci comunque?`, { ok: 'Esci', title: 'Esci' })) return;
  if (!Store.pendingCount() && !await confirmDlg('Esci dall’account su questo dispositivo?', { ok: 'Esci', title: 'Esci' })) return;
  LS.del(Store.key('cache')); LS.del(Store.key('outbox')); Store.reset(); await Auth.signOut(); location.hash = ''; loginView();
}
(async function boot() {
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') Modal.closeTop(); });
  if (!Auth.init()) { $('#main').innerHTML = `<div class="page"><div class="empty"><div class="h2">Configurazione mancante</div><p>Inserisci URL e chiave di Supabase in config.js.</p></div></div>`; return; }
  const u = await Auth.session();
  if (u) openApp(u); else loginView();
  sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT' && started) { Store.reset(); loginView(); } });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
})();
