-- ============================================================
--  FamilyHub — Schema do Banco de Dados MySQL  (v4 — com logs)
--  Execute: mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS familyhub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE familyhub;

-- ─── Usuários ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150)  NOT NULL,
  email         VARCHAR(200)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  phone         VARCHAR(20)   DEFAULT NULL,
  age           INT           DEFAULT NULL,
  family_name   VARCHAR(150)  DEFAULT 'Minha Família',
  is_active     TINYINT(1)    DEFAULT 1,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  last_login    TIMESTAMP     NULL,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Dados da Família (JSON blob) ─────────────────────────
CREATE TABLE IF NOT EXISTS family_data (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  data_json   LONGTEXT     NOT NULL,
  version     INT          DEFAULT 1,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_fd_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Notificações ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  title       VARCHAR(200) NOT NULL,
  message     TEXT         NOT NULL,
  type        ENUM('info','success','warning','achievement') DEFAULT 'info',
  icon        VARCHAR(50)  DEFAULT 'bell',
  is_read     TINYINT(1)   DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_user_date (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Conquistas Desbloqueadas ──────────────────────────────
CREATE TABLE IF NOT EXISTS achievements_log (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT          NOT NULL,
  achievement_id VARCHAR(50)  NOT NULL,
  member_name    VARCHAR(100) DEFAULT NULL,
  unlocked_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ach_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_ach_member (user_id, achievement_id, member_name),
  INDEX idx_user_ach (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Tokens de Sessão ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_tokens (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  token       VARCHAR(64)  NOT NULL UNIQUE,
  expires_at  TIMESTAMP    NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  user_agent  VARCHAR(500) DEFAULT NULL,
  ip_address  VARCHAR(45)  DEFAULT NULL,
  CONSTRAINT fk_tok_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user_token (user_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Histórico de Pontos ──────────────────────────────────
CREATE TABLE IF NOT EXISTS points_log (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  member_name VARCHAR(100) NOT NULL,
  points      INT          NOT NULL,
  reason      VARCHAR(200) DEFAULT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pts_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_member (user_id, member_name),
  INDEX idx_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Eventos de Atividade ─────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_events (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  event_type  VARCHAR(50)  NOT NULL,
  payload     JSON         DEFAULT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_evt_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_type (user_id, event_type),
  INDEX idx_user_date (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Histórico de Alterações (NOVO) ──────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_log_user (user_id),
  INDEX idx_log_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Limpeza automática de tokens expirados ───────────────
DROP EVENT IF EXISTS cleanup_expired_tokens;
CREATE EVENT cleanup_expired_tokens
  ON SCHEDULE EVERY 1 DAY
  STARTS CURRENT_TIMESTAMP
  DO
    DELETE FROM auth_tokens WHERE expires_at < NOW();

-- ─────────────────────────────────────────────────────────────
--  USUÁRIO DE DEMONSTRAÇÃO
--  E-mail : admin@familyhub.com
--  Senha  : 123456
-- ─────────────────────────────────────────────────────────────
INSERT INTO users (name, email, password_hash, phone, age, family_name)
VALUES (
  'Admin Demo',
  'admin@familyhub.com',
  '$2y$12$WveUsq8bja2FFb/8O67ZkerHpSUTod/ThgksCEueEu1d7/a2ACCTm',
  '(11) 99999-9999',
  30,
  'Família Demo'
)
ON DUPLICATE KEY UPDATE
  password_hash = '$2y$12$WveUsq8bja2FFb/8O67ZkerHpSUTod/ThgksCEueEu1d7/a2ACCTm',
  name          = 'Admin Demo',
  family_name   = 'Família Demo',
  is_active     = 1;
