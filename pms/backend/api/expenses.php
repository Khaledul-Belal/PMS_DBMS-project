<?php
require_once __DIR__ . '/../lib/core.php';
$owner_id = scope_owner_id();
$user     = current_user();

switch (action()) {

    case 'categories':
        ok(['categories' => db()->query('SELECT * FROM expense_category ORDER BY category_id')->fetchAll()]);
        break;

    case 'list':
        $month = inp('month', '');
        $pid   = (int) inp('property_id', 0);

        $sql = 'SELECT e.*, c.name AS category_name, p.name AS property_name, u.unit_no
                  FROM expense e
                  JOIN expense_category c ON c.category_id = e.category_id
                  JOIN property p ON p.property_id = e.property_id
             LEFT JOIN unit u ON u.unit_id = e.unit_id
                 WHERE p.owner_id = ?';
        $args = [$owner_id];
        if ($month) { $sql .= ' AND e.billing_month = ?'; $args[] = $month; }
        if ($pid)   { $sql .= ' AND e.property_id = ?';   $args[] = $pid; }
        $sql .= ' ORDER BY e.expense_date DESC, e.expense_id DESC';

        $st = db()->prepare($sql);
        $st->execute($args);
        ok(['expenses' => $st->fetchAll()]);
        break;

    case 'create':
        $pid = (int) need('property_id');
        assert_property($pid);
        $date = inp('expense_date', date('Y-m-d'));

        $st = db()->prepare(
            'INSERT INTO expense (property_id, category_id, unit_id, title, amount, expense_date, billing_month, vendor_name, paid_by, note)
             VALUES (?,?,?,?,?,?,?,?,?,?)'
        );
        $st->execute([
            $pid, (int) need('category_id'), inp('unit_id') ? (int) inp('unit_id') : null,
            need('title'), (float) need('amount'), $date,
            inp('billing_month', substr($date, 0, 7)), inp('vendor_name', ''),
            $user['role'] === 'manager' ? 'manager' : 'owner', inp('note', ''),
        ]);
        ok(['expense_id' => (int) db()->lastInsertId()]);
        break;

    case 'delete':
        $id = (int) need('expense_id');
        $st = db()->prepare(
            'SELECT e.expense_id FROM expense e JOIN property p ON p.property_id = e.property_id
              WHERE e.expense_id = ? AND p.owner_id = ?'
        );
        $st->execute([$id, $owner_id]);
        if (!$st->fetch()) fail('Expense not found.', 404);
        db()->prepare('DELETE FROM expense WHERE expense_id = ?')->execute([$id]);
        ok();
        break;

    default:
        fail('Unknown action.', 404);
}
