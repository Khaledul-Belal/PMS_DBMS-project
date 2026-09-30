<?php
require_once __DIR__ . '/../lib/core.php';
$owner_id = scope_owner_id();

switch (action()) {

    case 'list':
        $st = db()->prepare(
            'SELECT s.*, p.name AS property_name FROM staff s
               JOIN property p ON p.property_id = s.property_id
              WHERE p.owner_id = ? ORDER BY p.name, s.full_name'
        );
        $st->execute([$owner_id]);
        ok(['staff' => $st->fetchAll()]);
        break;

    case 'create':
        assert_property((int) need('property_id'));
        $st = db()->prepare(
            'INSERT INTO staff (property_id, full_name, role, phone, nid, monthly_salary, join_date)
             VALUES (?,?,?,?,?,?,?)'
        );
        $st->execute([
            (int) need('property_id'), need('full_name'), inp('role', 'caretaker'),
            inp('phone', ''), inp('nid', ''), (float) inp('monthly_salary', 0),
            inp('join_date', date('Y-m-d')),
        ]);
        ok(['staff_id' => (int) db()->lastInsertId()]);
        break;

    case 'delete':
        $id = (int) need('staff_id');
        $st = db()->prepare(
            'SELECT s.staff_id FROM staff s JOIN property p ON p.property_id = s.property_id
              WHERE s.staff_id = ? AND p.owner_id = ?'
        );
        $st->execute([$id, $owner_id]);
        if (!$st->fetch()) fail('Staff not found.', 404);
        db()->prepare('DELETE FROM staff WHERE staff_id = ?')->execute([$id]);
        ok();
        break;

    /* ---------- salaries ---------- */
    case 'salary_list':
        $month = inp('month', '');
        $sql = 'SELECT sp.*, s.full_name, s.role, p.name AS property_name
                  FROM salary_payment sp
                  JOIN staff s ON s.staff_id = sp.staff_id
                  JOIN property p ON p.property_id = s.property_id
                 WHERE p.owner_id = ?';
        $args = [$owner_id];
        if ($month) { $sql .= ' AND sp.salary_month = ?'; $args[] = $month; }
        $sql .= ' ORDER BY sp.salary_month DESC, s.full_name';
        $st = db()->prepare($sql);
        $st->execute($args);
        ok(['salaries' => $st->fetchAll()]);
        break;

    /* create this month's salary sheet for every active staff member */
    case 'salary_generate':
        $month = inp('month', this_month());
        $st = db()->prepare(
            'SELECT s.staff_id, s.monthly_salary FROM staff s
               JOIN property p ON p.property_id = s.property_id
              WHERE p.owner_id = ? AND s.status = "active"'
        );
        $st->execute([$owner_id]);
        $made = 0;
        foreach ($st->fetchAll() as $s) {
            $ins = db()->prepare(
                'INSERT IGNORE INTO salary_payment (staff_id, salary_month, amount, status) VALUES (?,?,?, "due")'
            );
            $ins->execute([$s['staff_id'], $month, $s['monthly_salary']]);
            $made += $ins->rowCount();
        }
        ok(['created' => $made, 'month' => $month]);
        break;

    case 'salary_pay':
        $id = (int) need('salary_id');
        $st = db()->prepare(
            'SELECT sp.salary_id FROM salary_payment sp
               JOIN staff s ON s.staff_id = sp.staff_id
               JOIN property p ON p.property_id = s.property_id
              WHERE sp.salary_id = ? AND p.owner_id = ?'
        );
        $st->execute([$id, $owner_id]);
        if (!$st->fetch()) fail('Salary record not found.', 404);
        db()->prepare('UPDATE salary_payment SET status = "paid", paid_date = ? WHERE salary_id = ?')
            ->execute([inp('paid_date', date('Y-m-d')), $id]);
        ok();
        break;

    default:
        fail('Unknown action.', 404);
}
