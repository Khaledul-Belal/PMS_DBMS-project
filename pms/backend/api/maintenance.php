<?php
require_once __DIR__ . '/../lib/core.php';
$owner_id = scope_owner_id();

switch (action()) {

    case 'list':
        $sql = 'SELECT mr.*, p.name AS property_name, u.unit_no
                  FROM maintenance_request mr
                  JOIN property p ON p.property_id = mr.property_id
             LEFT JOIN unit u ON u.unit_id = mr.unit_id
                 WHERE p.owner_id = ?';
        $args = [$owner_id];
        if ($s = inp('status')) { $sql .= ' AND mr.status = ?'; $args[] = $s; }
        $sql .= ' ORDER BY FIELD(mr.status,"pending","in_progress","done"), mr.request_date DESC';
        $st = db()->prepare($sql);
        $st->execute($args);
        ok(['requests' => $st->fetchAll()]);
        break;

    case 'create':
        assert_property((int) need('property_id'));
        $st = db()->prepare(
            'INSERT INTO maintenance_request (property_id, unit_id, title, description, priority, request_date, status, vendor_name, cost)
             VALUES (?,?,?,?,?,?,?,?,?)'
        );
        $st->execute([
            (int) need('property_id'), inp('unit_id') ? (int) inp('unit_id') : null,
            need('title'), inp('description', ''), inp('priority', 'medium'),
            inp('request_date', date('Y-m-d')), inp('status', 'pending'),
            inp('vendor_name', ''), (float) inp('cost', 0),
        ]);
        ok(['request_id' => (int) db()->lastInsertId()]);
        break;
    case 'update':
        $id = (int) need('request_id');
        $st = db()->prepare(
            'SELECT mr.* FROM maintenance_request mr JOIN property p ON p.property_id = mr.property_id
              WHERE mr.request_id = ? AND p.owner_id = ?'
        );
        $st->execute([$id, $owner_id]);
        $mr = $st->fetch();
        if (!$mr) fail('Request not found.', 404);

        $status = inp('status', $mr['status']);
        $cost   = (float) inp('cost', $mr['cost']);
        $vendor = inp('vendor_name', $mr['vendor_name']);
        $resolved = $status === 'done' ? inp('resolved_date', date('Y-m-d')) : null;
        $expense_id = $mr['expense_id'];

        if ($status === 'done' && $cost > 0 && !$expense_id) {
            $cat = db()->query('SELECT category_id FROM expense_category WHERE name = "Others"')->fetchColumn();
            $cat = (int) inp('category_id', $cat ?: 1);
            $ins = db()->prepare(
                'INSERT INTO expense (property_id, category_id, unit_id, title, amount, expense_date, billing_month, vendor_name, paid_by, note)
                 VALUES (?,?,?,?,?,?,?,?,"manager","Auto-created from maintenance request")'
            );
            $ins->execute([
                $mr['property_id'], $cat, $mr['unit_id'], 'Maintenance: ' . $mr['title'],
                $cost, $resolved, substr($resolved, 0, 7), $vendor,
            ]);
            $expense_id = (int) db()->lastInsertId();
        }

        db()->prepare(
            'UPDATE maintenance_request SET status=?, cost=?, vendor_name=?, resolved_date=?, expense_id=? WHERE request_id=?'
        )->execute([$status, $cost, $vendor, $resolved, $expense_id, $id]);
        ok(['expense_id' => $expense_id]);
        break;

    case 'delete':
        $id = (int) need('request_id');
        $st = db()->prepare(
            'SELECT mr.request_id FROM maintenance_request mr JOIN property p ON p.property_id = mr.property_id
              WHERE mr.request_id = ? AND p.owner_id = ?'
        );
        $st->execute([$id, $owner_id]);
        if (!$st->fetch()) fail('Request not found.', 404);
        db()->prepare('DELETE FROM maintenance_request WHERE request_id = ?')->execute([$id]);
        ok();
        break;

    default:
        fail('Unknown action.', 404);
}
