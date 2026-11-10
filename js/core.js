/* MoBe Revenue Tracker — core: utils, money, data store, calcoli */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(-12);
const now = () => Date.now();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n, l = 2) => String(n).padStart(l, '0');
const MONTHS_L = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const MONTHS_S = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

/* Anni gestiti: base + qualsiasi anno presente nei dati. Per aggiungerne altri basta estendere BASE_YEARS. */
const BASE_YEARS = [2026, 2027, 2028];

/* ---------------- denaro: tutto in centesimi interi ---------------- */
const RATE = 30; // percentuale di accantonamento
const Money = {
  // "1.500,50" · "1500,5" · "1500.50" · "€ 1.500" → centesimi (intero) oppure null
  parse(v) {
    let s = String(v ?? '').replace(/[€\s]/g, '').trim();
    if (!s) return null;
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
    const [i, d = ''] = s.split('.');
    return parseInt(i, 10) * 100 + parseInt((d + '00').slice(0, 2), 10);
  },
  // centesimi → "€ 1.500,00"
  fmt(c, sign = true) {
    c = Math.round(+c || 0); const neg = c < 0; c = Math.abs(c);
    const int = String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${neg ? '−' : ''}${sign ? '€ ' : ''}${int},${pad(c % 100)}`;
  },
  // per i campi di input: "1500,00"
  plain(c) { c = Math.round(+c || 0); return `${Math.floor(c / 100)},${pad(c % 100)}`; },
  quota(cents, on) { return on ? Math.round(cents * RATE / 100) : 0; },
};

/* date */
const D = {
  // "2026-01-10" → "10/01/2026"
  fmt(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; },
  long(iso) { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS_L[m - 1]}`; },
  parts(iso) { const [y, m, d] = iso.split('-').map(Number); return { y, m, d }; },
  valid(iso) { if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return false; const { y, m, d } = D.parts(iso); const x = new Date(y, m - 1, d); return x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d; },
  ym(y, m) { return `${y}-${pad(m)}`; },
};

/* ---------------- Supabase ---------------- */
const COLS = ['clients', 'entries', 'links'];
// mappatura campi app (camelCase) ⇄ colonne database (snake_case)
const MAP = {
  clients: { name: 'name', info: 'info', createdAt: 'created_at', updatedAt: 'updated_at' },
  entries: { clientId: 'client_id', date: 'date', amountCents: 'amount_cents', scorporo: 'scorporo', quotaCents: 'quota_cents', nettoCents: 'netto_cents', note: 'note', createdAt: 'created_at', modifiedAt: 'modified_at', updatedAt: 'updated_at' },
  links: { ym: 'ym', clientId: 'client_id', invoiceSent: 'invoice_sent', invoiceSentAt: 'invoice_sent_at', paid: 'paid', paidAt: 'paid_at', createdAt: 'created_at', updatedAt: 'updated_at' },
};
const BOOL = new Set(['scorporo', 'invoiceSent', 'paid']);
const NUM = new Set(['amountCents', 'quotaCents', 'nettoCents', 'createdAt', 'modifiedAt', 'updatedAt']);
function toRow(col, d) { const r = { id: d.id }; for (const [k, c] of Object.entries(MAP[col])) { let v = d[k]; if (v === undefined) v = BOOL.has(k) ? false : null; r[c] = v; } return r; }
function fromRow(col, r) { const d = { id: r.id }; for (const [k, c] of Object.entries(MAP[col])) { let v = r[c]; if (NUM.has(k) && v != null) v = Number(v); if (BOOL.has(k)) v = !!v; if (v == null && (k === 'info' || k === 'note')) v = ''; d[k] = v; } return d; }

let sb = null; // client Supabase
const Auth = {
  user: null,
  init() {
    const cfg = window.MOBE_CONFIG || {};
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || /^__/.test(cfg.supabaseUrl) || !window.supabase) return false;
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mobe-rev-auth' } });
    return true;
  },
  async session() { try { const { data } = await sb.auth.getSession(); this.user = data.session ? data.session.user : null; } catch (e) { this.user = null; } return this.user; },
  async signIn(email, password) { const { data, error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; this.user = data.user; return data.user; },
  async signUp(email, password) { const { data, error } = await sb.auth.signUp({ email, password }); if (error) throw error; if (data.session) this.user = data.user; return data; },
  async signOut() { try { await sb.auth.signOut(); } catch (e) { } this.user = null; },
};

/* ---------------- store: memoria + cache locale + coda di scrittura (funziona anche offline) ---------------- */
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } },
};
const Store = {
  data: {}, listeners: new Set(), outbox: [], flushing: false, online: true, uid: null, channel: null, loaded: false,
  on(fn) { this.listeners.add(fn); },
  emit(info) { this.listeners.forEach(fn => { try { fn(info); } catch (e) { console.error(e); } }); },
  key(k) { return `mobe-rev-${k}-${this.uid}`; },
  reset() { COLS.forEach(c => this.data[c] = new Map()); this.outbox = []; this.loaded = false; if (this.channel) { try { sb.removeChannel(this.channel); } catch (e) { } this.channel = null; } },
  async start(uid) {
    this.reset(); this.uid = uid;
    // 1) dati dell'ultima apertura: l'app si apre subito, anche senza rete
    const cache = LS.get(this.key('cache'), null);
    if (cache) { COLS.forEach(c => (cache[c] || []).forEach(d => this.data[c].set(d.id, d))); this.loaded = true; }
    this.outbox = LS.get(this.key('outbox'), []);
    // 2) dati aggiornati dal server
    const ok = await this.refresh();
    if (!ok && !cache) throw new Error('offline-first-run');
    this.subscribe();
    this.flush();
  },
  async refresh() {
    try {
      const res = await Promise.all(COLS.map(c => this._all(c)));
      COLS.forEach((c, i) => { this.data[c] = new Map(res[i].map(r => { const d = fromRow(c, r); return [d.id, d]; })); });
      // le modifiche non ancora inviate restano valide sopra ai dati del server
      for (const op of this.outbox) { if (op.op === 'put') this.data[op.col].set(op.id, op.body); else this.data[op.col].delete(op.id); }
      this.loaded = true; this.setOnline(true); this.saveCache(); this.emit({ type: 'refresh' });
      return true;
    } catch (e) { console.warn('refresh', e); this.setOnline(false); return false; }
  },
  async _all(col) {
    const out = []; const page = 1000;
    for (let from = 0; ; from += page) {
      const { data, error } = await sb.from(col).select('*').range(from, from + page - 1);
      if (error) throw error; out.push(...data); if (data.length < page) break;
    }
    return out;
  },
  subscribe() {
    try {
      this.channel = sb.channel('mobe-rev-' + this.uid);
      COLS.forEach(col => this.channel.on('postgres_changes', { event: '*', schema: 'public', table: col }, (p) => {
        const id = (p.new && p.new.id) || (p.old && p.old.id); if (!id) return;
        if (this.outbox.some(o => o.col === col && o.id === id)) return; // modifica nostra ancora in coda
        if (p.eventType === 'DELETE') { if (!this.data[col].delete(id)) return; }
        else { const d = fromRow(col, p.new); const cur = this.data[col].get(id); if (cur && (cur.updatedAt || 0) > (d.updatedAt || 0)) return; this.data[col].set(id, d); }
        this.saveCache(); this.emit({ type: 'remote', col });
      }));
      this.channel.subscribe();
    } catch (e) { console.warn('realtime', e); }
  },
  saveCache() { const o = {}; COLS.forEach(c => o[c] = Array.from(this.data[c].values())); LS.set(this.key('cache'), o); },
  setOnline(v) { if (this.online !== v) { this.online = v; this.emit({ type: 'net' }); } },
  all(col, f) { const a = Array.from(this.data[col].values()); return f ? a.filter(f) : a; },
  get(col, id) { return this.data[col].get(id) || null; },
  async put(col, doc) {
    const id = doc.id || uid(); const body = Object.assign({}, doc, { id, updatedAt: now() });
    this.data[col].set(id, body); this.enqueue({ op: 'put', col, id, body }); this.emit({ type: 'local', col, id });
    return body;
  },
  async del(col, id) {
    this.data[col].delete(id); this.enqueue({ op: 'del', col, id }); this.emit({ type: 'local', col, id });
  },
  enqueue(op) {
    // una sola operazione in coda per documento: l'ultima vince (finché non è in invio)
    const i = this.outbox.findIndex((o, k) => o.col === op.col && o.id === op.id && !(this.flushing && k === 0));
    if (i >= 0) this.outbox.splice(i, 1);
    this.outbox.push(op); LS.set(this.key('outbox'), this.outbox); this.saveCache(); this.flush();
  },
  async flush() {
    if (this.flushing || !this.outbox.length) return;
    this.flushing = true;
    try {
      while (this.outbox.length) {
        const op = this.outbox[0];
        try {
          const q = op.op === 'put' ? sb.from(op.col).upsert(toRow(op.col, op.body)) : sb.from(op.col).delete().eq('id', op.id);
          const { error } = await q;
          if (error) {
            if (/fetch|network|Failed|timeout/i.test(error.message || '') || !navigator.onLine) throw error;
            console.error('scrittura rifiutata', op, error); toast('Una modifica non è stata salvata: ' + (error.message || 'errore'), 'err');
          }
          this.outbox.shift(); LS.set(this.key('outbox'), this.outbox); this.setOnline(true);
        } catch (e) { this.setOnline(false); clearTimeout(this._retry); this._retry = setTimeout(() => this.flush(), 8000); break; }
      }
    } finally { this.flushing = false; this.emit({ type: 'net' }); }
  },
  pendingCount() { return this.outbox.length; },
};
window.addEventListener('online', () => { Store.flush(); Store.refresh(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Store.uid) { Store.flush(); Store.refresh(); } });

/* ---------------- dominio ---------------- */
const Data = {
  clients() { return Store.all('clients').sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })); },
  client(id) { return Store.get('clients', id); },
  nameTaken(name, exceptId) { const n = name.trim().toLowerCase(); return Store.all('clients').some(c => c.id !== exceptId && c.name.trim().toLowerCase() === n); },
  async createClient(name, info = '') {
    const t = now();
    return Store.put('clients', { name: name.trim(), info: info.trim(), createdAt: t });
  },
  async updateClient(id, patch) { const c = this.client(id); if (!c) return; return Store.put('clients', Object.assign({}, c, patch)); },
  async deleteClient(id) {
    const es = Store.all('entries', e => e.clientId === id); const ls = Store.all('links', l => l.clientId === id);
    for (const e of es) await Store.del('entries', e.id);
    for (const l of ls) await Store.del('links', l.id);
    await Store.del('clients', id);
  },
  // registrazione: mese e anno sono SEMPRE ricavati dalla data
  async saveEntry({ id, clientId, date, amountCents, scorporo, note = '' }) {
    const prev = id ? Store.get('entries', id) : null; const t = now();
    const quotaCents = Money.quota(amountCents, scorporo);
    return Store.put('entries', {
      id: id || undefined, clientId, date, amountCents, scorporo: !!scorporo, note: String(note || '').trim(),
      quotaCents, nettoCents: amountCents - quotaCents,
      createdAt: prev ? prev.createdAt : t, modifiedAt: t,
    });
  },
  async deleteEntry(id) { return Store.del('entries', id); },
  async linkClient(ym, clientId) {
    const id = ym + '_' + clientId; if (Store.get('links', id)) return;
    return Store.put('links', { id, ym, clientId, createdAt: now() });
  },
  // stato del cliente nel mese: fattura inviata / pagata (salvato sul legame mese-cliente)
  monthStatus(ym, clientId) { const l = Store.get('links', ym + '_' + clientId); return { sent: !!(l && l.invoiceSent), paid: !!(l && l.paid), sentAt: l && l.invoiceSentAt, paidAt: l && l.paidAt }; },
  async setMonthStatus(ym, clientId, key, on) {
    const id = ym + '_' + clientId; const l = Store.get('links', id) || { id, ym, clientId, createdAt: now() };
    const f = key === 'paid' ? ['paid', 'paidAt'] : ['invoiceSent', 'invoiceSentAt'];
    return Store.put('links', Object.assign({}, l, { [f[0]]: !!on, [f[1]]: on ? todayISO() : null }));
  },
  async unlinkClient(ym, clientId) { const id = ym + '_' + clientId; if (Store.get('links', id)) await Store.del('links', id); },

  entries(f) { return Store.all('entries', e => Store.get('clients', e.clientId) && (!f || f(e))); },
  inYear(y) { const p = y + '-'; return this.entries(e => e.date.startsWith(p)); },
  inMonth(y, m) { const p = D.ym(y, m) + '-'; return this.entries(e => e.date.startsWith(p)); },
  sortByDate(a) { return a.sort((x, y) => x.date.localeCompare(y.date) || (x.createdAt || 0) - (y.createdAt || 0)); },
  years() {
    const s = new Set(BASE_YEARS); s.add(new Date().getFullYear());
    this.entries().forEach(e => s.add(+e.date.slice(0, 4)));
    return Array.from(s).sort((a, b) => a - b);
  },
  // clienti visibili in un mese: aggiunti al mese + con almeno una registrazione
  monthClients(y, m) {
    const ym = D.ym(y, m); const ids = new Set();
    Store.all('links', l => l.ym === ym).forEach(l => ids.add(l.clientId));
    this.inMonth(y, m).forEach(e => ids.add(e.clientId));
    return Array.from(ids).map(id => this.client(id)).filter(Boolean);
  },
};

/* riepilogo calcolato SEMPRE dalle registrazioni: quota ricalcolata da importo + checkbox */
function sum(entries) {
  let tot = 0, quota = 0; const clients = new Set();
  for (const e of entries) { const a = Math.round(+e.amountCents || 0); tot += a; quota += Money.quota(a, e.scorporo); clients.add(e.clientId); }
  return { tot, quota, netto: tot - quota, count: entries.length, clients: clients.size };
}
