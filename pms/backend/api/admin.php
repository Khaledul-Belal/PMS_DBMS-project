<?php
require_once __DIR__ . '/../lib/core.php';
require_admin();

switch (action()) {

    case 'stats':
        $one = fn($sql) => db()->query($sql)->fetchColumn();

        $revenueByPlan = db()->query(
            'SELECT pl.plan_name, COUNT(s.subscription_id) AS subscribers, COALESCE(SUM(s.amount_paid),0) AS revenue
               FROM subscription_plan pl
          LEFT JOIN subscription s ON s.plan_id = pl.plan_id
           GROUP BY pl.plan_id ORDER BY pl.price'
        )->fetchAll();

        $recent = db()->query(
            'SELECT o.owner_id, o.full_name, o.email, o.created_at, o.status
               FROM owner o ORDER BY o.owner_id DESC LIMIT 5'
        )->fetchAll();

        ok([
            'stats' => [
                'owners'        => (int) $one('SELECT COUNT(*) FROM owner'),
                'active_owners' => (int) $one('SELECT COUNT(*) FROM owner WHERE status="active"'),
                'managers'      => (int) $one('SELECT COUNT(*) FROM manager'),
                'properties'    => (int) $one('SELECT COUNT(*) FROM property'),
                'units'         => (int) $one('SELECT COUNT(*) FROM unit'),
                'tenants'       => (int) $one('SELECT COUNT(*) FROM tenant'),
                'active_subs'   => (int) $one('SELECT COUNT(*) FROM subscription WHERE status="active" AND end_date >= CURDATE()'),
                'revenue'       => (float) $one('SELECT COALESCE(SUM(amount_paid),0) FROM subscription'),
            ],
            'revenue_by_plan' => $revenueByPlan,
            'recent_owners'   => $recent,
        ]);
        break;

    case 'owners':
        $rows = db()->query(
            'SELECT o.owner_id, o.full_name, o.email, o.phone, o.status, o.created_at,
                    pl.plan_name, s.end_date, s.status AS sub_status,
                    (SELECT COUNT(*) FROM property p WHERE p.owner_id=o.owner_id) AS properties,
                    (SELECT COUNT(*) FROM manager m WHERE m.owner_id=o.owner_id) AS managers,
                    (SELECT COUNT(*) FROM tenant t WHERE t.owner_id=o.owner_id) AS tenants
               FROM owner o
          LEFT JOIN subscription s ON s.subscription_id =
                   (SELECT MAX(s2.subscription_id) FROM subscription s2 WHERE s2.owner_id=o.owner_id)
          LEFT JOIN subscription_plan pl ON pl.plan_id = s.plan_id
           ORDER BY o.owner_id DESC'
        )->fetchAll();
        ok(['owners' => $rows]);
        break;
        
    case 'owner_delete':
        $id = (int) need('owner_id');
        db()->prepare('DELETE FROM owner WHERE owner_id = ?')->execute([$id]);
        ok();
        break;

    case 'owner_toggle':
        $id = (int) need('owner_id');
        $st = db()->prepare('SELECT status FROM owner WHERE owner_id = ?');
        $st->execute([$id]);
        $cur = $st->fetchColumn();
        if ($cur === false) fail('Owner not found.', 404);
        $new = $cur === 'active' ? 'blocked' : 'active';
        db()->prepare('UPDATE owner SET status = ? WHERE owner_id = ?')->execute([$new, $id]);
        ok(['status' => $new]);
        break;

    case 'owner_detail':
        $id = (int) need('owner_id');
        $st = db()->prepare('SELECT owner_id, full_name, email, phone, address, status, created_at FROM owner WHERE owner_id = ?');
        $st->execute([$id]);
        $o = $st->fetch();
        if (!$o) fail('Owner not found.', 404);

        $st = db()->prepare('SELECT property_id, name, address, total_floors FROM property WHERE owner_id = ?');
        $st->execute([$id]);
        $props = $st->fetchAll();

        $st = db()->prepare(
            'SELECT s.*, pl.plan_name FROM subscription s JOIN subscription_plan pl ON pl.plan_id=s.plan_id
              WHERE s.owner_id = ? ORDER BY s.subscription_id DESC'
        );
        $st->execute([$id]);
        ok(['owner' => $o, 'properties' => $props, 'subscriptions' => $st->fetchAll()]);
        break;

    case 'plans':
        ok(['plans' => db()->query(
            'SELECT pl.*, (SELECT COUNT(*) FROM subscription s WHERE s.plan_id=pl.plan_id) AS subscribers
               FROM subscription_plan pl ORDER BY pl.price'
        )->fetchAll()]);
        break;

    case 'plan_save':
        $id = (int) inp('plan_id', 0);
        if ($id) {
            db()->prepare('UPDATE subscription_plan SET plan_name=?, price=?, duration_days=?, max_properties=?, features=? WHERE plan_id=?')
                ->execute([need('plan_name'), (float) need('price'), (int) inp('duration_days', 30),
                           (int) inp('max_properties', 3), inp('features', ''), $id]);
        } else {
            db()->prepare('INSERT INTO subscription_plan (plan_name, price, duration_days, max_properties, features) VALUES (?,?,?,?,?)')
                ->execute([need('plan_name'), (float) need('price'), (int) inp('duration_days', 30),
                           (int) inp('max_properties', 3), inp('features', '')]);
        }
        ok();
        break;

    case 'subscriptions':
        ok(['subscriptions' => db()->query(
            'SELECT s.*, o.full_name AS owner_name, o.email, pl.plan_name
               FROM subscription s
               JOIN owner o ON o.owner_id = s.owner_id
               JOIN subscription_plan pl ON pl.plan_id = s.plan_id
           ORDER BY s.subscription_id DESC'
        )->fetchAll()]);
        break;

    default:
        fail('Unknown action.', 404);
}
