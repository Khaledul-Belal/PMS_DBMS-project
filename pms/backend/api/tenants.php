<?php
require_once __DIR__ . '/../lib/core.php';
$owner_id = scope_owner_id();

function own_tenant($tenant_id, $owner_id)
{
    $st = db()->prepare('SELECT * FROM tenant WHERE tenant_id = ? AND owner_id = ?');
    $st->execute([$tenant_id, $owner_id]);
    $t = $st->fetch();
    if (!$t) fail('Tenant not found.', 404);
    return $t;
}

switch (action()) {
    case 'list':
        $st = db()->prepare(
            'SELECT t.*,
                    l.lease_id, l.start_date, l.end_date, l.monthly_rent,
                    u.unit_no, f.floor_no, p.name AS property_name
               FROM tenant t
          LEFT JOIN lease l  ON l.tenant_id = t.tenant_id AND l.status = "active"
          LEFT JOIN unit u   ON u.unit_id = l.unit_id
          LEFT JOIN floor f  ON f.floor_id = u.floor_id
          LEFT JOIN property p ON p.property_id = f.property_id
              WHERE t.owner_id = ?
           ORDER BY t.full_name'
        );
        $st->execute([$owner_id]);
        ok(['tenants' => $st->fetchAll()]);
        break;

    case 'create':
        $st = db()->prepare(
            'INSERT INTO tenant (owner_id, full_name, phone, email, nid, occupation, permanent_address, family_members, emergency_contact)
             VALUES (?,?,?,?,?,?,?,?,?)'
        );
        $st->execute([
            $owner_id, need('full_name'), inp('phone', ''), inp('email', ''), inp('nid', ''),
            inp('occupation', ''), inp('permanent_address', ''), (int) inp('family_members', 1),
            inp('emergency_contact', ''),
        ]);
        ok(['tenant_id' => (int) db()->lastInsertId()]);
        break;

    case 'update':
        $t = own_tenant((int) need('tenant_id'), $owner_id);
        $st = db()->prepare(
            'UPDATE tenant SET full_name=?, phone=?, email=?, nid=?, occupation=?, permanent_address=?, family_members=?, emergency_contact=?
              WHERE tenant_id=?'
        );
        $st->execute([
            inp('full_name', $t['full_name']), inp('phone', $t['phone']), inp('email', $t['email']),
            inp('nid', $t['nid']), inp('occupation', $t['occupation']),
            inp('permanent_address', $t['permanent_address']), (int) inp('family_members', $t['family_members']),
            inp('emergency_contact', $t['emergency_contact']), $t['tenant_id'],
        ]);
        ok();
        break;

    case 'delete':
        $t = own_tenant((int) need('tenant_id'), $owner_id);
        /* free the unit first */
        $st = db()->prepare('SELECT unit_id FROM lease WHERE tenant_id = ? AND status = "active"');
        $st->execute([$t['tenant_id']]);
        foreach ($st->fetchAll() as $r) {
            db()->prepare('UPDATE unit SET status = "vacant" WHERE unit_id = ?')->execute([$r['unit_id']]);
        }
        db()->prepare('DELETE FROM tenant WHERE tenant_id = ?')->execute([$t['tenant_id']]);
        ok();
        break;

    /* ============ LEASE ============ */
    case 'lease_list':
        $st = db()->prepare(
            'SELECT l.*, t.full_name AS tenant_name, t.phone AS tenant_phone,
                    u.unit_no, f.floor_no, p.name AS property_name, p.property_id,
                    DATEDIFF(l.end_date, CURDATE()) AS days_left
               FROM lease l
               JOIN tenant t ON t.tenant_id = l.tenant_id
               JOIN unit u   ON u.unit_id = l.unit_id
               JOIN floor f  ON f.floor_id = u.floor_id
               JOIN property p ON p.property_id = f.property_id
              WHERE p.owner_id = ?
           ORDER BY l.status, l.end_date'
        );
        $st->execute([$owner_id]);
        ok(['leases' => $st->fetchAll()]);
        break;

    case 'lease_create':
        $unit_id   = (int) need('unit_id');
        $tenant_id = (int) need('tenant_id');
        own_tenant($tenant_id, $owner_id);

        $st = db()->prepare(
            'SELECT u.* FROM unit u JOIN floor f ON f.floor_id = u.floor_id
               JOIN property p ON p.property_id = f.property_id
              WHERE u.unit_id = ? AND p.owner_id = ?'
        );
        $st->execute([$unit_id, $owner_id]);
        $unit = $st->fetch();
        if (!$unit) fail('Unit not found.', 404);
        if ($unit['status'] === 'occupied') fail('This unit already has an active tenant.');

        $start    = need('start_date');
        $months   = (int) inp('duration_months', 12);
        $end      = inp('end_date') ?: date('Y-m-d', strtotime("$start +$months months -1 day"));
        $rent     = (float) inp('monthly_rent', $unit['rent_amount']);
        $advance  = (float) inp('advance_paid', $unit['advance_amount']);

        $st = db()->prepare(
            'INSERT INTO lease (unit_id, tenant_id, start_date, end_date, duration_months, monthly_rent, advance_paid, rent_due_day, note)
             VALUES (?,?,?,?,?,?,?,?,?)'
        );
        $st->execute([$unit_id, $tenant_id, $start, $end, $months, $rent, $advance, (int) inp('rent_due_day', 5), inp('note', '')]);
        db()->prepare('UPDATE unit SET status = "occupied" WHERE unit_id = ?')->execute([$unit_id]);
        ok(['lease_id' => (int) db()->lastInsertId()]);
        break;

    /* tenant leaves -> unit becomes vacant again */
    case 'lease_end':
        $lease_id = (int) need('lease_id');
        $st = db()->prepare(
            'SELECT l.* FROM lease l JOIN unit u ON u.unit_id = l.unit_id
               JOIN floor f ON f.floor_id = u.floor_id
               JOIN property p ON p.property_id = f.property_id
              WHERE l.lease_id = ? AND p.owner_id = ?'
        );
        $st->execute([$lease_id, $owner_id]);
        $l = $st->fetch();
        if (!$l) fail('Lease not found.', 404);

        db()->prepare('UPDATE lease SET status = ?, end_date = ? WHERE lease_id = ?')
            ->execute([inp('status', 'ended'), inp('move_out_date', date('Y-m-d')), $lease_id]);
        db()->prepare('UPDATE unit SET status = "vacant" WHERE unit_id = ?')->execute([$l['unit_id']]);
        ok();
        break;

    default:
        fail('Unknown action.', 404);
}
