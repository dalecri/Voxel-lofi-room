// Persistence. The app reads and writes localStorage synchronously; inside the
// Android app every write is mirrored into a SQLite database (the source of truth),
// which is loaded back into localStorage before the app boots. That way your rooms
// survive Android clearing WebView storage, app updates and force-stops.
// Exposes window.Store: { ready, set(key, value), del(key), flush(), native, app }.
(function () {
  const DB = 'lofi_rooms';
  const PREFIX = 'lr.';
  const localOnly = k => k === 'lr.googleCalendarToken'; // OAuth tokens never enter native SQLite.
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const plugin = name => (cap.registerPlugin ? cap.registerPlugin(name) : cap.Plugins[name]);

  let sqlite = null;
  let flushTimer = null;
  let chain = Promise.resolve();
  const pending = new Map();

  async function open() {
    sqlite = plugin('CapacitorSQLite');
    const conn = { database: DB, encrypted: false, mode: 'no-encryption', version: 1, readonly: false };
    try { await sqlite.createConnection(conn); } catch (e) { /* connection already exists */ }
    await sqlite.open({ database: DB, readonly: false });
    await sqlite.execute({
      database: DB, transaction: false, readonly: false,
      statements: 'CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY NOT NULL, v TEXT NOT NULL, updated INTEGER NOT NULL);',
    });
    const res = await sqlite.query({ database: DB, statement: 'SELECT k, v FROM kv;', values: [], readonly: false });
    const rows = (res.values || []).filter(r => r && typeof r.k === 'string' && !localOnly(r.k));
    if (rows.length) {
      // the database wins: restore it into the WebView's storage
      rows.forEach(r => { try { localStorage.setItem(r.k, r.v); } catch (e) {} });
    } else {
      // first launch with the database: adopt anything the WebView already had
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX) && !localOnly(k)) pending.set(k, localStorage.getItem(k));
      }
      await flush();
    }
  }

  function set(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
    if (!sqlite || localOnly(k)) return;
    pending.set(k, v);
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 250);
  }

  function del(k) {
    try { localStorage.removeItem(k); } catch (e) {}
    if (!sqlite || localOnly(k)) return;
    pending.set(k, null);
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 250);
  }

  // writes are serialized so a slow write can never land after a newer one
  function flush() {
    clearTimeout(flushTimer);
    if (!sqlite || !pending.size) return chain;
    const rows = [...pending];
    pending.clear();
    chain = chain.then(() => sqlite.executeSet({
      database: DB, transaction: true, readonly: false,
      set: rows.map(([k, v]) => (v === null
        ? { statement: 'DELETE FROM kv WHERE k = ?;', values: [k] }
        : { statement: 'INSERT OR REPLACE INTO kv (k, v, updated) VALUES (?, ?, ?);', values: [k, v, Date.now()] })),
    })).catch(err => {
      console.error('SQLite write failed', err);
      rows.forEach(([k, v]) => { if (!pending.has(k)) pending.set(k, v); });   // retry on the next save
    });
    return chain;
  }

  const app = native ? plugin('App') : null;
  if (app) {
    // make sure the last change is on disk before Android may kill a backgrounded app
    app.addListener('pause', () => { flush(); });
  }

  const ready = native
    ? open().catch(err => { console.error('SQLite unavailable, using WebView storage only', err); sqlite = null; })
    : Promise.resolve();

  window.Store = { ready, set, del, flush, native, app };
})();
