import mysql from "mysql2/promise";

const host = process.env.DB_HOST || "127.0.0.1";
const user = process.env.DB_USER || "root";
const password = process.env.DB_PASSWORD || "";
const database = process.env.DB_NAME || "krc_mobile_db";

const kohaDbUser = process.env.KOHA_DB_USER || "koha_library";
const kohaDbPass = process.env.KOHA_DB_PASS || "{8kb6F%Vs*H.?fam";
const kohaDbName = process.env.KOHA_DB_NAME || "koha_library";

let pool;
let kohaPool;

export async function initDb() {
  try {
    pool = mysql.createPool({
      host,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Verify main DB connection
    await pool.query("SELECT 1");
    console.log(`[Database] Connected to MySQL database "${database}"`);

    // Create Koha DB pool for direct fast reading of patron photos and old checkout history
    try {
      kohaPool = mysql.createPool({
        host,
        user: kohaDbUser,
        password: kohaDbPass,
        database: kohaDbName,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
      });
      await kohaPool.query("SELECT 1");
      console.log(`[Database] Connected to Koha database "${kohaDbName}" for photos and history`);
    } catch (kohaErr) {
      console.warn("[Database] Could not connect to Koha DB directly:", kohaErr.message);
    }

    // Create tables if they don't exist
    await createTables();
  } catch (error) {
    console.error("[Database] Initialization failed:", error.message);
    throw error;
  }
}

async function createTables() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS krc_sessions (
      token VARCHAR(36) PRIMARY KEY,
      patron_json TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      INDEX idx_expires (expires_at)
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS book_reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      biblio_id INT NOT NULL,
      patron_id INT NOT NULL,
      patron_name VARCHAR(255) NOT NULL,
      rating TINYINT NOT NULL DEFAULT 5,
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_biblio (biblio_id)
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS book_recommendations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_patron_id INT NOT NULL,
      sender_patron_name VARCHAR(255) NOT NULL,
      recipient_cardnumber VARCHAR(50) NOT NULL,
      biblio_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255),
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_recipient (recipient_cardnumber)
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS patron_reading_habits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patron_id INT NOT NULL,
      biblio_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255),
      status ENUM('reading','finished','want_to_read') NOT NULL DEFAULT 'reading',
      started_reading_at TIMESTAMP NULL DEFAULT NULL,
      finished_reading_at TIMESTAMP NULL DEFAULT NULL,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_patron_book (patron_id, biblio_id)
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS reading_club_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      biblio_id INT NOT NULL,
      patron_id INT NOT NULL,
      patron_name VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_biblio (biblio_id)
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS course_book_tags (
      id INT AUTO_INCREMENT PRIMARY KEY,
      biblio_id INT NOT NULL,
      course_code VARCHAR(50) NOT NULL,
      course_name VARCHAR(255),
      created_by VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_biblio_course (biblio_id, course_code)
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS professor_shelves (
      id INT AUTO_INCREMENT PRIMARY KEY,
      professor_patron_id INT NOT NULL,
      professor_name VARCHAR(255) NOT NULL,
      department VARCHAR(100),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS professor_shelf_books (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shelf_id INT NOT NULL,
      biblio_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255),
      FOREIGN KEY (shelf_id) REFERENCES professor_shelves(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS library_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      event_date DATE NOT NULL,
      event_time VARCHAR(20),
      location VARCHAR(255),
      event_type ENUM('seminar','exhibition','workshop','talk','other') DEFAULT 'other',
      cover_image_url VARCHAR(500),
      is_active TINYINT(1) DEFAULT 1,
      created_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_date (event_date),
      INDEX idx_active (is_active)
    ) ENGINE=InnoDB`,

    // DDS & Inter-Library Loan (ILL) Requests
    `CREATE TABLE IF NOT EXISTS dds_ill_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patron_id INT NOT NULL,
      patron_name VARCHAR(255) NOT NULL,
      patron_email VARCHAR(255),
      patron_phone VARCHAR(50),
      request_type ENUM('article','book_chapter','book_ill','thesis_paper') NOT NULL DEFAULT 'article',
      title VARCHAR(500) NOT NULL,
      author VARCHAR(255),
      journal_or_book VARCHAR(255),
      year VARCHAR(10),
      volume_issue VARCHAR(50),
      pages VARCHAR(50),
      doi_or_isbn VARCHAR(100),
      notes TEXT,
      status ENUM('pending','in_review','requested_from_partner','fulfilled','rejected') NOT NULL DEFAULT 'pending',
      status_message TEXT,
      delivered_document_url VARCHAR(1000),
      fulfilled_by VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_patron (patron_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB`,

    // Library Floor Occupancy Configuration
    `CREATE TABLE IF NOT EXISTS occupancy_floor_config (
      floor_id VARCHAR(50) PRIMARY KEY,
      floor_name VARCHAR(100) NOT NULL,
      total_seats INT NOT NULL DEFAULT 100,
      description VARCHAR(255),
      is_active TINYINT(1) DEFAULT 1
    ) ENGINE=InnoDB`,

    // Live Library Occupancy Tracking & Gate Check-in/out
    `CREATE TABLE IF NOT EXISTS library_occupancy_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patron_id INT NOT NULL,
      patron_name VARCHAR(255) NOT NULL,
      cardnumber VARCHAR(50),
      floor_id VARCHAR(50) NOT NULL,
      checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      checkout_time TIMESTAMP NULL DEFAULT NULL,
      duration_minutes INT DEFAULT NULL,
      INDEX idx_patron (patron_id),
      INDEX idx_floor (floor_id),
      INDEX idx_active_session (patron_id, checkout_time)
    ) ENGINE=InnoDB`,

    // Push & Admin Broadcast Notifications
    `CREATE TABLE IF NOT EXISTS admin_broadcast_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      target_screen VARCHAR(50) DEFAULT 'home',
      target_id VARCHAR(100) DEFAULT NULL,
      sent_by VARCHAR(255) NOT NULL DEFAULT 'KRC Library Admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB`,

    // Patron Dismissed / Deleted Notifications
    `CREATE TABLE IF NOT EXISTS patron_deleted_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patron_id INT NOT NULL,
      notification_key VARCHAR(100) NOT NULL,
      deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_patron_notif (patron_id, notification_key)
    ) ENGINE=InnoDB`,

    // User Academic Interests with DDC Classification Codes
    `CREATE TABLE IF NOT EXISTS patron_interests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patron_id INT NOT NULL,
      ddc_code VARCHAR(50) NOT NULL,
      subject_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_patron_interest (patron_id, ddc_code)
    ) ENGINE=InnoDB`,

    // Persistent Patron Login History & Activity Log
    `CREATE TABLE IF NOT EXISTS patron_login_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patron_id INT NOT NULL,
      cardnumber VARCHAR(50),
      name VARCHAR(255) NOT NULL,
      library_id VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_patron (patron_id),
      INDEX idx_time (created_at)
    ) ENGINE=InnoDB`,

    // Patron Push Tokens for Native Status Bar & System Notifications
    `CREATE TABLE IF NOT EXISTS patron_push_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patron_id INT NOT NULL,
      cardnumber VARCHAR(50),
      push_token VARCHAR(255) NOT NULL,
      platform VARCHAR(20) DEFAULT 'mobile',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_patron_token (patron_id, push_token)
    ) ENGINE=InnoDB`
  ];

  for (const sql of queries) {
    await pool.query(sql);
  }

  // Seed default floor configuration if empty
  const [existingFloors] = await pool.query("SELECT COUNT(*) as count FROM occupancy_floor_config");
  if (existingFloors[0].count === 0) {
    await pool.query(`
      INSERT INTO occupancy_floor_config (floor_id, floor_name, total_seats, description) VALUES
      ('ground', 'Ground Floor (Circulation & Periodicals)', 120, 'News, magazines, lending desk and browsing area'),
      ('first', '1st Floor (Quiet Study & Reference)', 200, 'Individual carrels, textbooks & academic collections'),
      ('second', '2nd Floor (Digital Library & Research)', 160, 'E-Resource workstations, thesis & journal sections'),
      ('cubicles', 'Discussion Cubicles & Group Study', 40, 'Collaborative study rooms and project cubicles')
    `);
  }

  console.log("[Database] Schema check completed (all tables verified & seeded)");
}

export function getDb() {
  if (!pool) {
    throw new Error("[Database] Pool has not been initialized yet.");
  }
  return pool;
}

export function getKohaDb() {
  return kohaPool || pool;
}
