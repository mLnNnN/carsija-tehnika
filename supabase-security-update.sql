-- Supabase Security Update for Čaršija Website
-- IMPORTANT: Run this AFTER the initial setup (supabase-setup.sql)
-- This adds better security policies
-- 
-- NOTE: These policies still allow public access for INSERT/UPDATE/DELETE
-- because we're using client-side authentication. For production, you should
-- implement Supabase Auth and restrict these operations to authenticated admins.

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert products" ON products;
DROP POLICY IF EXISTS "Anyone can update products" ON products;
DROP POLICY IF EXISTS "Anyone can delete products" ON products;

-- Keep public read (needed for displaying products)
-- This policy already exists, but we keep it for clarity
-- CREATE POLICY "Anyone can read products" ON products
--   FOR SELECT USING (true);

-- IMPORTANT SECURITY NOTE:
-- The following policies allow ANYONE to modify products because we're using
-- client-side authentication. This is a security risk.
-- 
-- For better security, you should:
-- 1. Implement Supabase Auth
-- 2. Create a function to check if user is admin
-- 3. Update policies to only allow authenticated admins
--
-- Example (for future implementation):
-- CREATE POLICY "Only admins can insert products" ON products
--   FOR INSERT WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM admin_users 
--       WHERE username = auth.jwt() ->> 'email'
--     )
--   );

-- For now, we keep public access but add rate limiting on client side
-- These policies will be replaced when Supabase Auth is implemented
CREATE POLICY "Public can insert products (temporary)" ON products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update products (temporary)" ON products
  FOR UPDATE USING (true);

CREATE POLICY "Public can delete products (temporary)" ON products
  FOR DELETE USING (true);

-- Add constraint to prevent empty names
ALTER TABLE products 
  ADD CONSTRAINT products_name_not_empty 
  CHECK (LENGTH(TRIM(name)) >= 2);

-- Add constraint to validate category
ALTER TABLE products 
  ADD CONSTRAINT products_category_valid 
  CHECK (category IN (
    'ves-masine', 'masine-za-sudje', 'frizideri', 
    'klima-uredjaji', 'ugradni-aparati', 'stednjaci', 'televizori'
  ));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);

