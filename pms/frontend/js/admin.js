/* ============================================================
   Admin dashboard — the whole platform from above
   ============================================================ */

let ME = null;
const main = document.getElementById('main');

(async function start() {
  try {
    const r = await get('auth', 'me');
    ME = r.user;
    if (ME.role !== 'admin') { location.href = 'app.html'; return; }
  } catch (e) { location.href = 'login.html'; return; }

  document.getElementById('whoName').textContent = ME.name;
  document.getElementById('whoEmail').textContent = ME.email;

  document.querySelectorAll('#nav button').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('#nav button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      show(b.dataset.view);
    };
  });
  document.getElementById('logout').onclick = async () => {
    await api('auth', 'logout', {});
    location.href = 'login.html';
  };
  show('overview');
})();

const views = {};
async function show(view, arg) {
  main.innerHTML = '<div class="empty">Loading…</div>';
  try { await views[view](arg); }
  catch (e) { main.innerHTML = `<div class="card"><h2>Could not load</h2><p class="muted">${esc(e.message)}</p></div>`; }
}
const header = (title, sub, right = '') =>
  `<div class="topbar"><div><h1>${esc(title)}</h1><div class="muted">${sub}</div></div>
   <div class="toolbar">${right}</div></div>`;

/* ---------------- overview ---------------- */
views.overview = async function () {
  const r = await get('admin', 'stats');
  const s = r.stats;
  const maxRev = Math.max(1, ...r.revenue_by_plan.map(p => +p.revenue));

  main.innerHTML =
    header('Platform overview', 'Everything running on Baribari right now') +
    `<div class="stats">
      <div class="stat"><div class="label">Property owners</div><div class="value num">${s.owners}</div>
        <div class="muted num">${s.active_owners} active</div></div>
      <div class="stat"><div class="label">Active subscriptions</div><div class="value num">${s.active_subs}</div></div>
      <div class="stat"><div class="label">Subscription revenue</div><div class="value num pos">${taka(s.revenue)}</div></div>
      <div class="stat"><div class="label">Managers</div><div class="value num">${s.managers}</div></div>
      <div class="stat"><div class="label">Buildings</div><div class="value num">${s.properties}</div></div>
      <div class="stat"><div class="label">Units</div><div class="value num">${s.units}</div></div>
      <div class="stat"><div class="label">Tenants</div><div class="value num">${s.tenants}</div></div>
    </div>

    <div class="card">
      <h2 style="margin-bottom:.9rem">Revenue by plan</h2>
      ${r.revenue_by_plan.map(p => `
        <div style="margin-bottom:.7rem">
          <div style="display:flex;justify-content:space-between;font-size:.9rem">
            <span><strong>${esc(p.plan_name)}</strong> <span class="muted">· ${p.subscribers} subscriber(s)</span></span>
            <span class="num">${taka(p.revenue)}</span>
          </div>
          <div style="height:8px;background:#e6e9e3;border-radius:4px;margin-top:.25rem">
            <div style="height:100%;width:${(p.revenue / maxRev * 100).toFixed(1)}%;background:#b57f12;border-radius:4px"></div>
          </div>
        </div>`).join('')}
    </div>

    <div class="card">
      <h2 style="margin-bottom:.9rem">Newest sign-ups</h2>
      ${table([{ t: 'Name' }, { t: 'Email' }, { t: 'Joined' }, { t: 'Status' }], r.recent_owners,
        o => `<tr><td><strong>${esc(o.full_name)}</strong></td><td>${esc(o.email)}</td>
              <td>${esc((o.created_at || '').slice(0, 10))}</td><td>${tag(o.status)}</td></tr>`,
        'No owners have signed up yet.')}
    </div>`;
};

/* ---------------- subscribers ---------------- */
views.owners = async function () {
  const r = await get('admin', 'owners');
  main.innerHTML =
    header('Subscribers', 'Every property owner using the system') +
    `<div class="card">${table(
      [{ t: 'Owner' }, { t: 'Contact' }, { t: 'Plan' }, { t: 'Valid till' }, { t: 'Buildings', num: 1 },
       { t: 'Managers', num: 1 }, { t: 'Tenants', num: 1 }, { t: 'Status' }, { t: '' }],
      r.owners,
      o => `<tr>
        <td><strong>${esc(o.full_name)}</strong><br><span class="muted">joined ${esc((o.created_at || '').slice(0, 10))}</span></td>
        <td>${esc(o.email)}<br><span class="muted">${dash(o.phone)}</span></td>
        <td>${o.plan_name ? esc(o.plan_name) : '<span class="muted">none</span>'}</td>
        <td>${dash(o.end_date)}</td>
        <td class="num">${o.properties}</td>
        <td class="num">${o.managers}</td>
        <td class="num">${o.tenants}</td>
        <td>${tag(o.status)}</td>
        <td class="right">
          <button class="btn ghost small" onclick="detail(${o.owner_id})">View</button>
          <button class="btn ghost small" onclick="toggleOwner(${o.owner_id})">${o.status === 'active' ? 'Block' : 'Unblock'}</button>
          <button class="btn danger small" onclick="delOwner(${o.owner_id}, '${esc(o.full_name)}')">Delete</button>
        </td></tr>`,
      'Nobody has signed up yet.')}</div>`;
};

async function detail(id) {
  const r = await get('admin', 'owner_detail', { owner_id: id });
  modal('Account: ' + r.owner.full_name,
    `<p class="muted">${esc(r.owner.email)} · ${dash(r.owner.phone)}<br>${dash(r.owner.address)}</p>
     <h3 style="margin:1rem 0 .5rem">Buildings</h3>
     ${table([{ t: 'Name' }, { t: 'Address' }, { t: 'Floors', num: 1 }], r.properties,
       p => `<tr><td>${esc(p.name)}</td><td class="muted">${dash(p.address)}</td>
             <td class="num">${p.total_floors}</td></tr>`, 'No buildings.')}
     <h3 style="margin:1rem 0 .5rem">Subscription history</h3>
     ${table([{ t: 'Plan' }, { t: 'From' }, { t: 'To' }, { t: 'Paid', num: 1 }, { t: 'Status' }], r.subscriptions,
       s => `<tr><td>${esc(s.plan_name)}</td><td>${esc(s.start_date)}</td><td>${esc(s.end_date)}</td>
             <td class="num">${taka(s.amount_paid)}</td><td>${tag(s.status)}</td></tr>`, 'No subscriptions.')}`,
    async () => closeModal(), 'Close');
}

async function toggleOwner(id) {
  const r = await api('admin', 'owner_toggle', { owner_id: id });
  flash('Account is now ' + r.status + '.');
  show('owners');
}

async function delOwner(id, name) {
  if (!confirm(`Delete ${name}? Every building, tenant, lease, bill and manager under this account is removed too. This cannot be undone.`)) return;
  await api('admin', 'owner_delete', { owner_id: id });
  flash('Account and all of its data deleted.');
  show('owners');
}

/* ---------------- subscriptions ---------------- */
views.subs = async function () {
  const r = await get('admin', 'subscriptions');
  main.innerHTML =
    header('Subscriptions', 'Payment history across every account') +
    `<div class="card">${table(
      [{ t: 'Owner' }, { t: 'Plan' }, { t: 'From' }, { t: 'To' }, { t: 'Method' },
       { t: 'Transaction' }, { t: 'Amount', num: 1 }, { t: 'Status' }],
      r.subscriptions,
      s => `<tr>
        <td><strong>${esc(s.owner_name)}</strong><br><span class="muted">${esc(s.email)}</span></td>
        <td>${esc(s.plan_name)}</td>
        <td>${esc(s.start_date)}</td>
        <td>${esc(s.end_date)}</td>
        <td>${esc(s.payment_method)}</td>
        <td class="muted">${dash(s.trx_id)}</td>
        <td class="num">${taka(s.amount_paid)}</td>
        <td>${tag(s.status)}</td></tr>`,
      'No subscriptions yet.')}</div>`;
};

/* ---------------- plans ---------------- */
views.plans = async function () {
  const r = await get('admin', 'plans');
  main.innerHTML =
    header('Plans & pricing', 'What owners can buy', '<button class="btn" id="addPlan">New plan</button>') +
    `<div class="card">${table(
      [{ t: 'Plan' }, { t: 'Price', num: 1 }, { t: 'Days', num: 1 }, { t: 'Max buildings', num: 1 },
       { t: 'What they get' }, { t: 'Subscribers', num: 1 }, { t: '' }],
      r.plans,
      p => `<tr>
        <td><strong>${esc(p.plan_name)}</strong></td>
        <td class="num">${taka(p.price)}</td>
        <td class="num">${p.duration_days}</td>
        <td class="num">${p.max_properties}</td>
        <td class="muted">${dash(p.features)}</td>
        <td class="num">${p.subscribers}</td>
        <td class="right"><button class="btn ghost small" onclick="planForm(${p.plan_id})">Edit</button></td>
      </tr>`, 'No plans defined.')}</div>`;

  window.__plans = r.plans;
  document.getElementById('addPlan').onclick = () => planForm();
};

function planForm(id) {
  const p = id ? window.__plans.find(x => +x.plan_id === +id) : {};
  modal(id ? 'Edit plan' : 'New plan',
    field('pl_name', 'Plan name', 'text', p.plan_name || '') +
    `<div class="grid-3">${field('pl_price', 'Price (৳)', 'number', p.price || 0)}
     ${field('pl_days', 'Duration (days)', 'number', p.duration_days || 30)}
     ${field('pl_max', 'Max buildings', 'number', p.max_properties || 3)}</div>` +
    field('pl_feat', 'What they get', 'text', p.features || ''),
    async () => {
      await api('admin', 'plan_save', {
        plan_id: id || 0, plan_name: val('pl_name'), price: val('pl_price'),
        duration_days: val('pl_days'), max_properties: val('pl_max'), features: val('pl_feat'),
      });
      closeModal(); flash('Plan saved.'); show('plans');
    });
}
