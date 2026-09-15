-- KRC Mobile App Database Migration
-- Run: mysql -u root -p < migrate.sql

CREATE DATABASE IF NOT EXISTS krc_mobile_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'krc_app'@'localhost' IDENTIFIED BY 'KrcApp@iith2026';
GRANT ALL PRIVILEGES ON krc_mobile_db.* TO 'krc_app'@'localhost';
FLUSH PRIVILEGES;

USE krc_mobile_db;

CREATE TABLE IF NOT EXISTS krc_sessions (
  token VARCHAR(36) PRIMARY KEY,
  patron_json TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS book_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  biblio_id INT NOT NULL,
  patron_id INT NOT NULL,
  patron_name VARCHAR(255) NOT NULL,
  rating TINYINT NOT NULL DEFAULT 5,
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_biblio (biblio_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS book_recommendations (
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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS patron_reading_habits (
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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reading_club_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  biblio_id INT NOT NULL,
  patron_id INT NOT NULL,
  patron_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_biblio (biblio_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_book_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  biblio_id INT NOT NULL,
  course_code VARCHAR(50) NOT NULL,
  course_name VARCHAR(255),
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_biblio_course (biblio_id, course_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS professor_shelves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  professor_patron_id INT NOT NULL,
  professor_name VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS professor_shelf_books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shelf_id INT NOT NULL,
  biblio_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  FOREIGN KEY (shelf_id) REFERENCES professor_shelves(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS library_events (
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
) ENGINE=InnoDB;
