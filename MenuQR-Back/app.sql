-- ======================
-- Database Setup
-- ======================
START TRANSACTION;

-- ======================
-- RESTAURANTS
-- ======================
CREATE TABLE Restaurant (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    address TEXT,
    description TEXT,
    token VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE RestaurantLogo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT,
    image_url VARCHAR(255) NOT NULL,
    public_id VARCHAR(255) DEFAULT NULL,
    FOREIGN KEY (restaurant_id) REFERENCES Restaurant(id) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ======================
-- MENU & DISHES
-- ======================
CREATE TABLE Menu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
   -- UNIQUE(date), -- One menu per date per restaurant
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE Section (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE Dish (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2),
    section_id INT,
    menu_id INT,
    FOREIGN KEY (section_id) REFERENCES Section(id),
    FOREIGN KEY (menu_id) REFERENCES Menu(id) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE DishImage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dish_id INT,
    image_url VARCHAR(255) NOT NULL,
    local_filename VARCHAR(255) DEFAULT NULL,
    public_id VARCHAR(255) DEFAULT NULL,
    FOREIGN KEY (dish_id) REFERENCES Dish(id) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ======================
-- CLIENTS
-- ======================
CREATE TABLE InternalClient (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_number INT NOT NULL,
    session_token VARCHAR(255) UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE ExternalClient (
    id INT AUTO_INCREMENT PRIMARY KEY,
    address TEXT NOT NULL,
    phone_number VARCHAR(50),
    session_token VARCHAR(255) UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ======================
-- ORDERS
-- ======================
CREATE TABLE `Order` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_id INT,
    internal_client_id INT,
    external_client_id INT,
    client_type ENUM('internal', 'external') NOT NULL,
    status ENUM('pending', 'preparing', 'served', 'cancelled') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_id) REFERENCES Menu(id),
    FOREIGN KEY (internal_client_id) REFERENCES InternalClient(id),
    FOREIGN KEY (external_client_id) REFERENCES ExternalClient(id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE OrderItem (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    dish_id INT,
    quantity INT DEFAULT 1,
    FOREIGN KEY (order_id) REFERENCES `Order`(id),
    FOREIGN KEY (dish_id) REFERENCES Dish(id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

-- ======================
-- DEFAULT MENU SECTIONS
-- ======================
INSERT INTO Section (name) VALUES 
  ('Drinks'),
  ('Starters'),
  ('Main Course'),
  ('Desserts'),
  ('Sides'),
  ('Sauces');

COMMIT;
