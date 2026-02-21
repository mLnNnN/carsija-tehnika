-- ============================================================================
-- KOMPLETAN SUPABASE SETUP ZA ČARŠIJA WEBSITE
-- ============================================================================
-- 
-- UPUTSTVO:
-- 1. Otvorite Supabase Dashboard (https://app.supabase.com)
-- 2. Idite na SQL Editor
-- 3. Kopirajte SAV kod iz ovog fajla
-- 4. Kliknite "Run" ili pritisnite Ctrl+Enter
--
-- ⚠️ VAŽNO:
-- - NE MORATE brisati postojeći kod u SQL Editor-u
-- - Ovaj SQL je siguran za re-run (koristi IF EXISTS/IF NOT EXISTS)
-- - Ako već imate podatke u bazi, constraints će se dodati samo ako podaci
--   zadovoljavaju uslove (naziv >= 2 karaktera, validna kategorija)
--
-- OVAJ SQL KREIRA:
-- - Tabele (products, admin_users)
-- - Row Level Security (RLS) policies
-- - Funkcije i triggere
-- - Indexe za performanse
-- - Constraints za validaciju
--
-- ============================================================================

-- ============================================================================
-- KREIRANJE TABELA
-- ============================================================================

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

-- Tabela za admin korisnike (za buduću autentifikaciju)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - ENABLE
-- ============================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BRISANJE POSTOJEĆIH POLICIES (za re-run bez grešaka)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can read products" ON products;
DROP POLICY IF EXISTS "Anyone can insert products" ON products;
DROP POLICY IF EXISTS "Public can insert products (temporary)" ON products;
DROP POLICY IF EXISTS "Anyone can update products" ON products;
DROP POLICY IF EXISTS "Public can update products (temporary)" ON products;
DROP POLICY IF EXISTS "Anyone can delete products" ON products;
DROP POLICY IF EXISTS "Public can delete products (temporary)" ON products;
DROP POLICY IF EXISTS "No public access to admin_users" ON admin_users;

-- ============================================================================
-- RLS POLICIES ZA PRODUCTS TABELU
-- ============================================================================

-- Policy: Svi mogu čitati proizvode (public read - potrebno za prikaz na sajtu)
CREATE POLICY "Anyone can read products" ON products
  FOR SELECT USING (true);

-- Policy: Svi mogu dodavati proizvode (temporary - za client-side admin panel)
-- ⚠️ VAŽNO: U produkciji, ovo bi trebalo biti ograničeno na autentifikovane admin korisnike
-- Za buduću implementaciju, koristite Supabase Auth i ažurirajte ove policies
CREATE POLICY "Public can insert products (temporary)" ON products
  FOR INSERT WITH CHECK (true);

-- Policy: Svi mogu ažurirati proizvode (temporary - za client-side admin panel)
CREATE POLICY "Public can update products (temporary)" ON products
  FOR UPDATE USING (true);

-- Policy: Svi mogu brisati proizvode (temporary - za client-side admin panel)
CREATE POLICY "Public can delete products (temporary)" ON products
  FOR DELETE USING (true);

-- ============================================================================
-- RLS POLICIES ZA ADMIN_USERS TABELU
-- ============================================================================

-- Policy: Admin tabela je potpuno privatna (niko ne može pristupiti)
CREATE POLICY "No public access to admin_users" ON admin_users
  FOR ALL USING (false);

-- ============================================================================
-- FUNKCIJE
-- ============================================================================

-- Funkcija za automatsko ažuriranje updated_at kolone
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- TRIGGERI
-- ============================================================================

-- Trigger za automatsko ažuriranje updated_at pri svakom UPDATE-u
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CONSTRAINTS ZA VALIDACIJU PODATAKA
-- ============================================================================

-- Constraint: Naziv proizvoda mora imati najmanje 2 karaktera
-- (Ako constraint već postoji, ova komanda će dati grešku - to je OK, ignorišite je)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_name_not_empty'
  ) THEN
    ALTER TABLE products 
      ADD CONSTRAINT products_name_not_empty 
      CHECK (LENGTH(TRIM(name)) >= 2);
  END IF;
END $$;

-- Constraint: Validacija kategorije (samo dozvoljene kategorije)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_category_valid'
  ) THEN
    ALTER TABLE products 
      ADD CONSTRAINT products_category_valid 
      CHECK (category IN (
        'ves-masine', 
        'masine-za-sudje', 
        'frizideri', 
        'klima-uredjaji', 
        'ugradni-aparati', 
        'stednjaci', 
        'televizori'
      ));
  END IF;
END $$;

-- ============================================================================
-- INDEXI ZA BOLJE PERFORMANSE
-- ============================================================================

-- Index za kategoriju (najčešće korišteno u WHERE klauzulama)
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Index za naziv proizvoda (za pretragu)
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Index za created_at (za sortiranje)
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Index za updated_at (za sortiranje)
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);

-- ============================================================================
-- ZAVRŠETAK SETUP-A
-- ============================================================================

-- Provjera da li su tabele kreirane
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    RAISE NOTICE '✓ Tabela "products" je uspješno kreirana';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users') THEN
    RAISE NOTICE '✓ Tabela "admin_users" je uspješno kreirana';
  END IF;
  
  RAISE NOTICE '✓ Setup je završen! Možete početi koristiti bazu podataka.';
END $$;

-- ============================================================================
-- NAPOMENE ZA BUDUĆU PRODUKCIJU
-- ============================================================================
--
-- TRENUTNO STANJE:
-- - RLS policies dozvoljavaju svima da mijenjaju proizvode
-- - Ovo je OK za development, ali NIJE sigurno za produkciju
--
-- ZA PRODUKCIJU, PREPORUČUJE SE:
-- 1. Implementirati Supabase Authentication
-- 2. Kreirati admin korisnike kroz Supabase Auth
-- 3. Ažurirati RLS policies da dozvoljavaju samo autentifikovanim adminima
--
-- PRIMJER ZA BUDUĆU IMPLEMENTACIJU:
--
-- CREATE OR REPLACE FUNCTION is_admin()
-- RETURNS boolean AS $$
-- BEGIN
--   RETURN EXISTS (
--     SELECT 1 FROM admin_users 
--     WHERE username = auth.jwt() ->> 'email'
--   );
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- DROP POLICY IF EXISTS "Public can insert products (temporary)" ON products;
-- CREATE POLICY "Only admins can insert products" ON products
--   FOR INSERT WITH CHECK (is_admin());
--
-- ============================================================================

