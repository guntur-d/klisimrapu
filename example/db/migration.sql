-- Migration from MongoDB to MariaDB
-- Generated for visitors application
-- Database: efinsite

-- Table for allwil (allwilaya)
CREATE TABLE IF NOT EXISTS allwil (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode VARCHAR(255) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_kode_allwil (kode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for wilayah (wilayah)
CREATE TABLE IF NOT EXISTS wil (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode VARCHAR(255) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_kode_wil (kode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for submit (submit registrations)
CREATE TABLE IF NOT EXISTS submit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    kodePemda VARCHAR(255) UNIQUE NOT NULL,
    instansi VARCHAR(255),
    jabatan VARCHAR(255),
    nohape VARCHAR(50),
    telp VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_kode_pemda (kodePemda),
    INDEX idx_instansi (instansi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for kontak (contact messages)
CREATE TABLE IF NOT EXISTS kontak (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subyek VARCHAR(500) NOT NULL,
    pesan TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email_kontak (email),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for logs (activity logs)
CREATE TABLE IF NOT EXISTS log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255),
    method VARCHAR(50),
    desc JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_method (method),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample data for testing (optional)
-- INSERT INTO allwil (kode, nama) VALUES ('ALL001', 'All wilayah 1');
-- INSERT INTO wil (kode, nama) VALUES ('WIL001', 'Wilayah 1');
-- INSERT INTO submit (email, nama, kodePemda, instansi, jabatan, nohape, telp)
-- VALUES ('test@example.com', 'Test User', 'PEMDA001', 'Test Instansi', 'Test Jabatan', '081234567890', '0211234567');
-- INSERT INTO kontak (nama, email, subyek, pesan) VALUES ('John Doe', 'john@example.com', 'Test Subject', 'This is a test message');
-- INSERT INTO log (username, method, desc) VALUES ('adminuser', 'GET', '{"action": "test_log", "details": "Sample log entry"}');