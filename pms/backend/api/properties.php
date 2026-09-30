<?php
require_once __DIR__ . '/../lib/core.php';
$owner_id = scope_owner_id();

switch (action()) {

    /* ============ PROPERTY ============ */
    case 'list':
        $st = db()->prepare(
            'SELECT p.*, m.full_name AS manager_name,
                    (SELECT COUNT(*) FROM floor f WHERE f.property_id = p.property_id) AS floor_count,
                    (SELECT COUNT(*) FROM unit u JOIN floor f ON f.floor_id = u.floor_id
                      WHERE f.property_id = p.property_id) AS unit_count,
                    (SELECT COUNT(*) FROM unit u JOIN floor f ON f.floor_id = u.floor_id
                      WHERE f.property_id = p.property_id AND u.status = "occupied") AS occupied_count,
                    (SELECT COUNT(*) FROM unit u JOIN floor f ON f.floor_id = u.floor_id
                      WHERE f.property_id = p.property_id AND u.status = "vacant") AS vacant_count
               FROM property p
          LEFT JOIN manager m ON m.manager_id = p.manager_id
              WHERE p.owner_id = ?
           ORDER BY p.property_id'
        );
        $st->execute([$owner_id]);
        ok(['properties' => $st->fetchAll()]);
        break;

    case 'get':
        $p = assert_property((int) need('property_id'));

        $st = db()->prepare('SELECT * FROM floor WHERE property_id = ? ORDER BY floor_no');
        $st->execute([$p['property_id']]);
        $floors = $st->fetchAll();

        $st = db()->prepare(
            'SELECT u.*, f.floor_no,
                    l.lease_id, l.start_date, l.end_date, l.monthly_rent AS lease_rent,
                    t.tenant_id, t.full_name AS tenant_name, t.phone AS tenant_phone
               FROM unit u
               JOIN floor f ON f.floor_id = u.floor_id
          LEFT JOIN lease l  ON l.unit_id = u.unit_id AND l.status = "active"
          LEFT JOIN tenant t ON t.tenant_id = l.tenant_id
              WHERE f.property_id = ?
           ORDER BY f.floor_no, u.unit_no'
        );
        $st->execute([$p['property_id']]);
        $units = $st->fetchAll();

        ok(['property' => $p, 'floors' => $floors, 'units' => $units]);
        break;

    case 'create':
        require_owner();
        $name = need('name');

        /* subscription limit check */
        $st = db()->prepare(
            'SELECT pl.max_properties FROM subscription s
               JOIN subscription_plan pl ON pl.plan_id = s.plan_id
              WHERE s.owner_id = ? AND s.status = "active"
           ORDER BY s.subscription_id DESC LIMIT 1'
        );
        $st->execute([$owner_id]);
        $max = $st->fetchColumn();
        if ($max !== false) {
            $c = db()->prepare('SELECT COUNT(*) FROM property WHERE owner_id = ?');
            $c->execute([$owner_id]);
            if ($c->fetchColumn() >= (int) $max) {
                fail('Your plan allows only ' . $max . ' properties. Upgrade the plan to add more.');
            }
        }

        $st = db()->prepare(
            'INSERT INTO property (owner_id, manager_id, name, address, city, property_type, total_floors, year_built)
             VALUES (?,?,?,?,?,?,?,?)'
        );
        $mgr = inp('manager_id') ? (int) inp('manager_id') : null;
        $st->execute([
            $owner_id, $mgr, $name, inp('address', ''), inp('city', ''),
            inp('property_type', 'residential'), (int) inp('total_floors', 0),
            inp('year_built') ?: null,
        ]);
        $pid = (int) db()->lastInsertId();

        /* optionally build the floors + units in one go */
        $floors = (int) inp('auto_floors', 0);
        $perFloor = (int) inp('auto_units_per_floor', 0);
        $rent = (float) inp('auto_rent', 0);
        if ($floors > 0) {
            for ($f = 1; $f <= $floors; $f++) {
                $fs = db()->prepare('INSERT INTO floor (property_id, floor_no, description) VALUES (?,?,?)');
                $fs->execute([$pid, $f, 'Floor ' . $f]);
                $fid = (int) db()->lastInsertId();
                for ($u = 1; $u <= $perFloor; $u++) {
                    $label = $f . chr(64 + $u);           // 1A, 1B, 1C ...
                    $us = db()->prepare(
                        'INSERT INTO unit (floor_id, unit_no, unit_type, rent_amount, advance_amount, status)
                         VALUES (?,?,?,?,?, "vacant")'
                    );
                    $us->execute([$fid, $label, 'flat', $rent, $rent * 2]);
                }
            }
            db()->prepare('UPDATE property SET total_floors = ? WHERE property_id = ?')->execute([$floors, $pid]);
        }
        ok(['property_id' => $pid]);
        break;

    case 'update':
        $p = assert_property((int) need('property_id'));
        $st = db()->prepare(
            'UPDATE property SET name=?, address=?, city=?, property_type=?, total_floors=?, manager_id=?
              WHERE property_id=?'
        );
        $st->execute([
            inp('name', $p['name']), inp('address', $p['address']), inp('city', $p['city']),
            inp('property_type', $p['property_type']), (int) inp('total_floors', $p['total_floors']),
            inp('manager_id') !== null ? ((int) inp('manager_id') ?: null) : $p['manager_id'],
            $p['property_id'],
        ]);
        ok();
        break;

    case 'delete':
        require_owner();
        $p = assert_property((int) need('property_id'));
        db()->prepare('DELETE FROM property WHERE property_id = ?')->execute([$p['property_id']]);
        ok();
        break;

    /* ============ FLOOR ============ */
    case 'floor_create':
        $p = assert_property((int) need('property_id'));
        $st = db()->prepare('INSERT INTO floor (property_id, floor_no, description) VALUES (?,?,?)');
        try {
            $st->execute([$p['property_id'], (int) need('floor_no'), inp('description', '')]);
        } catch (PDOException $e) {
            fail('That floor number already exists in this building.');
        }
        db()->prepare('UPDATE property SET total_floors = (SELECT COUNT(*) FROM floor WHERE property_id=?) WHERE property_id=?')
            ->execute([$p['property_id'], $p['property_id']]);
        ok(['floor_id' => (int) db()->lastInsertId()]);
        break;

    case 'floor_delete':
        $fid = (int) need('floor_id');
        $st = db()->prepare(
            'SELECT f.* FROM floor f JOIN property p ON p.property_id = f.property_id
              WHERE f.floor_id = ? AND p.owner_id = ?'
        );
        $st->execute([$fid, $owner_id]);
        if (!$st->fetch()) fail('Floor not found.', 404);
        db()->prepare('DELETE FROM floor WHERE floor_id = ?')->execute([$fid]);
        ok();
        break;

    /* ============ UNIT ============ */
    case 'unit_create':
        $fid = (int) need('floor_id');
        $st = db()->prepare(
            'SELECT f.* FROM floor f JOIN property p ON p.property_id = f.property_id
              WHERE f.floor_id = ? AND p.owner_id = ?'
        );
        $st->execute([$fid, $owner_id]);
        if (!$st->fetch()) fail('Floor not found.', 404);

        $st = db()->prepare(
            'INSERT INTO unit (floor_id, unit_no, unit_type, bedrooms, size_sqft, rent_amount, advance_amount, status)
             VALUES (?,?,?,?,?,?,?,?)'
        );
        try {
            $st->execute([
                $fid, need('unit_no'), inp('unit_type', 'flat'), (int) inp('bedrooms', 0),
                (int) inp('size_sqft', 0), (float) inp('rent_amount', 0),
                (float) inp('advance_amount', 0), inp('status', 'vacant'),
            ]);
        } catch (PDOException $e) {
            fail('A unit with this number already exists on that floor.');
        }
        ok(['unit_id' => (int) db()->lastInsertId()]);
        break;

    case 'unit_update':
        $uid = (int) need('unit_id');
        $st = db()->prepare(
            'SELECT u.* FROM unit u JOIN floor f ON f.floor_id = u.floor_id
               JOIN property p ON p.property_id = f.property_id
              WHERE u.unit_id = ? AND p.owner_id = ?'
        );
        $st->execute([$uid, $owner_id]);
        $u = $st->fetch();
        if (!$u) fail('Unit not found.', 404);

        $st = db()->prepare(
            'UPDATE unit SET unit_no=?, unit_type=?, bedrooms=?, size_sqft=?, rent_amount=?, advance_amount=?, status=?
              WHERE unit_id=?'
        );
        $st->execute([
            inp('unit_no', $u['unit_no']), inp('unit_type', $u['unit_type']),
            (int) inp('bedrooms', $u['bedrooms']), (int) inp('size_sqft', $u['size_sqft']),
            (float) inp('rent_amount', $u['rent_amount']), (float) inp('advance_amount', $u['advance_amount']),
            inp('status', $u['status']), $uid,
        ]);
        ok();
        break;

    case 'unit_delete':
        $uid = (int) need('unit_id');
        $st = db()->prepare(
            'SELECT u.unit_id FROM unit u JOIN floor f ON f.floor_id = u.floor_id
               JOIN property p ON p.property_id = f.property_id
              WHERE u.unit_id = ? AND p.owner_id = ?'
        );
        $st->execute([$uid, $owner_id]);
        if (!$st->fetch()) fail('Unit not found.', 404);
        db()->prepare('DELETE FROM unit WHERE unit_id = ?')->execute([$uid]);
        ok();
        break;

    /* every vacant unit of this account - used by the lease form */
    case 'vacant_units':
        $st = db()->prepare(
            'SELECT u.unit_id, u.unit_no, u.rent_amount, u.advance_amount, f.floor_no, p.name AS property_name
               FROM unit u JOIN floor f ON f.floor_id = u.floor_id
               JOIN property p ON p.property_id = f.property_id
              WHERE p.owner_id = ? AND u.status = "vacant"
           ORDER BY p.name, f.floor_no, u.unit_no'
        );
        $st->execute([$owner_id]);
        ok(['units' => $st->fetchAll()]);
        break;

    default:
        fail('Unknown action.', 404);
}
