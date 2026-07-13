// Custom-level persistence (localStorage) and URL sharing (#lvl=base64url).
import { COLS, ROWS } from './levels.js';
import { LEGAL_CHARS } from './validate.js';

const STORE_KEY = 'lodeRunner.customLevels';

export function customLevels() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
  catch { return []; }
}

export function storeCustomLevels(list) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function encodeShare(def) {
  const json = JSON.stringify({ name: def.name, rows: def.rows });
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeShare(s) {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const def = JSON.parse(decodeURIComponent(escape(atob(b))));
  if (!Array.isArray(def.rows) || def.rows.length !== ROWS ||
      def.rows.some(r => typeof r !== 'string' || r.length !== COLS ||
        [...r].some(c => !LEGAL_CHARS.has(c)))) {
    throw new Error('bad level');
  }
  def.name = String(def.name || 'SHARED LEVEL').toUpperCase().slice(0, 18);
  return def;
}
