<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';
function ok($data = [])
{
    echo json_encode(['ok' => true] + (is_array($data) ? $data : ['data' => $data]));
    exit;
}

function fail($message, $code = 400)
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message]);
    exit;
}
function body()
{
    static $b = null;
    if ($b === null) {
        $raw = file_get_contents('php://input');
        $b   = json_decode($raw, true);
        if (!is_array($b)) $b = $_POST;
    }
    return $b;
}

function inp($key, $default = null)
{
    $b = body();
    if (isset($b[$key]) && $b[$key] !== '') return $b[$key];
    if (isset($_GET[$key]) && $_GET[$key] !== '') return $_GET[$key];
    return $default;
}

function need($key)
{
    $v = inp($key);
    if ($v === null || $v === '') fail("Field '$key' is required.");
    return $v;
}

function action()
{
    return $_GET['action'] ?? inp('action', '');
}
function current_user()
{
    return $_SESSION['user'] ?? null;
}
function require_login()
{
    $u = current_user();
    if (!$u) fail('Not logged in.', 401);
    return $u;
}
function require_staff_user()
{
    $u = require_login();
    if (!in_array($u['role'], ['owner', 'manager'])) fail('Access denied.', 403);
    return $u;
}
function require_owner()
{
    $u = require_login();
    if ($u['role'] !== 'owner') fail('Only the property owner can do this.', 403);
    return $u;
}

function require_admin()
{
    $u = require_login();
    if ($u['role'] !== 'admin') fail('Admin only.', 403);
    return $u;
}
function scope_owner_id()
{
    $u = require_staff_user();
    return (int) $u['owner_id'];
}
function assert_property($property_id)
{
    $st = db()->prepare('SELECT * FROM property WHERE property_id = ? AND owner_id = ?');
    $st->execute([$property_id, scope_owner_id()]);
    $p = $st->fetch();
    if (!$p) fail('Property not found in your account.', 404);
    return $p;
}
function this_month()
{
    return date('Y-m');
}
