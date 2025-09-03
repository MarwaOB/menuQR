-- ======================
-- Database Setup
-- ======================
CREATE DATABASE menuqr;
\c menuqr;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================
-- RESTAURANTS
-- ======================
CREATE TABLE IF NOT EXISTS Restaurant (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    address TEXT,
    description TEXT,
    token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS RestaurantLogo (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES Restaurant(id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL,
    public_id VARCHAR(255) DEFAULT NULL,
    local_path TEXT
);

-- ======================
-- MENU & DISHES
-- ======================
CREATE TABLE IF NOT EXISTS Menu (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS Section (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Dish (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    section_id INTEGER REFERENCES Section(id),
    menu_id INTEGER REFERENCES Menu(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS DishImage (
    id SERIAL PRIMARY KEY,
    dish_id INTEGER REFERENCES Dish(id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL,
    local_filename VARCHAR(255) DEFAULT NULL,
    public_id VARCHAR(255) DEFAULT NULL
);

-- ======================
-- CLIENTS
-- ======================
CREATE TABLE IF NOT EXISTS InternalClient (
    id SERIAL PRIMARY KEY,
    table_number INTEGER NOT NULL,
    session_token VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ExternalClient (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL,
    phone_number VARCHAR(50),
    session_token VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- ORDERS
-- ======================
CREATE TABLE IF NOT EXISTS OrderTable (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE,
    status VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'internal' or 'external'
    internal_client_id INTEGER REFERENCES InternalClient(id) ON DELETE SET NULL,
    external_client_id INTEGER REFERENCES ExternalClient(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS OrderItem (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES OrderTable(id) ON DELETE CASCADE,
    dish_id INTEGER REFERENCES Dish(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    special_requests TEXT,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- INDEXES
-- ======================
CREATE INDEX IF NOT EXISTS idx_order_status ON OrderTable(status);
CREATE INDEX IF NOT EXISTS idx_order_created_at ON OrderTable(created_at);
CREATE INDEX IF NOT EXISTS idx_order_item_status ON OrderItem(status);

-- ======================
-- TRIGGERS FOR UPDATED_AT
-- ======================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_updated_at
BEFORE UPDATE ON OrderTable
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_item_updated_at
BEFORE UPDATE ON OrderItem
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
