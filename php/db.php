<?php
// ============================================================
//  FamilyHub — Conexão com o Banco de Dados (PDO)
//
//  Configuração via variáveis de ambiente (recomendado) ou
//  pelo arquivo .env na raiz do projeto.
//
//  Crie um arquivo .env com:
//    DB_HOST=localhost
//    DB_NAME=familyhub
//    DB_USER=root
//    DB_PASS=sua_senha_aqui
//    JWT_SECRET=chave_secreta_longa_e_aleatoria
// ============================================================

// ─── Carrega .env se existir ──────────────────────────────
$envFile = __DIR__ . '/../.env';
if (!file_exists($envFile)) $envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        [$key, $val] = array_map('trim', explode('=', $line, 2));
        if (!getenv($key)) putenv("$key=$val");
    }
}

// ─── Constantes de configuração ──────────────────────────
// Lê variáveis de ambiente; em produção, nunca deixe os
// valores padrão abaixo — defina sempre via .env ou env vars.
define('DB_HOST',    getenv('DB_HOST') ?: 'localhost');
define('DB_NAME',    getenv('DB_NAME') ?: 'familyhub');
define('DB_USER',    getenv('DB_USER') ?: 'root');
define('DB_PASS',    getenv('DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');

// ⚠️  OBRIGATÓRIO definir JWT_SECRET via .env em produção!
define('JWT_SECRET',         getenv('JWT_SECRET') ?: 'TROQUE_ESTA_CHAVE_EM_PRODUCAO');
define('TOKEN_EXPIRE_HOURS', 24 * 7); // 7 dias
// Headers CORS — necessário para desenvolvimento local e para o JS do frontend
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * Retorna a instância PDO (singleton via static).
 */
function getPDO(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        DB_HOST, DB_NAME, DB_CHARSET
    );

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    return $pdo;
}

// ─── Helpers de resposta JSON ─────────────────────────────

function jsonSuccess(array $data = [], int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true, ...$data], JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $message, int $status = 400): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Gera um token seguro de 32 bytes (64 chars hex).
 */
function generateToken(): string {
    return bin2hex(random_bytes(32));
}

/**
 * Valida token Bearer e retorna user_id, ou null se inválido/expirado.
 */
function validateToken(string $token): ?int {
    try {
        $pdo  = getPDO();
        $stmt = $pdo->prepare(
            'SELECT user_id FROM auth_tokens
             WHERE token = ? AND expires_at > NOW()'
        );
        $stmt->execute([$token]);
        $row = $stmt->fetch();
        return $row ? (int)$row['user_id'] : null;
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Extrai e valida o Bearer token do header Authorization.
 * Retorna user_id ou encerra com 401.
 */
function requireAuth(): int {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    // Alguns servidores (Apache + mod_php) não passam Authorization diretamente
    if (!$authHeader && function_exists('apache_request_headers')) {
        $headers     = apache_request_headers();
        $authHeader  = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    // Fallback via variável de ambiente (nginx / CGI)
    if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }

    if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
        jsonError('Token de autenticação ausente.', 401);
    }

    $userId = validateToken($m[1]);
    if (!$userId) {
        jsonError('Token inválido ou expirado. Faça login novamente.', 401);
    }
    return $userId;
}
