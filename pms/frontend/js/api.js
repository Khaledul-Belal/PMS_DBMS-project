/* ============================================================
   Small helper layer used by every page.
   All requests go to ../backend/api/<file>.php?action=<action>
   ============================================================ */

const API_BASE = '../backend/api/';

async function api(file, action, data = null, method = 'POST', params = {}) {
  const query = new URLSearchParams({ action, ...params }).toString();
  const url = `${API_BASE}${file}.php?${query}`;
  const opt = { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } };
  if (data) opt.body = JSON.stringify(data);

  let res, json;
  try {
    res = await fetch(url, opt);
    json = await res.json();
  } catch (e) {
    throw new Error('Could not reach the server. Is Apache and MySQL running?');
  }
  if (!json.ok) throw new Error(json.error || 'Something went wrong.');
  return json;
}

const get = (file, action, params = {}) => api(file, action, null, 'GET', params);

/* ---------- formatting ---------- */
const taka = n => '৳' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const monthName = m => {
  if (!m) return '';
  const [y, mo] = m.split('-');
  return new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tag = (v, label) => `<span class="tag ${esc(v)}">${esc(label || String(v).replace('_', ' '))}</span>`;
const dash = v => (v === null || v === undefined || v === '' ? '<span class="muted">—</span>' : esc(v));

/* ---------- toast / message ---------- */
function flash(text, type = 'success') {
  let el = document.getElementById('flash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'flash';
    el.style.cssText =
      'position:fixed;right:1.2rem;bottom:1.2rem;z-index:99;padding:.7rem 1rem;border-radius:9px;' +
      'box-shadow:0 8px 26px -10px rgba(0,0,0,.4);font-weight:500;max-width:340px';
    document.body.appendChild(el);
  }
  el.style.background = type === 'error' ? '#a8452b' : '#0e6b4e';
  el.style.color = '#fff';
  el.textContent = text;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.style.display = 'none'), 3200);
}

/* ---------- modal ---------- */
function modal(title, html, onSubmit, submitLabel = 'Save') {
  let back = document.getElementById('modalBack');
  if (!back) {
    back = document.createElement('div');
    back.id = 'modalBack';
    back.className = 'modal-backdrop';
    back.innerHTML = '<div class="modal"><h3 id="modalTitle"></h3><div id="modalBody"></div>' +
      '<div class="modal-actions"><button class="btn ghost" id="modalCancel">Cancel</button>' +
      '<button class="btn" id="modalOk">Save</button></div></div>';
    document.body.appendChild(back);
    back.addEventListener('click', e => { if (e.target === back) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  }
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = html;
  const ok = document.getElementById('modalOk');
  ok.textContent = submitLabel;
  ok.onclick = async () => {
    ok.disabled = true;
    try { await onSubmit(); } catch (e) { flash(e.message, 'error'); }
    ok.disabled = false;
  };
  document.getElementById('modalCancel').onclick = closeModal;
  back.classList.add('open');
  const first = back.querySelector('input,select,textarea');
  if (first) first.focus();
}
function closeModal() { const b = document.getElementById('modalBack'); if (b) b.classList.remove('open'); }
const val = id => document.getElementById(id).value.trim();

/* ---------- tiny form builders ---------- */
const field = (id, label, type = 'text', value = '', extra = '') =>
  `<div class="field"><label for="${id}">${label}</label>
   <input id="${id}" type="${type}" value="${esc(value)}" ${extra}></div>`;

const select = (id, label, options, value = '') =>
  `<div class="field"><label for="${id}">${label}</label><select id="${id}">` +
  options.map(o => `<option value="${esc(o.v)}" ${String(o.v) === String(value) ? 'selected' : ''}>${esc(o.t)}</option>`).join('') +
  `</select></div>`;

/* ---------- table ---------- */
function table(columns, rows, renderRow, emptyText = 'Nothing here yet.') {
  if (!rows.length) return `<div class="empty">${esc(emptyText)}</div>`;
  return `<div class="table-wrap"><table><thead><tr>` +
    columns.map(c => `<th class="${c.num ? 'num' : ''}">${esc(c.t)}</th>`).join('') +
    `</tr></thead><tbody>` + rows.map(renderRow).join('') + `</tbody></table></div>`;
}

/* ---------- month list for dropdowns ---------- */
function monthOptions(count = 12) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const v = d.toISOString().slice(0, 7);
    out.push({ v, t: monthName(v) });
  }
  return out;
}
