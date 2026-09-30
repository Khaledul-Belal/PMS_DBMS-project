<?php
require_once __DIR__ . '/../lib/core.php';
$owner_id = scope_owner_id();

switch (action()) {
    case 'summary':
        $month = inp('month', this_month());

        $q = function ($sql, $args = []) {
            $st = db()->prepare($sql);
            $st->execute($args);
            return $st->fetchColumn();
        };

        $properties = (int) $q('SELECT COUNT(*) FROM property WHERE owner_id = ?', [$owner_id]);
        $units = (int) $q(
            'SELECT COUNT(*) FROM unit u JOIN floor f ON f.floor_id=u.floor_id
               JOIN property p ON p.property_id=f.property_id WHERE p.owner_id = ?', [$owner_id]);
        $occupied = (int) $q(
            'SELECT COUNT(*) FROM unit u JOIN floor f ON f.floor_id=u.floor_id
               JOIN property p ON p.property_id=f.property_id WHERE p.owner_id=? AND u.status="occupied"', [$owner_id]);
        $vacant = (int) $q(
            'SELECT COUNT(*) FROM unit u JOIN floor f ON f.floor_id=u.floor_id
               JOIN property p ON p.property_id=f.property_id WHERE p.owner_id=? AND u.status="vacant"', [$owner_id]);
        $tenants = (int) $q('SELECT COUNT(*) FROM tenant WHERE owner_id = ?', [$owner_id]);

        $rentCollected = (float) $q(
            'SELECT COALESCE(SUM(rp.amount_paid),0) FROM rent_payment rp
               JOIN lease l ON l.lease_id=rp.lease_id JOIN unit u ON u.unit_id=l.unit_id
               JOIN floor f ON f.floor_id=u.floor_id JOIN property p ON p.property_id=f.property_id
              WHERE p.owner_id=? AND rp.billing_month=?', [$owner_id, $month]);
        $rentDue = (float) $q(
            'SELECT COALESCE(SUM(rp.amount_due - rp.amount_paid),0) FROM rent_payment rp
               JOIN lease l ON l.lease_id=rp.lease_id JOIN unit u ON u.unit_id=l.unit_id
               JOIN floor f ON f.floor_id=u.floor_id JOIN property p ON p.property_id=f.property_id
              WHERE p.owner_id=? AND rp.billing_month=? AND rp.status<>"paid"', [$owner_id, $month]);
        $expense = (float) $q(
            'SELECT COALESCE(SUM(e.amount),0) FROM expense e JOIN property p ON p.property_id=e.property_id
              WHERE p.owner_id=? AND e.billing_month=?', [$owner_id, $month]);
        $salary = (float) $q(
            'SELECT COALESCE(SUM(sp.amount),0) FROM salary_payment sp JOIN staff s ON s.staff_id=sp.staff_id
               JOIN property p ON p.property_id=s.property_id
              WHERE p.owner_id=? AND sp.salary_month=?', [$owner_id, $month]);
        $openRequests = (int) $q(
            'SELECT COUNT(*) FROM maintenance_request mr JOIN property p ON p.property_id=mr.property_id
              WHERE p.owner_id=? AND mr.status<>"done"', [$owner_id]);

        /* per building breakdown for this month */
        $st = db()->prepare(
            'SELECT p.property_id, p.name,
                    (SELECT COUNT(*) FROM unit u JOIN floor f ON f.floor_id=u.floor_id
                      WHERE f.property_id=p.property_id) AS units,
                    (SELECT COUNT(*) FROM unit u JOIN floor f ON f.floor_id=u.floor_id
                      WHERE f.property_id=p.property_id AND u.status="occupied") AS occupied,
                    (SELECT COALESCE(SUM(rp.amount_paid),0) FROM rent_payment rp
                       JOIN lease l ON l.lease_id=rp.lease_id JOIN unit u ON u.unit_id=l.unit_id
                       JOIN floor f ON f.floor_id=u.floor_id
                      WHERE f.property_id=p.property_id AND rp.billing_month=?) AS income,
                    (SELECT COALESCE(SUM(e.amount),0) FROM expense e
                      WHERE e.property_id=p.property_id AND e.billing_month=?) AS expense,
                    (SELECT COALESCE(SUM(sp.amount),0) FROM salary_payment sp
                       JOIN staff s ON s.staff_id=sp.staff_id
                      WHERE s.property_id=p.property_id AND sp.salary_month=?) AS salary
               FROM property p WHERE p.owner_id=? ORDER BY p.name'
        );
        $st->execute([$month, $month, $month, $owner_id]);
        $byProperty = $st->fetchAll();

        ok([
            'month' => $month,
            'cards' => [
                'properties' => $properties, 'units' => $units, 'occupied' => $occupied,
                'vacant' => $vacant, 'tenants' => $tenants,
                'rent_collected' => $rentCollected, 'rent_due' => $rentDue,
                'expense' => $expense, 'salary' => $salary,
                'profit' => $rentCollected - $expense - $salary,
                'open_requests' => $openRequests,
                'occupancy_rate' => $units ? round($occupied * 100 / $units, 1) : 0,
            ],
            'by_property' => $byProperty,
        ]);
        break;

    /* ---------- last 6 months income / expense trend ---------- */
    case 'trend':
        $months = [];
        for ($i = 5; $i >= 0; $i--) $months[] = date('Y-m', strtotime("-$i month"));
        $out = [];
        foreach ($months as $m) {
            $st = db()->prepare(
                'SELECT COALESCE(SUM(rp.amount_paid),0) FROM rent_payment rp
                   JOIN lease l ON l.lease_id=rp.lease_id JOIN unit u ON u.unit_id=l.unit_id
                   JOIN floor f ON f.floor_id=u.floor_id JOIN property p ON p.property_id=f.property_id
                  WHERE p.owner_id=? AND rp.billing_month=?'
            );
            $st->execute([$owner_id, $m]);
            $inc = (float) $st->fetchColumn();

            $st = db()->prepare(
                'SELECT COALESCE(SUM(e.amount),0) FROM expense e JOIN property p ON p.property_id=e.property_id
                  WHERE p.owner_id=? AND e.billing_month=?'
            );
            $st->execute([$owner_id, $m]);
            $exp = (float) $st->fetchColumn();

            $st = db()->prepare(
                'SELECT COALESCE(SUM(sp.amount),0) FROM salary_payment sp JOIN staff s ON s.staff_id=sp.staff_id
                   JOIN property p ON p.property_id=s.property_id
                  WHERE p.owner_id=? AND sp.salary_month=?'
            );
            $st->execute([$owner_id, $m]);
            $sal = (float) $st->fetchColumn();

            $out[] = ['month' => $m, 'income' => $inc, 'expense' => $exp + $sal, 'profit' => $inc - $exp - $sal];
        }
        ok(['trend' => $out]);
        break;

    /* ---------- detailed report of one building for one month ---------- */
    case 'report':
        $pid   = (int) need('property_id');
        $month = inp('month', this_month());
        $p = assert_property($pid);

        $st = db()->prepare(
            'SELECT rp.*, t.full_name AS tenant_name, u.unit_no, f.floor_no
               FROM rent_payment rp
               JOIN lease l ON l.lease_id=rp.lease_id
               JOIN tenant t ON t.tenant_id=l.tenant_id
               JOIN unit u ON u.unit_id=l.unit_id
               JOIN floor f ON f.floor_id=u.floor_id
              WHERE f.property_id=? AND rp.billing_month=?
           ORDER BY f.floor_no, u.unit_no'
        );
        $st->execute([$pid, $month]);
        $rents = $st->fetchAll();

        $st = db()->prepare(
            'SELECT e.*, c.name AS category_name FROM expense e
               JOIN expense_category c ON c.category_id=e.category_id
              WHERE e.property_id=? AND e.billing_month=? ORDER BY e.expense_date'
        );
        $st->execute([$pid, $month]);
        $expenses = $st->fetchAll();

        $st = db()->prepare(
            'SELECT sp.*, s.full_name, s.role FROM salary_payment sp
               JOIN staff s ON s.staff_id=sp.staff_id
              WHERE s.property_id=? AND sp.salary_month=?'
        );
        $st->execute([$pid, $month]);
        $salaries = $st->fetchAll();

        $income      = array_sum(array_column($rents, 'amount_paid'));
        $due         = array_sum(array_map(fn($r) => $r['amount_due'] - $r['amount_paid'], $rents));
        $expenseSum  = array_sum(array_column($expenses, 'amount'));
        $salarySum   = array_sum(array_column($salaries, 'amount'));

        ok([
            'property' => $p, 'month' => $month,
            'rents' => $rents, 'expenses' => $expenses, 'salaries' => $salaries,
            'totals' => [
                'income' => $income, 'due' => $due, 'expense' => $expenseSum,
                'salary' => $salarySum, 'profit' => $income - $expenseSum - $salarySum,
            ],
        ]);
        break;

    default:
        fail('Unknown action.', 404);
}
