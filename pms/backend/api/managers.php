<?php
require_once __DIR__ . '/../lib/core.php';

switch (action()) {

    case 'list':
        $owner_id = scope_owner_id();
        $st = db()->prepare(
            'SELECT m.manager_id, m.full_name, m.email, m.phone, m.monthly_salary, m.hire_date, m.status,
                    (SELECT COUNT(*) FROM property p WHERE p.manager_id = m.manager_id) AS property_count
               FROM manager m WHERE m.owner_id = ? ORDER BY m.full_name'
        );
        $st->execute([$owner_id]);
        ok(['managers' => $st->fetchAll()]);
        break;

    /* the owner creates the manager login here */
    case 'create':
        $u = require_owner();
        $email = strtolower(trim(need('email')));
        $pass  = need('password');
        if (strlen($pass) < 6) fail('Password must be at least 6 characters.');

        $st = db()->prepare('SELECT manager_id FROM manager WHERE email = ?');
        $st->execute([$email]);
        if ($st->fetch()) fail('A manager with this email already exists.');

        $st = db()->prepare(
            'INSERT INTO manager (owner_id, full_name, email, password_hash, phone, nid, monthly_salary, hire_date)
             VALUES (?,?,?,?,?,?,?,?)'
        );
        $st->execute([
            $u['id'], need('full_name'), $email, password_hash($pass, PASSWORD_BCRYPT),
            inp('phone', ''), inp('nid', ''), (float) inp('monthly_salary', 0),
            inp('hire_date', date('Y-m-d')),
        ]);
        db()->prepare('UPDATE owner SET self_managed = 0 WHERE owner_id = ?')->execute([$u['id']]);
        ok(['manager_id' => (int) db()->lastInsertId()]);
        break;

    case 'update':
        $u  = require_owner();
        $id = (int) need('manager_id');
        $st = db()->prepare('SELECT * FROM manager WHERE manager_id = ? AND owner_id = ?');
        $st->execute([$id, $u['id']]);
        $m = $st->fetch();
        if (!$m) fail('Manager not found.', 404);

        db()->prepare('UPDATE manager SET full_name=?, phone=?, monthly_salary=?, status=? WHERE manager_id=?')
            ->execute([
                inp('full_name', $m['full_name']), inp('phone', $m['phone']),
                (float) inp('monthly_salary', $m['monthly_salary']), inp('status', $m['status']), $id,
            ]);

        if (inp('password')) {
            if (strlen(inp('password')) < 6) fail('Password must be at least 6 characters.');
            db()->prepare('UPDATE manager SET password_hash = ? WHERE manager_id = ?')
                ->execute([password_hash(inp('password'), PASSWORD_BCRYPT), $id]);
        }
        ok();
        break;

    case 'delete':
        $u  = require_owner();
        $id = (int) need('manager_id');
        $st = db()->prepare('SELECT manager_id FROM manager WHERE manager_id = ? AND owner_id = ?');
        $st->execute([$id, $u['id']]);
        if (!$st->fetch()) fail('Manager not found.', 404);
        db()->prepare('DELETE FROM manager WHERE manager_id = ?')->execute([$id]);
        ok();
        break;

    /* put a manager in charge of one building (or remove him) */
    case 'assign':
        require_owner();
        $p   = assert_property((int) need('property_id'));
        $mid = inp('manager_id') ? (int) inp('manager_id') : null;
        if ($mid) {
            $st = db()->prepare('SELECT manager_id FROM manager WHERE manager_id = ? AND owner_id = ?');
            $st->execute([$mid, scope_owner_id()]);
            if (!$st->fetch()) fail('Manager not found.', 404);
        }
        db()->prepare('UPDATE property SET manager_id = ? WHERE property_id = ?')->execute([$mid, $p['property_id']]);
        ok();
        break;

    default:
        fail('Unknown action.', 404);
}
