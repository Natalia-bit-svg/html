<?php
// ============================================================
//  FamilyHub — auth.php  (corrigido v3)
//  POST /auth.php?action=login
//  POST /auth.php?action=register
//  POST /auth.php?action=logout
//  GET  /auth.php?action=me
// ============================================================

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

match ($action) {
    'login'    => handleLogin($body),
    'register' => handleRegister($body),
    'logout'   => handleLogout(),
    'me'       => handleMe(),
    default    => jsonError('Ação inválida.', 404),
};

// ─────────────────────────────────────────────────
//  LOGIN
// ─────────────────────────────────────────────────
function handleLogin(array $body): void {
    $email = strtolower(trim($body['email'] ?? ''));
    $pass  = $body['password'] ?? '';

    if (!$email || !$pass) {
        jsonError('E-mail e senha são obrigatórios.');
    }

    try {
        $pdo  = getPDO();
        $stmt = $pdo->prepare(
            'SELECT id, name, email, password_hash, family_name
             FROM users WHERE email = ? AND is_active = 1
             LIMIT 1'
        );
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // ─── Verificação de senha ────────────────────────────
        // PHP armazena hash com prefixo $2y$, mas hashes gerados por
        // outras ferramentas (Python crypt, Node bcrypt) usam $2b$.
        // Ambos são funcionalmente idênticos — normalizamos para $2y$.
        if ($user) {
            $hashFixed = preg_replace('/^\$2b\$/', '$2y$', $user['password_hash']);
            $valid     = password_verify($pass, $hashFixed);
        } else {
            $valid = false;
        }

        if (!$user || !$valid) {
            jsonError('E-mail ou senha incorretos.', 401);
        }

        // Se o hash precisar ser atualizado (rehash automático)
        if (password_needs_rehash($hashFixed, PASSWORD_BCRYPT, ['cost' => 12])) {
            $newHash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);
            $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                ->execute([$newHash, $user['id']]);
        }

        // Atualiza last_login
        $pdo->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')
            ->execute([$user['id']]);

        // Remove tokens expirados deste usuário (limpeza)
        $pdo->prepare('DELETE FROM auth_tokens WHERE user_id = ? AND expires_at < NOW()')
            ->execute([$user['id']]);

        // Gera novo token
        $token   = generateToken();
        $expires = date('Y-m-d H:i:s', time() + TOKEN_EXPIRE_HOURS * 3600);
        $ua      = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);
        $ip      = $_SERVER['REMOTE_ADDR'] ?? null;

        $pdo->prepare(
            'INSERT INTO auth_tokens (user_id, token, expires_at, user_agent, ip_address)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([$user['id'], $token, $expires, $ua, $ip]);

        // Carrega dados da família
        $dataStmt = $pdo->prepare('SELECT data_json FROM family_data WHERE user_id = ? LIMIT 1');
        $dataStmt->execute([$user['id']]);
        $familyRow = $dataStmt->fetch();

        jsonSuccess([
            'token'       => $token,
            'user'        => [
                'id'         => $user['id'],
                'name'       => $user['name'],
                'email'      => $user['email'],
                'familyName' => $user['family_name'],
            ],
            'family_data' => $familyRow ? json_decode($familyRow['data_json'], true) : null,
        ]);

    } catch (Exception $e) {
        jsonError('Erro interno do servidor: ' . $e->getMessage(), 500);
    }
}

// ─────────────────────────────────────────────────
//  REGISTRO
// ─────────────────────────────────────────────────
function handleRegister(array $body): void {
    $name   = trim($body['name']     ?? '');
    $email  = strtolower(trim($body['email'] ?? ''));
    $pass   = $body['password']      ?? '';
    $phone  = trim($body['phone']    ?? '');
    $age    = isset($body['age']) ? (int)$body['age'] : null;

    // Validações básicas
    if (!$name || !$email || !$pass) {
        jsonError('Nome, e-mail e senha são obrigatórios.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('E-mail inválido.');
    }
    if (strlen($pass) < 6) {
        jsonError('A senha deve ter pelo menos 6 caracteres.');
    }

    try {
        $pdo = getPDO();

        // Verifica e-mail duplicado
        $check = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $check->execute([$email]);
        if ($check->fetch()) {
            jsonError('Este e-mail já está cadastrado.', 409);
        }

        $hash       = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);
        $familyName = $name . "'s Family";

        $pdo->prepare(
            'INSERT INTO users (name, email, password_hash, phone, age, family_name)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([$name, $email, $hash, $phone ?: null, $age, $familyName]);

        $userId = (int)$pdo->lastInsertId();

        // Token de login automático
        $token   = generateToken();
        $expires = date('Y-m-d H:i:s', time() + TOKEN_EXPIRE_HOURS * 3600);
        $ua      = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);
        $ip      = $_SERVER['REMOTE_ADDR'] ?? null;

        $pdo->prepare(
            'INSERT INTO auth_tokens (user_id, token, expires_at, user_agent, ip_address)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([$userId, $token, $expires, $ua, $ip]);

        // Notificação de boas-vindas
        $pdo->prepare(
            'INSERT INTO notifications (user_id, title, message, type, icon)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([
            $userId,
            'Bem-vindo ao FamilyHub! 🎉',
            'Sua conta foi criada com sucesso. Comece adicionando membros da família!',
            'success',
            'party-popper',
        ]);

        jsonSuccess([
            'token' => $token,
            'user'  => [
                'id'         => $userId,
                'name'       => $name,
                'email'      => $email,
                'familyName' => $familyName,
            ],
            'family_data' => null,
        ], 201);

    } catch (Exception $e) {
        jsonError('Erro ao criar conta: ' . $e->getMessage(), 500);
    }
}

// ─────────────────────────────────────────────────
//  LOGOUT
// ─────────────────────────────────────────────────
function handleLogout(): void {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$authHeader && function_exists('apache_request_headers')) {
        $headers    = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
        try {
            getPDO()->prepare('DELETE FROM auth_tokens WHERE token = ?')
                ->execute([$m[1]]);
        } catch (Exception $e) {}
    }
    jsonSuccess(['message' => 'Sessão encerrada.']);
}

// ─────────────────────────────────────────────────
//  DADOS DO USUÁRIO LOGADO
// ─────────────────────────────────────────────────
function handleMe(): void {
    $userId = requireAuth();
    try {
        $pdo  = getPDO();
        $stmt = $pdo->prepare(
            'SELECT id, name, email, family_name FROM users WHERE id = ? LIMIT 1'
        );
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        if (!$user) {
            jsonError('Usuário não encontrado.', 404);
        }
        jsonSuccess(['user' => $user]);
    } catch (Exception $e) {
        jsonError('Erro ao buscar usuário.', 500);
    }
}
