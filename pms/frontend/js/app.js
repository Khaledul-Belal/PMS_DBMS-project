/* ============================================================
   Owner / Manager dashboard
   ============================================================ */

let ME = null;
let MONTH = thisMonth();
const main = document.getElementById('main');

/* ---------------- boot ---------------- */
(async function start() {
  try {
    const r = await get('auth', 'me');
    ME = r.user;
    if (ME.role === 'admin') { location.href = 'admin.html'; return; }
  } catch (e) {
    location.href = 'login.html';
    return;
  }

  document.getElementById('whoName').textContent = ME.name;
  document.getElementById('whoEmail').textContent = ME.email;
  document.getElementById('roleBadge').textContent =
    ME.role === 'owner' ? 'Property owner' : 'Property manager';

  /* a manager cannot hire other managers */
  if (ME.role !== 'owner') document.getElementById('navManagers').remove();

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

function setActiveNav(view) {
  document.querySelectorAll('#nav button').forEach(x =>
    x.classList.toggle('active', x.dataset.view === view));
}

const views = {};
async function show(view, arg) {
  main.innerHTML = '<div class="empty">Loading…</div>';
  try {
    await views[view](arg);
  } catch (e) {
    main.innerHTML = `<div class="card"><h2>Could not load this page</h2><p class="muted">${esc(e.message)}</p></div>`;
  }
}

function header(title, subtitle, rightHtml = '') {
  return `<div class="topbar"><div><h1>${esc(title)}</h1>
          <div class="muted">${subtitle}</div></div><div class="toolbar">${rightHtml}</div></div>`;
}

const monthPicker = (id = 'monthSel') =>
  `<select id="${id}">${monthOptions().map(o =>
    `<option value="${o.v}" ${o.v === MONTH ? 'selected' : ''}>${o.t}</option>`).join('')}</select>`;

function bindMonth(reload, id = 'monthSel') {
  const el = document.getElementById(id);
  if (el) el.onchange = () => { MONTH = el.value; reload(); };
}

/* ============================================================
   OVERVIEW
   ============================================================ */
views.overview = async function () {
  const [s, t] = await Promise.all([
    get('dashboard', 'summary', { month: MONTH }),
    get('dashboard', 'trend'),
  ]);
  const c = s.cards;
  const max = Math.max(1, ...t.trend.map(x => Math.max(x.income, x.expense)));

  main.innerHTML =
    header('Overview', `Figures for ${monthName(MONTH)}`, monthPicker()) +
    `<div class="stats">
      <div class="stat"><div class="label">Buildings</div><div class="value num">${c.properties}</div></div>
      <div class="stat"><div class="label">Units</div><div class="value num">${c.units}</div>
        <div class="muted num">${c.occupied} occupied · ${c.vacant} vacant</div></div>
      <div class="stat"><div class="label">Occupancy</div><div class="value num">${c.occupancy_rate}%</div></div>
      <div class="stat"><div class="label">Rent collected</div><div class="value num pos">${taka(c.rent_collected)}</div></div>
      <div class="stat"><div class="label">Rent still due</div><div class="value num">${taka(c.rent_due)}</div></div>
      <div class="stat"><div class="label">Bills &amp; repairs</div><div class="value num">${taka(c.expense)}</div></div>
      <div class="stat"><div class="label">Staff salary</div><div class="value num">${taka(c.salary)}</div></div>
      <div class="stat"><div class="label">Profit this month</div>
        <div class="value num ${c.profit >= 0 ? 'pos' : 'neg'}">${taka(c.profit)}</div></div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Income against spending</h2>
        <div class="legend"><span><i style="background:#0e6b4e"></i>Rent in</span>
        <span><i style="background:#a8452b"></i>Bills + salary</span></div></div>
      <div class="bars">
        ${t.trend.map(x => `
          <div class="bar-group">
            <div class="bar-pair">
              <div class="bar income" style="height:${(x.income / max * 100).toFixed(1)}%" title="${taka(x.income)}"></div>
              <div class="bar expense" style="height:${(x.expense / max * 100).toFixed(1)}%" title="${taka(x.expense)}"></div>
            </div>
            <div class="bar-label">${x.month.slice(5)}/${x.month.slice(2, 4)}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Building by building</h2>
        <span class="muted">${c.open_requests} maintenance job(s) still open</span></div>
      ${table(
        [{ t: 'Building' }, { t: 'Units' }, { t: 'Occupied' }, { t: 'Rent in', num: 1 },
         { t: 'Bills', num: 1 }, { t: 'Salary', num: 1 }, { t: 'Profit', num: 1 }, { t: '' }],
        s.by_property,
        p => {
          const profit = p.income - p.expense - p.salary;
          return `<tr>
            <td><strong>${esc(p.name)}</strong></td>
            <td class="num">${p.units}</td>
            <td class="num">${p.occupied}</td>
            <td class="num">${taka(p.income)}</td>
            <td class="num">${taka(p.expense)}</td>
            <td class="num">${taka(p.salary)}</td>
            <td class="num" style="color:${profit >= 0 ? '#0e6b4e' : '#a8452b'}"><strong>${taka(profit)}</strong></td>
            <td class="right"><button class="btn ghost small" onclick="show('property', ${p.property_id})">Open</button></td>
          </tr>`;
        },
        'Add your first building from the Properties page.')}
    </div>`;

  bindMonth(() => show('overview'));
};

/* ============================================================
   PROPERTIES
   ============================================================ */
views.properties = async function () {
  const r = await get('properties', 'list');
  const canAdd = ME.role === 'owner';

  main.innerHTML =
    header('Properties', 'Every building in your account',
      canAdd ? '<button class="btn" id="addProp">Add building</button>' : '') +
    `<div class="card">${table(
      [{ t: 'Building' }, { t: 'Address' }, { t: 'Type' }, { t: 'Floors', num: 1 },
       { t: 'Units', num: 1 }, { t: 'Occupied', num: 1 }, { t: 'Vacant', num: 1 }, { t: 'Manager' }, { t: '' }],
      r.properties,
      p => `<tr>
        <td><strong>${esc(p.name)}</strong></td>
        <td class="muted">${dash(p.address)}${p.city ? ', ' + esc(p.city) : ''}</td>
        <td>${esc(p.property_type)}</td>
        <td class="num">${p.floor_count}</td>
        <td class="num">${p.unit_count}</td>
        <td class="num">${p.occupied_count}</td>
        <td class="num">${p.vacant_count}</td>
        <td>${p.manager_name ? esc(p.manager_name) : '<span class="muted">owner himself</span>'}</td>
        <td class="right">
          <button class="btn ghost small" onclick="show('property', ${p.property_id})">Open</button>
          ${canAdd ? `<button class="btn danger small" onclick="delProperty(${p.property_id})">Delete</button>` : ''}
        </td></tr>`,
      'No buildings yet.')}</div>`;

  const add = document.getElementById('addProp');
  if (add) add.onclick = () => propertyForm();
};

function propertyForm() {
  modal('Add a building',
    field('p_name', 'Building name', 'text', '', 'placeholder="Rahim Tower"') +
    field('p_address', 'Address') +
    `<div class="grid-2">${field('p_city', 'City', 'text', 'Chattogram')}
     ${select('p_type', 'Type', [{ v: 'residential', t: 'Residential' }, { v: 'commercial', t: 'Commercial' }, { v: 'mixed', t: 'Mixed' }])}</div>` +
    `<h3 style="margin:1rem 0 .6rem;font-size:.95rem">Build the floors now (optional)</h3>
     <div class="grid-3">
       ${field('p_floors', 'How many floors', 'number', '0')}
       ${field('p_units', 'Units per floor', 'number', '0')}
       ${field('p_rent', 'Rent per unit', 'number', '0')}
     </div>
     <p class="muted">Leave these at 0 if you would rather add floors and units one by one.</p>`,
    async () => {
      await api('properties', 'create', {
        name: val('p_name'), address: val('p_address'), city: val('p_city'),
        property_type: val('p_type'),
        auto_floors: val('p_floors'), auto_units_per_floor: val('p_units'), auto_rent: val('p_rent'),
      });
      closeModal(); flash('Building added.'); show('properties');
    }, 'Add building');
}

async function delProperty(id) {
  if (!confirm('Delete this building with all its floors, units, leases and bills?')) return;
  await api('properties', 'delete', { property_id: id });
  flash('Building deleted.');
  show('properties');
}

/* ============================================================
   ONE PROPERTY (floor / unit view)
   ============================================================ */
views.property = async function (id) {
  setActiveNav('properties');
  const r = await get('properties', 'get', { property_id: id });
  const p = r.property;
  const byFloor = {};
  r.floors.forEach(f => (byFloor[f.floor_id] = { floor: f, units: [] }));
  r.units.forEach(u => byFloor[u.floor_id] && byFloor[u.floor_id].units.push(u));

  main.innerHTML =
    header(p.name, `${dash(p.address)} · ${r.floors.length} floors · ${r.units.length} units`,
      `<button class="btn ghost" onclick="show('properties')">Back</button>
       <button class="btn ghost" id="addFloor">Add floor</button>
       <button class="btn" id="addUnit">Add unit</button>`) +

    `<div class="card">
      <div class="card-head"><h2>Floor plan</h2>
        <div class="legend">
          <span><i style="background:#0e6b4e"></i>Occupied</span>
          <span><i style="background:#b57f12"></i>Vacant</span>
          <span><i style="background:#a8452b"></i>Under repair</span>
        </div>
      </div>
      <div class="building">
        ${Object.values(byFloor).map(f => `
          <div class="floor-row">
            <div class="floor-label">Floor ${f.floor.floor_no}</div>
            ${f.units.map(u => `
              <div class="unit-box ${u.status}" onclick="unitForm(${u.unit_id})">
                <div class="no">${esc(u.unit_no)}</div>
                <div class="rent num">${taka(u.rent_amount)}/mo</div>
                <div class="muted" style="font-size:.76rem">${u.tenant_name ? esc(u.tenant_name) : u.status}</div>
              </div>`).join('') || '<div class="muted" style="align-self:center">no units yet</div>'}
          </div>`).join('') || '<div class="empty">No floors yet. Add one above.</div>'}
      </div>
    </div>

    <div class="card">
      <h2 style="margin-bottom:.9rem">Unit details</h2>
      ${table(
        [{ t: 'Floor', num: 1 }, { t: 'Unit' }, { t: 'Type' }, { t: 'Bed', num: 1 }, { t: 'Size', num: 1 },
         { t: 'Rent', num: 1 }, { t: 'Advance', num: 1 }, { t: 'Status' }, { t: 'Tenant' }, { t: 'Lease ends' }, { t: '' }],
        r.units,
        u => `<tr>
          <td class="num">${u.floor_no}</td>
          <td><strong>${esc(u.unit_no)}</strong></td>
          <td>${esc(u.unit_type)}</td>
          <td class="num">${u.bedrooms}</td>
          <td class="num">${u.size_sqft}</td>
          <td class="num">${taka(u.rent_amount)}</td>
          <td class="num">${taka(u.advance_amount)}</td>
          <td>${tag(u.status)}</td>
          <td>${u.tenant_name ? esc(u.tenant_name) + '<br><span class="muted">' + esc(u.tenant_phone || '') + '</span>' : '<span class="muted">—</span>'}</td>
          <td>${dash(u.end_date)}</td>
          <td class="right">
            <button class="btn ghost small" onclick="unitForm(${u.unit_id})">Edit</button>
            <button class="btn danger small" onclick="delUnit(${u.unit_id}, ${id})">Delete</button>
          </td></tr>`,
        'No units on this building yet.')}
    </div>`;

  window.__property = r;

  document.getElementById('addFloor').onclick = () => {
    const next = Math.max(0, ...r.floors.map(f => +f.floor_no)) + 1;
    modal('Add a floor',
      field('f_no', 'Floor number', 'number', next) +
      field('f_desc', 'Description', 'text', '', 'placeholder="Shops / residential"'),
      async () => {
        await api('properties', 'floor_create', { property_id: id, floor_no: val('f_no'), description: val('f_desc') });
        closeModal(); flash('Floor added.'); show('property', id);
      }, 'Add floor');
  };

  document.getElementById('addUnit').onclick = () => {
    if (!r.floors.length) return flash('Add a floor first.', 'error');
    modal('Add a unit',
      select('u_floor', 'Floor', r.floors.map(f => ({ v: f.floor_id, t: 'Floor ' + f.floor_no }))) +
      `<div class="grid-2">${field('u_no', 'Unit number', 'text', '', 'placeholder="3B"')}
       ${select('u_type', 'Type', [{ v: 'flat', t: 'Flat' }, { v: 'shop', t: 'Shop' }, { v: 'office', t: 'Office' }, { v: 'garage', t: 'Garage' }])}</div>` +
      `<div class="grid-2">${field('u_bed', 'Bedrooms', 'number', '2')}${field('u_size', 'Size (sq ft)', 'number', '900')}</div>` +
      `<div class="grid-2">${field('u_rent', 'Monthly rent', 'number', '0')}${field('u_adv', 'Advance', 'number', '0')}</div>`,
      async () => {
        await api('properties', 'unit_create', {
          floor_id: val('u_floor'), unit_no: val('u_no'), unit_type: val('u_type'),
          bedrooms: val('u_bed'), size_sqft: val('u_size'),
          rent_amount: val('u_rent'), advance_amount: val('u_adv'),
        });
        closeModal(); flash('Unit added.'); show('property', id);
      }, 'Add unit');
  };
};

function unitForm(unit_id) {
  const r = window.__property;
  const u = r.units.find(x => +x.unit_id === +unit_id);
  modal('Unit ' + u.unit_no,
    `<div class="grid-2">${field('e_no', 'Unit number', 'text', u.unit_no)}
     ${select('e_type', 'Type', [{ v: 'flat', t: 'Flat' }, { v: 'shop', t: 'Shop' }, { v: 'office', t: 'Office' }, { v: 'garage', t: 'Garage' }], u.unit_type)}</div>` +
    `<div class="grid-2">${field('e_bed', 'Bedrooms', 'number', u.bedrooms)}${field('e_size', 'Size (sq ft)', 'number', u.size_sqft)}</div>` +
    `<div class="grid-2">${field('e_rent', 'Monthly rent', 'number', u.rent_amount)}${field('e_adv', 'Advance', 'number', u.advance_amount)}</div>` +
    select('e_status', 'Status', [{ v: 'vacant', t: 'Vacant' }, { v: 'occupied', t: 'Occupied' }, { v: 'maintenance', t: 'Under repair' }], u.status) +
    (u.tenant_name ? `<p class="muted">Current tenant: <strong>${esc(u.tenant_name)}</strong> ·
      rent ${taka(u.lease_rent)} · lease ends ${esc(u.end_date || '—')}</p>` : ''),
    async () => {
      await api('properties', 'unit_update', {
        unit_id, unit_no: val('e_no'), unit_type: val('e_type'), bedrooms: val('e_bed'),
        size_sqft: val('e_size'), rent_amount: val('e_rent'), advance_amount: val('e_adv'), status: val('e_status'),
      });
      closeModal(); flash('Unit updated.'); show('property', r.property.property_id);
    });
}

async function delUnit(unit_id, pid) {
  if (!confirm('Delete this unit?')) return;
  await api('properties', 'unit_delete', { unit_id });
  flash('Unit deleted.');
  show('property', pid);
}

/* ============================================================
   TENANTS
   ============================================================ */
views.tenants = async function () {
  const r = await get('tenants', 'list');
  main.innerHTML =
    header('Tenants', 'People renting your units', '<button class="btn" id="addTenant">Add tenant</button>') +
    `<div class="card">${table(
      [{ t: 'Name' }, { t: 'Phone' }, { t: 'NID' }, { t: 'Occupation' }, { t: 'Family', num: 1 },
       { t: 'Renting' }, { t: 'Rent', num: 1 }, { t: '' }],
      r.tenants,
      t => `<tr>
        <td><strong>${esc(t.full_name)}</strong><br><span class="muted">${dash(t.email)}</span></td>
        <td>${dash(t.phone)}</td>
        <td>${dash(t.nid)}</td>
        <td>${dash(t.occupation)}</td>
        <td class="num">${t.family_members}</td>
        <td>${t.unit_no ? esc(t.property_name) + ' · Floor ' + t.floor_no + ' · ' + esc(t.unit_no) : '<span class="muted">no active lease</span>'}</td>
        <td class="num">${t.monthly_rent ? taka(t.monthly_rent) : '—'}</td>
        <td class="right">
          <button class="btn ghost small" onclick="tenantForm(${t.tenant_id})">Edit</button>
          <button class="btn danger small" onclick="delTenant(${t.tenant_id})">Delete</button>
        </td></tr>`,
      'No tenants added yet.')}</div>`;

  window.__tenants = r.tenants;
  document.getElementById('addTenant').onclick = () => tenantForm();
};

function tenantForm(id) {
  const t = id ? window.__tenants.find(x => +x.tenant_id === +id) : {};
  modal(id ? 'Edit tenant' : 'Add tenant',
    field('t_name', 'Full name', 'text', t.full_name || '') +
    `<div class="grid-2">${field('t_phone', 'Phone', 'text', t.phone || '')}${field('t_email', 'Email', 'email', t.email || '')}</div>` +
    `<div class="grid-2">${field('t_nid', 'NID number', 'text', t.nid || '')}${field('t_occ', 'Occupation', 'text', t.occupation || '')}</div>` +
    field('t_addr', 'Permanent address', 'text', t.permanent_address || '') +
    `<div class="grid-2">${field('t_fam', 'Family members', 'number', t.family_members || 1)}
     ${field('t_emg', 'Emergency contact', 'text', t.emergency_contact || '')}</div>`,
    async () => {
      const data = {
        tenant_id: id, full_name: val('t_name'), phone: val('t_phone'), email: val('t_email'),
        nid: val('t_nid'), occupation: val('t_occ'), permanent_address: val('t_addr'),
        family_members: val('t_fam'), emergency_contact: val('t_emg'),
      };
      await api('tenants', id ? 'update' : 'create', data);
      closeModal(); flash('Tenant saved.'); show('tenants');
    });
}

async function delTenant(id) {
  if (!confirm('Delete this tenant? Their lease history will go too.')) return;
  await api('tenants', 'delete', { tenant_id: id });
  flash('Tenant deleted.');
  show('tenants');
}

/* ============================================================
   LEASES
   ============================================================ */
views.leases = async function () {
  const [r, vac, tn] = await Promise.all([
    get('tenants', 'lease_list'),
    get('properties', 'vacant_units'),
    get('tenants', 'list'),
  ]);
  window.__vacant = vac.units;
  window.__tenantList = tn.tenants;

  main.innerHTML =
    header('Leases', 'Who is renting what, from when to when',
      '<button class="btn" id="addLease">New lease</button>') +
    `<div class="card">${table(
      [{ t: 'Tenant' }, { t: 'Unit' }, { t: 'From' }, { t: 'To' }, { t: 'Months', num: 1 },
       { t: 'Rent', num: 1 }, { t: 'Advance', num: 1 }, { t: 'Status' }, { t: 'Notice' }, { t: '' }],
      r.leases,
      l => `<tr>
        <td><strong>${esc(l.tenant_name)}</strong><br><span class="muted">${dash(l.tenant_phone)}</span></td>
        <td>${esc(l.property_name)}<br><span class="muted">Floor ${l.floor_no} · ${esc(l.unit_no)}</span></td>
        <td>${esc(l.start_date)}</td>
        <td>${dash(l.end_date)}</td>
        <td class="num">${l.duration_months}</td>
        <td class="num">${taka(l.monthly_rent)}</td>
        <td class="num">${taka(l.advance_paid)}</td>
        <td>${tag(l.status)}</td>
        <td>${l.status === 'active' && l.days_left !== null
              ? (l.days_left < 0 ? '<span class="tag due">expired</span>'
                 : l.days_left < 60 ? `<span class="tag due">${l.days_left} days left</span>`
                 : `<span class="muted num">${l.days_left} days</span>`)
              : '<span class="muted">—</span>'}</td>
        <td class="right">${l.status === 'active'
          ? `<button class="btn ghost small" onclick="endLease(${l.lease_id})">End lease</button>` : ''}</td>
      </tr>`,
      'No leases recorded yet.')}</div>`;

  document.getElementById('addLease').onclick = () => {
    if (!window.__vacant.length) return flash('There is no vacant unit right now.', 'error');
    if (!window.__tenantList.length) return flash('Add a tenant first.', 'error');
    modal('New lease',
      select('l_tenant', 'Tenant', window.__tenantList.map(t => ({ v: t.tenant_id, t: t.full_name }))) +
      select('l_unit', 'Vacant unit', window.__vacant.map(u =>
        ({ v: u.unit_id, t: `${u.property_name} · Floor ${u.floor_no} · ${u.unit_no} (${taka(u.rent_amount)})` }))) +
      `<div class="grid-2">${field('l_start', 'Move in date', 'date', today())}
       ${field('l_months', 'Duration (months)', 'number', 12)}</div>` +
      `<div class="grid-2">${field('l_rent', 'Monthly rent', 'number', '')}
       ${field('l_adv', 'Advance taken', 'number', '')}</div>` +
      field('l_note', 'Note', 'text', '', 'placeholder="optional"'),
      async () => {
        await api('tenants', 'lease_create', {
          tenant_id: val('l_tenant'), unit_id: val('l_unit'), start_date: val('l_start'),
          duration_months: val('l_months'), monthly_rent: val('l_rent') || undefined,
          advance_paid: val('l_adv') || undefined, note: val('l_note'),
        });
        closeModal(); flash('Lease created. The unit is now occupied.'); show('leases');
      }, 'Create lease');

    /* pre-fill rent from the chosen unit */
    const fill = () => {
      const u = window.__vacant.find(x => String(x.unit_id) === val('l_unit'));
      if (u) {
        document.getElementById('l_rent').value = u.rent_amount;
        document.getElementById('l_adv').value = u.advance_amount;
      }
    };
    document.getElementById('l_unit').onchange = fill;
    fill();
  };
};

async function endLease(lease_id) {
  if (!confirm('End this lease? The unit will be marked vacant.')) return;
  await api('tenants', 'lease_end', { lease_id, move_out_date: today() });
  flash('Lease closed, unit is vacant again.');
  show('leases');
}

/* ============================================================
   RENT COLLECTION
   ============================================================ */
views.rent = async function () {
  const r = await get('payments', 'list', { month: MONTH });
  const due = r.payments.reduce((a, p) => a + (+p.amount_due - +p.amount_paid), 0);
  const got = r.payments.reduce((a, p) => a + +p.amount_paid, 0);

  main.innerHTML =
    header('Rent collection', `${monthName(MONTH)} — ${taka(got)} collected, ${taka(due)} outstanding`,
      monthPicker() + '<button class="btn" id="genBills">Create this month\'s bills</button>') +
    `<div class="card">${table(
      [{ t: 'Tenant' }, { t: 'Unit' }, { t: 'Month' }, { t: 'Due', num: 1 }, { t: 'Paid', num: 1 },
       { t: 'Date' }, { t: 'Method' }, { t: 'Status' }, { t: 'Collected by' }, { t: '' }],
      r.payments,
      p => `<tr>
        <td><strong>${esc(p.tenant_name)}</strong></td>
        <td>${esc(p.property_name)} · ${esc(p.unit_no)}</td>
        <td>${esc(p.billing_month)}</td>
        <td class="num">${taka(p.amount_due)}</td>
        <td class="num">${taka(p.amount_paid)}</td>
        <td>${dash(p.payment_date)}</td>
        <td>${esc(p.payment_method)}</td>
        <td>${tag(p.status)}</td>
        <td class="muted">${p.collector ? esc(p.collector) : 'owner'}</td>
        <td class="right"><button class="btn ghost small" onclick="payForm(${p.payment_id})">Record payment</button></td>
      </tr>`,
      'No rent bills for this month yet — use the button above to create them.')}</div>`;

  window.__payments = r.payments;
  bindMonth(() => show('rent'));
  document.getElementById('genBills').onclick = async () => {
    const res = await api('payments', 'generate', { month: MONTH });
    flash(res.created ? `${res.created} rent bill(s) created.` : 'Bills for this month already exist.');
    show('rent');
  };
};

function payForm(payment_id) {
  const p = window.__payments.find(x => +x.payment_id === +payment_id);
  modal(`Rent from ${p.tenant_name}`,
    `<p class="muted">Unit ${esc(p.unit_no)} · ${monthName(p.billing_month)} · due ${taka(p.amount_due)}</p>` +
    field('r_amt', 'Amount received', 'number', p.amount_paid > 0 ? p.amount_paid : p.amount_due) +
    `<div class="grid-2">${field('r_date', 'Payment date', 'date', p.payment_date || today())}
     ${select('r_method', 'Method', [{ v: 'cash', t: 'Cash' }, { v: 'bkash', t: 'bKash' }, { v: 'nagad', t: 'Nagad' },
       { v: 'bank', t: 'Bank' }, { v: 'cheque', t: 'Cheque' }], p.payment_method)}</div>`,
    async () => {
      await api('payments', 'pay', {
        payment_id, amount_paid: val('r_amt'), payment_date: val('r_date'), payment_method: val('r_method'),
      });
      closeModal(); flash('Payment recorded.'); show('rent');
    }, 'Save payment');
}

/* ============================================================
   EXPENSES
   ============================================================ */
views.expenses = async function () {
  const [r, cat, props] = await Promise.all([
    get('expenses', 'list', { month: MONTH }),
    get('expenses', 'categories'),
    get('properties', 'list'),
  ]);
  window.__cats = cat.categories;
  window.__props = props.properties;
  const total = r.expenses.reduce((a, e) => a + +e.amount, 0);

  main.innerHTML =
    header('Expenses & bills', `${monthName(MONTH)} — ${taka(total)} spent`,
      monthPicker() + '<button class="btn" id="addExp">Add expense</button>') +
    `<div class="card">${table(
      [{ t: 'Date' }, { t: 'Building' }, { t: 'Category' }, { t: 'Title' }, { t: 'Unit' },
       { t: 'Vendor' }, { t: 'Paid by' }, { t: 'Amount', num: 1 }, { t: '' }],
      r.expenses,
      e => `<tr>
        <td>${esc(e.expense_date)}</td>
        <td>${esc(e.property_name)}</td>
        <td>${esc(e.category_name)}</td>
        <td><strong>${esc(e.title)}</strong>${e.note ? '<br><span class="muted">' + esc(e.note) + '</span>' : ''}</td>
        <td>${dash(e.unit_no)}</td>
        <td>${dash(e.vendor_name)}</td>
        <td>${esc(e.paid_by)}</td>
        <td class="num">${taka(e.amount)}</td>
        <td class="right"><button class="btn danger small" onclick="delExpense(${e.expense_id})">Delete</button></td>
      </tr>`,
      'No bills recorded for this month.')}</div>`;

  bindMonth(() => show('expenses'));
  document.getElementById('addExp').onclick = () => {
    if (!window.__props.length) return flash('Add a building first.', 'error');
    modal('Add an expense',
      `<div class="grid-2">
        ${select('x_prop', 'Building', window.__props.map(p => ({ v: p.property_id, t: p.name })))}
        ${select('x_cat', 'Category', window.__cats.map(c => ({ v: c.category_id, t: c.name })))}
       </div>` +
      field('x_title', 'What was it for', 'text', '', 'placeholder="September electricity bill"') +
      `<div class="grid-2">${field('x_amount', 'Amount', 'number', '')}
       ${field('x_date', 'Date', 'date', today())}</div>` +
      `<div class="grid-2">${field('x_vendor', 'Vendor / shop', 'text', '')}
       ${field('x_month', 'Billing month', 'month', MONTH)}</div>` +
      field('x_note', 'Note', 'text', ''),
      async () => {
        await api('expenses', 'create', {
          property_id: val('x_prop'), category_id: val('x_cat'), title: val('x_title'),
          amount: val('x_amount'), expense_date: val('x_date'), billing_month: val('x_month'),
          vendor_name: val('x_vendor'), note: val('x_note'),
        });
        closeModal(); flash('Expense saved.'); show('expenses');
      }, 'Save expense');
  };
};

async function delExpense(id) {
  if (!confirm('Delete this expense?')) return;
  await api('expenses', 'delete', { expense_id: id });
  flash('Expense deleted.');
  show('expenses');
}

/* ============================================================
   STAFF & SALARY
   ============================================================ */
views.staff = async function () {
  const [s, sal, props] = await Promise.all([
    get('staff', 'list'),
    get('staff', 'salary_list', { month: MONTH }),
    get('properties', 'list'),
  ]);
  window.__props = props.properties;
  const paid = sal.salaries.filter(x => x.status === 'paid').reduce((a, x) => a + +x.amount, 0);
  const pending = sal.salaries.filter(x => x.status !== 'paid').reduce((a, x) => a + +x.amount, 0);

  main.innerHTML =
    header('Staff & salary', `${monthName(MONTH)} — ${taka(paid)} paid, ${taka(pending)} pending`,
      monthPicker() + '<button class="btn ghost" id="genSal">Create salary sheet</button>' +
      '<button class="btn" id="addStaff">Add staff</button>') +

    `<div class="card">
      <h2 style="margin-bottom:.9rem">Salary sheet — ${monthName(MONTH)}</h2>
      ${table(
        [{ t: 'Name' }, { t: 'Role' }, { t: 'Building' }, { t: 'Amount', num: 1 }, { t: 'Paid on' }, { t: 'Status' }, { t: '' }],
        sal.salaries,
        x => `<tr>
          <td><strong>${esc(x.full_name)}</strong></td>
          <td>${esc(x.role)}</td>
          <td>${esc(x.property_name)}</td>
          <td class="num">${taka(x.amount)}</td>
          <td>${dash(x.paid_date)}</td>
          <td>${tag(x.status)}</td>
          <td class="right">${x.status !== 'paid'
            ? `<button class="btn ghost small" onclick="paySalary(${x.salary_id})">Mark paid</button>` : ''}</td>
        </tr>`,
        'No salary sheet for this month yet.')}
    </div>

    <div class="card">
      <h2 style="margin-bottom:.9rem">Employees</h2>
      ${table(
        [{ t: 'Name' }, { t: 'Role' }, { t: 'Building' }, { t: 'Phone' }, { t: 'Joined' },
         { t: 'Monthly salary', num: 1 }, { t: 'Status' }, { t: '' }],
        s.staff,
        x => `<tr>
          <td><strong>${esc(x.full_name)}</strong></td>
          <td>${esc(x.role)}</td>
          <td>${esc(x.property_name)}</td>
          <td>${dash(x.phone)}</td>
          <td>${dash(x.join_date)}</td>
          <td class="num">${taka(x.monthly_salary)}</td>
          <td>${tag(x.status === 'active' ? 'active' : 'ended', x.status)}</td>
          <td class="right"><button class="btn danger small" onclick="delStaff(${x.staff_id})">Remove</button></td>
        </tr>`,
        'No staff added yet.')}
    </div>`;

  bindMonth(() => show('staff'));

  document.getElementById('genSal').onclick = async () => {
    const res = await api('staff', 'salary_generate', { month: MONTH });
    flash(res.created ? `${res.created} salary line(s) created.` : 'Salary sheet already exists for this month.');
    show('staff');
  };

  document.getElementById('addStaff').onclick = () => {
    if (!window.__props.length) return flash('Add a building first.', 'error');
    modal('Add a staff member',
      `<div class="grid-2">
        ${select('st_prop', 'Building', window.__props.map(p => ({ v: p.property_id, t: p.name })))}
        ${select('st_role', 'Role', [{ v: 'caretaker', t: 'Caretaker' }, { v: 'guard', t: 'Guard' },
          { v: 'cleaner', t: 'Cleaner' }, { v: 'electrician', t: 'Electrician' }, { v: 'other', t: 'Other' }])}
       </div>` +
      field('st_name', 'Full name') +
      `<div class="grid-2">${field('st_phone', 'Phone')}${field('st_nid', 'NID')}</div>` +
      `<div class="grid-2">${field('st_salary', 'Monthly salary', 'number', '0')}
       ${field('st_join', 'Joining date', 'date', today())}</div>`,
      async () => {
        await api('staff', 'create', {
          property_id: val('st_prop'), role: val('st_role'), full_name: val('st_name'),
          phone: val('st_phone'), nid: val('st_nid'),
          monthly_salary: val('st_salary'), join_date: val('st_join'),
        });
        closeModal(); flash('Staff added.'); show('staff');
      }, 'Add staff');
  };
};

async function paySalary(id) {
  await api('staff', 'salary_pay', { salary_id: id, paid_date: today() });
  flash('Salary marked as paid.');
  show('staff');
}
async function delStaff(id) {
  if (!confirm('Remove this staff member?')) return;
  await api('staff', 'delete', { staff_id: id });
  flash('Staff removed.');
  show('staff');
}

/* ============================================================
   MAINTENANCE
   ============================================================ */
views.maintenance = async function () {
  const [r, props] = await Promise.all([get('maintenance', 'list'), get('properties', 'list')]);
  window.__props = props.properties;

  main.innerHTML =
    header('Maintenance', 'Broken things, who fixed them, what it cost',
      '<button class="btn" id="addReq">Log a job</button>') +
    `<div class="card">${table(
      [{ t: 'Date' }, { t: 'Building' }, { t: 'Unit' }, { t: 'Problem' }, { t: 'Priority' },
       { t: 'Vendor' }, { t: 'Cost', num: 1 }, { t: 'Status' }, { t: '' }],
      r.requests,
      m => `<tr>
        <td>${esc(m.request_date)}</td>
        <td>${esc(m.property_name)}</td>
        <td>${dash(m.unit_no)}</td>
        <td><strong>${esc(m.title)}</strong>${m.description ? '<br><span class="muted">' + esc(m.description) + '</span>' : ''}</td>
        <td>${tag(m.priority)}</td>
        <td>${dash(m.vendor_name)}</td>
        <td class="num">${taka(m.cost)}</td>
        <td>${tag(m.status)}</td>
        <td class="right">
          <button class="btn ghost small" onclick="reqForm(${m.request_id})">Update</button>
          <button class="btn danger small" onclick="delReq(${m.request_id})">Delete</button>
        </td></tr>`,
      'Nothing broken — or nothing logged yet.')}</div>`;

  window.__requests = r.requests;

  document.getElementById('addReq').onclick = async () => {
    if (!window.__props.length) return flash('Add a building first.', 'error');
    modal('Log a maintenance job',
      `<div class="grid-2">
        ${select('m_prop', 'Building', window.__props.map(p => ({ v: p.property_id, t: p.name })))}
        ${select('m_pri', 'Priority', [{ v: 'low', t: 'Low' }, { v: 'medium', t: 'Medium' }, { v: 'high', t: 'High' }], 'medium')}
       </div>` +
      field('m_title', 'Problem', 'text', '', 'placeholder="Lift making noise"') +
      field('m_desc', 'Details', 'text', '') +
      `<div class="grid-2">${field('m_date', 'Reported on', 'date', today())}
       ${field('m_vendor', 'Vendor (if known)', 'text', '')}</div>`,
      async () => {
        await api('maintenance', 'create', {
          property_id: val('m_prop'), priority: val('m_pri'), title: val('m_title'),
          description: val('m_desc'), request_date: val('m_date'), vendor_name: val('m_vendor'),
        });
        closeModal(); flash('Job logged.'); show('maintenance');
      }, 'Log job');
  };
};

function reqForm(id) {
  const m = window.__requests.find(x => +x.request_id === +id);
  modal('Update: ' + m.title,
    select('q_status', 'Status', [{ v: 'pending', t: 'Pending' }, { v: 'in_progress', t: 'In progress' },
      { v: 'done', t: 'Done' }], m.status) +
    `<div class="grid-2">${field('q_vendor', 'Vendor', 'text', m.vendor_name || '')}
     ${field('q_cost', 'Cost', 'number', m.cost)}</div>` +
    `<p class="muted">When you mark a job as done with a cost, it is written into the expense list automatically.</p>`,
    async () => {
      await api('maintenance', 'update', {
        request_id: id, status: val('q_status'), vendor_name: val('q_vendor'), cost: val('q_cost'),
      });
      closeModal(); flash('Job updated.'); show('maintenance');
    });
}

async function delReq(id) {
  if (!confirm('Delete this maintenance record?')) return;
  await api('maintenance', 'delete', { request_id: id });
  flash('Deleted.');
  show('maintenance');
}

/* ============================================================
   MANAGERS (owner only)
   ============================================================ */
views.managers = async function () {
  const [r, props] = await Promise.all([get('managers', 'list'), get('properties', 'list')]);
  window.__props = props.properties;

  main.innerHTML =
    header('Managers', 'Give someone else the keys to your buildings',
      '<button class="btn" id="addMgr">Add manager</button>') +
    `<div class="card">${table(
      [{ t: 'Name' }, { t: 'Email (login)' }, { t: 'Phone' }, { t: 'Salary', num: 1 },
       { t: 'Buildings', num: 1 }, { t: 'Hired' }, { t: 'Status' }, { t: '' }],
      r.managers,
      m => `<tr>
        <td><strong>${esc(m.full_name)}</strong></td>
        <td>${esc(m.email)}</td>
        <td>${dash(m.phone)}</td>
        <td class="num">${taka(m.monthly_salary)}</td>
        <td class="num">${m.property_count}</td>
        <td>${dash(m.hire_date)}</td>
        <td>${tag(m.status === 'active' ? 'active' : 'ended', m.status)}</td>
        <td class="right">
          <button class="btn ghost small" onclick="mgrForm(${m.manager_id})">Edit</button>
          <button class="btn danger small" onclick="delMgr(${m.manager_id})">Delete</button>
        </td></tr>`,
      'You are managing everything yourself right now.')}</div>

    <div class="card">
      <h2 style="margin-bottom:.9rem">Who looks after which building</h2>
      ${table([{ t: 'Building' }, { t: 'Manager' }, { t: '' }], props.properties,
        p => `<tr>
          <td><strong>${esc(p.name)}</strong></td>
          <td>${p.manager_name ? esc(p.manager_name) : '<span class="muted">owner himself</span>'}</td>
          <td class="right">
            <select onchange="assignMgr(${p.property_id}, this.value)" style="width:auto">
              <option value="">— owner himself —</option>
              ${r.managers.map(m => `<option value="${m.manager_id}" ${+m.manager_id === +p.manager_id ? 'selected' : ''}>${esc(m.full_name)}</option>`).join('')}
            </select>
          </td></tr>`,
        'No buildings yet.')}
    </div>`;

  window.__managers = r.managers;
  document.getElementById('addMgr').onclick = () => mgrForm();
};

function mgrForm(id) {
  const m = id ? window.__managers.find(x => +x.manager_id === +id) : {};
  modal(id ? 'Edit manager' : 'Add a manager',
    field('g_name', 'Full name', 'text', m.full_name || '') +
    (id ? `<p class="muted">Login email: <strong>${esc(m.email)}</strong></p>`
        : field('g_email', 'Login email', 'email', '')) +
    `<div class="grid-2">
      ${field('g_pass', id ? 'New password (leave blank to keep)' : 'Password', 'password', '')}
      ${field('g_phone', 'Phone', 'text', m.phone || '')}</div>` +
    `<div class="grid-2">${field('g_salary', 'Monthly salary', 'number', m.monthly_salary || 0)}
     ${id ? select('g_status', 'Status', [{ v: 'active', t: 'Active' }, { v: 'inactive', t: 'Inactive' }], m.status)
          : field('g_hire', 'Hire date', 'date', today())}</div>`,
    async () => {
      const data = {
        manager_id: id, full_name: val('g_name'), phone: val('g_phone'),
        monthly_salary: val('g_salary'), password: val('g_pass') || undefined,
      };
      if (id) data.status = val('g_status');
      else { data.email = val('g_email'); data.hire_date = val('g_hire'); }
      await api('managers', id ? 'update' : 'create', data);
      closeModal(); flash('Manager saved.'); show('managers');
    });
}

async function assignMgr(property_id, manager_id) {
  await api('managers', 'assign', { property_id, manager_id: manager_id || null });
  flash('Building assigned.');
  show('managers');
}
async function delMgr(id) {
  if (!confirm('Delete this manager account?')) return;
  await api('managers', 'delete', { manager_id: id });
  flash('Manager removed.');
  show('managers');
}

/* ============================================================
   MONTHLY REPORT
   ============================================================ */
views.reports = async function () {
  const props = await get('properties', 'list');
  if (!props.properties.length) {
    main.innerHTML = header('Monthly report', 'Profit and loss per building') +
      '<div class="card"><div class="empty">Add a building first.</div></div>';
    return;
  }
  const pid = window.__reportPid && props.properties.some(p => +p.property_id === +window.__reportPid)
    ? window.__reportPid : props.properties[0].property_id;

  const r = await get('dashboard', 'report', { property_id: pid, month: MONTH });
  const t = r.totals;

  main.innerHTML =
    header('Monthly report', `${r.property.name} — ${monthName(MONTH)}`,
      `<select id="repProp">${props.properties.map(p =>
        `<option value="${p.property_id}" ${+p.property_id === +pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>` +
      monthPicker() + '<button class="btn ghost" onclick="window.print()">Print</button>') +

    `<div class="stats">
      <div class="stat"><div class="label">Rent collected</div><div class="value num pos">${taka(t.income)}</div></div>
      <div class="stat"><div class="label">Rent unpaid</div><div class="value num">${taka(t.due)}</div></div>
      <div class="stat"><div class="label">Bills &amp; repairs</div><div class="value num">${taka(t.expense)}</div></div>
      <div class="stat"><div class="label">Salaries</div><div class="value num">${taka(t.salary)}</div></div>
      <div class="stat"><div class="label">Net profit</div>
        <div class="value num ${t.profit >= 0 ? 'pos' : 'neg'}">${taka(t.profit)}</div></div>
    </div>

    <div class="card"><h2 style="margin-bottom:.9rem">Rent received</h2>
      ${table([{ t: 'Floor', num: 1 }, { t: 'Unit' }, { t: 'Tenant' }, { t: 'Due', num: 1 },
               { t: 'Paid', num: 1 }, { t: 'Status' }], r.rents,
        x => `<tr><td class="num">${x.floor_no}</td><td>${esc(x.unit_no)}</td>
              <td>${esc(x.tenant_name)}</td><td class="num">${taka(x.amount_due)}</td>
              <td class="num">${taka(x.amount_paid)}</td><td>${tag(x.status)}</td></tr>`,
        'No rent records for this month.')}
    </div>

    <div class="card"><h2 style="margin-bottom:.9rem">Money spent</h2>
      ${table([{ t: 'Date' }, { t: 'Category' }, { t: 'Title' }, { t: 'Vendor' }, { t: 'Amount', num: 1 }], r.expenses,
        x => `<tr><td>${esc(x.expense_date)}</td><td>${esc(x.category_name)}</td>
              <td>${esc(x.title)}</td><td>${dash(x.vendor_name)}</td>
              <td class="num">${taka(x.amount)}</td></tr>`,
        'No bills for this month.')}
    </div>

    <div class="card"><h2 style="margin-bottom:.9rem">Salaries</h2>
      ${table([{ t: 'Name' }, { t: 'Role' }, { t: 'Amount', num: 1 }, { t: 'Status' }], r.salaries,
        x => `<tr><td>${esc(x.full_name)}</td><td>${esc(x.role)}</td>
              <td class="num">${taka(x.amount)}</td><td>${tag(x.status)}</td></tr>`,
        'No salary lines for this month.')}
    </div>`;

  document.getElementById('repProp').onchange = e => { window.__reportPid = e.target.value; show('reports'); };
  bindMonth(() => show('reports'));
};
