<?php
require_once __DIR__ . '/../lib/core.php';
$owner_id = scope_owner_id();
$user     = current_user();

switch (action()) {

    case 'list':
        $month = inp('month', '');
        $pid   = (int) inp('property_id', 0);

        $sql = 'SELECT rp.*, t.full_name AS tenant_name, u.unit_no, f.floor_no,
                       p.name AS property_name, p.property_id, m.full_name AS collector
                  FROM rent_payment rp
                  JOIN lease l  ON l.lease_id = rp.lease_id
                  JOIN tenant t ON t.tenant_id = l.tenant_id
                  JOIN unit u   ON u.unit_id = l.unit_id
                  JOIN floor f  ON f.floor_id = u.floor_id
                  JOIN property p ON p.property_id = f.property_id
             LEFT JOIN manager m ON m.manager_id = rp.collected_by
                 WHERE p.owner_id = ?';
        $args = [$owner_id];
        if ($month) { $sql .= ' AND rp.billing_month = ?'; $args[] = $month; }
        if ($pid)   { $sql .= ' AND p.property_id = ?';    $args[] = $pid; }
        $sql .= ' ORDER BY rp.billing_month DESC, p.name, f.floor_no, u.unit_no';

        $st = db()->prepare($sql);
        $st->execute($args);
        ok(['payments' => $st->fetchAll()]);
        break;

    /* create the rent invoice of a month for every active lease */
    case 'generate':
        $month = inp('month', this_month());
        $st = db()->prepare(
            'SELECT l.lease_id, l.monthly_rent FROM lease l
               JOIN unit u ON u.unit_id = l.unit_id
               JOIN floor f ON f.floor_id = u.floor_id
               JOIN property p ON p.property_id = f.property_id
              WHERE p.owner_id = ? AND l.status = "active"'
        );
        $st->execute([$owner_id]);
        $made = 0;
        foreach ($st->fetchAll() as $l) {
            $ins = db()->prepare(
                'INSERT IGNORE INTO rent_payment (lease_id, billing_month, amount_due, status)
                 VALUES (?,?,?, "due")'
            );
            $ins->execute([$l['lease_id'], $month, $l['monthly_rent']]);
            $made += $ins->rowCount();
        }
        ok(['created' => $made, 'month' => $month]);
        break;

    /* record a rent collection */
    case 'pay':
        $id   = (int) need('payment_id');
        $paid = (float) need('amount_paid');

        $st = db()->prepare(
            'SELECT rp.* FROM rent_payment rp
               JOIN lease l ON l.lease_id = rp.lease_id
               JOIN unit u  ON u.unit_id = l.unit_id
               JOIN floor f ON f.floor_id = u.floor_id
               JOIN property p ON p.property_id = f.property_id
              WHERE rp.payment_id = ? AND p.owner_id = ?'
        );
        $st->execute([$id, $owner_id]);
        $row = $st->fetch();
        if (!$row) fail('Payment record not found.', 404);

        $status = $paid <= 0 ? 'due' : ($paid >= (float) $row['amount_due'] ? 'paid' : 'partial');
        $collector = $user['role'] === 'manager' ? $user['id'] : null;

        db()->prepare(
            'UPDATE rent_payment SET amount_paid=?, payment_date=?, payment_method=?, status=?, collected_by=?
              WHERE payment_id=?'
        )->execute([$paid, inp('payment_date', date('Y-m-d')), inp('payment_method', 'cash'), $status, $collector, $id]);
        ok(['status' => $status]);
        break;

    case 'delete':
        $id = (int) need('payment_id');
        $st = db()->prepare(
            'SELECT rp.payment_id FROM rent_payment rp
               JOIN lease l ON l.lease_id = rp.lease_id
               JOIN unit u  ON u.unit_id = l.unit_id
               JOIN floor f ON f.floor_id = u.floor_id
               JOIN property p ON p.property_id = f.property_id
              WHERE rp.payment_id = ? AND p.owner_id = ?'
        );
        $st->execute([$id, $owner_id]);
        if (!$st->fetch()) fail('Payment record not found.', 404);
        db()->prepare('DELETE FROM rent_payment WHERE payment_id = ?')->execute([$id]);
        ok();
        break;

    default:
        fail('Unknown action.', 404);
}
