<?php
require_once __DIR__ . '/../lib/core.php';

switch (action()) {
    case 'signup':
        $name  = need('full_name');
        $email = strtolower(trim(need('email')));
        $pass  = need('password');
        $phone = inp('phone', '');
        $nid   = inp('nid', '');
        $addr  = inp('address', '');
        $self  = (int) inp('self_managed', 1);
        $plan  = (int) inp('plan_id', 1);

        if (strlen($pass) < 6) fail('Password must be at least 6 characters.');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Please enter a valid email address.');

        $st = db()->prepare('SELECT owner_id FROM owner WHERE email = ?');
        $st->execute([$email]);
        if ($st->fetch()) fail('This email is already registered.');

        $st = db()->prepare(
            'INSERT INTO owner (full_name, email, password_hash, phone, nid, address, self_managed)
             VALUES (?,?,?,?,?,?,?)'
        );
        $st->execute([$name, $email, password_hash($pass, PASSWORD_BCRYPT), $phone, $nid, $addr, $self]);
        $owner_id = (int) db()->lastInsertId();

        
        $p = db()->prepare('SELECT * FROM subscription_plan WHERE plan_id = ?');
        $p->execute([$plan]);
        $planRow = $p->fetch() ?: null;
        if ($planRow) {
            $days = (int) $planRow['duration_days'];
            $s = db()->prepare(
                'INSERT INTO subscription (owner_id, plan_id, start_date, end_date, amount_paid, trx_id, status)
                 VALUES (?,?,CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), ?, ?, "active")'
            );
            $s->execute([$owner_id, $plan, $days, $planRow['price'], 'DEMO' . strtoupper(substr(md5(uniqid()), 0, 6))]);
        }

        $_SESSION['user'] = [
            'id' => $owner_id, 'owner_id' => $owner_id, 'role' => 'owner',
            'name' => $name, 'email' => $email,
        ];
        ok(['user' => $_SESSION['user']]);
        break;

   
    case 'login':
        $email = strtolower(trim(need('email')));
        $pass  = need('password');
        $role  = inp('role', 'owner');   

        if ($role === 'admin') {
            $st = db()->prepare('SELECT * FROM admin WHERE email = ?');
            $st->execute([$email]);
            $row = $st->fetch();
            if (!$row || !password_verify($pass, $row['password_hash'])) fail('Wrong email or password.', 401);
            $_SESSION['user'] = [
                'id' => (int) $row['admin_id'], 'owner_id' => 0, 'role' => 'admin',
                'name' => $row['full_name'], 'email' => $row['email'],
            ];
        } elseif ($role === 'manager') {
            $st = db()->prepare('SELECT * FROM manager WHERE email = ?');
            $st->execute([$email]);
            $row = $st->fetch();
            if (!$row || !password_verify($pass, $row['password_hash'])) fail('Wrong email or password.', 401);
            if ($row['status'] !== 'active') fail('This manager account is inactive.', 403);
            $_SESSION['user'] = [
                'id' => (int) $row['manager_id'], 'owner_id' => (int) $row['owner_id'], 'role' => 'manager',
                'name' => $row['full_name'], 'email' => $row['email'],
            ];
        } else {
            $st = db()->prepare('SELECT * FROM owner WHERE email = ?');
            $st->execute([$email]);
            $row = $st->fetch();
            if (!$row || !password_verify($pass, $row['password_hash'])) fail('Wrong email or password.', 401);
            if ($row['status'] === 'blocked') fail('This account has been blocked by the admin.', 403);
            $_SESSION['user'] = [
                'id' => (int) $row['owner_id'], 'owner_id' => (int) $row['owner_id'], 'role' => 'owner',
                'name' => $row['full_name'], 'email' => $row['email'],
            ];
        }
        ok(['user' => $_SESSION['user']]);
        break;

    
    case 'me':
        $u = current_user();
        if (!$u) fail('Not logged in.', 401);

        $extra = [];
        if ($u['role'] === 'owner') {
            $st = db()->prepare(
                'SELECT s.*, p.plan_name, p.max_properties
                   FROM subscription s JOIN subscription_plan p ON p.plan_id = s.plan_id
                  WHERE s.owner_id = ? ORDER BY s.subscription_id DESC LIMIT 1'
            );
            $st->execute([$u['id']]);
            $extra['subscription'] = $st->fetch() ?: null;
        }
        ok(['user' => $u] + $extra);
        break;

    case 'logout':
        session_destroy();
        ok();
        break;

    case 'plans':
        ok(['plans' => db()->query('SELECT * FROM subscription_plan ORDER BY price')->fetchAll()]);
        break;

    default:
        fail('Unknown action.', 404);
}
