-- Supabase Database Setup for Čaršija Website
-- Run this SQL in Supabase SQL Editor

-- Tabela za proizvode
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price VARCHAR(50) NOT NULL,
  image TEXT NOT NULL,
  image_alt VARCHAR(255),
  is_base64 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za admin korisnike (opciono, za buduću autentifikaciju)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Anyone can read products" ON products;
DROP POLICY IF EXISTS "Anyone can insert products" ON products;
DROP POLICY IF EXISTS "Anyone can update products" ON products;
DROP POLICY IF EXISTS "Anyone can delete products" ON products;
DROP POLICY IF EXISTS "No public access to admin_users" ON admin_users;

-- Policy: Svi mogu čitati proizvode (public read)
CREATE POLICY "Anyone can read products" ON products
  FOR SELECT USING (true);

-- Policy: Svi mogu dodavati proizvode (za admin panel)
-- U produkciji, ovo bi trebalo biti ograničeno na autentifikovane admin korisnike
CREATE POLICY "Anyone can insert products" ON products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update products" ON products
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete products" ON products
  FOR DELETE USING (true);

-- Policy: Admin tabela je potpuno privatna
CREATE POLICY "No public access to admin_users" ON admin_users
  FOR ALL USING (false);

-- Funkcija za automatsko ažuriranje updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger za automatsko ažuriranje updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Indexi za bolje performanse
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

