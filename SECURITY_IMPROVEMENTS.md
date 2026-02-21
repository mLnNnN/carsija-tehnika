# Sigurnosna Poboljšanja - Uputstva

## Šta je urađeno

Implementirana su sledeća sigurnosna poboljšanja:

### 1. ✅ Rate Limiting
- Ograničenje na 20 akcija po minutu za admin operacije
- Automatsko brisanje starih akcija iz prozora
- Zaštita od spam-a i automatskih napada

### 2. ✅ Input Validacija i Sanitizacija
- Sanitizacija svih korisničkih inputa (uklanjanje HTML tagova, JavaScript koda)
- Validacija cijena (0 - 1.000.000 KM)
- Validacija kategorija (samo dozvoljene kategorije)
- Validacija veličine slika (maksimalno 5MB)
- Validacija dužine naziva proizvoda (minimum 2 karaktera)

### 3. ✅ Poboljšan Session Management
- Session tokeni sa expirom (24 sata)
- Automatsko brisanje isteklih sesija
- CSRF token zaštita (pripremljeno za buduću upotrebu)

### 4. ✅ Sigurnosne Provjere
- Provjera admin statusa prije svake operacije
- Validacija ID-jeva proizvoda
- Bolje error handling sa jasnim porukama

### 5. ✅ Database Constraints
- SQL constraints za validaciju podataka na nivou baze
- Indexi za bolje performanse

## Šta TREBA da uradite

### Korak 1: Ažurirajte Supabase RLS Policies

1. Otvorite Supabase Dashboard → SQL Editor
2. Kopirajte i pokrenite SQL iz fajla `supabase-security-update.sql`
3. Ovo će dodati:
   - Database constraints za validaciju
   - Bolje indexe
   - Komentare o sigurnosnim rizicima

**VAŽNO**: Trenutne RLS policies još uvek dozvoljavaju svima da mijenjaju proizvode jer koristimo client-side autentifikaciju. Ovo je privremeno rješenje.

### Korak 2: Promijenite Admin Credentials

1. Otvorite `CarsijaSite/admin.js`
2. Pronađite liniju:
   ```javascript
   const ADMIN_CREDENTIALS = {
       username: 'admin',
       password: 'admin123'
   };
   ```
3. Promijenite username i password na sigurnije vrijednosti:
   ```javascript
   const ADMIN_CREDENTIALS = {
       username: 'vase_korisnicko_ime',
       password: 'vasa_jaka_lozinka_123!@#'
   };
   ```

**VAŽNO**: 
- Koristite jaku lozinku (minimalno 12 karaktera, kombinacija slova, brojeva i simbola)
- Ne dijelite credentials javno
- Ne commit-ujte credentials u Git

### Korak 3: Provjerite .gitignore

Provjerite da li `supabase-config.js` postoji u `.gitignore` fajlu. Ako ne postoji, dodajte:

```
supabase-config.js
```

### Korak 4: Testirajte Sigurnosne Funkcije

1. **Test Rate Limiting**:
   - Prijavite se kao admin
   - Pokušajte dodati 21+ proizvoda u roku od 1 minute
   - Trebalo bi dobiti grešku nakon 20. proizvoda

2. **Test Input Validacije**:
   - Pokušajte dodati proizvod sa:
     - Nazivom kraćim od 2 karaktera
     - Cijenom većom od 1.000.000 KM
     - Slikom većom od 5MB
   - Sve bi trebalo biti blokirano sa jasnim porukama

3. **Test Session Expiry**:
   - Prijavite se kao admin
   - U browser DevTools, promijenite `expires` vrijednost u localStorage na prošlost
   - Pokušajte dodati proizvod
   - Trebalo bi tražiti ponovnu prijavu

## Buduća Poboljšanja (Preporučeno)

### Prioritet 1: Supabase Auth Integracija

Trenutno, admin credentials su hardkodovani u JavaScript-u, što je vidljivo svima. Za produkciju, preporučuje se:

1. Implementirati Supabase Authentication
2. Kreirati admin korisnike kroz Supabase Auth
3. Ažurirati RLS policies da dozvoljavaju samo autentifikovanim adminima

**Primjer SQL za buduću implementaciju**:
```sql
-- Kreiraj funkciju za provjeru admin statusa
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE username = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ažuriraj policies
DROP POLICY IF EXISTS "Public can insert products (temporary)" ON products;
CREATE POLICY "Only admins can insert products" ON products
  FOR INSERT WITH CHECK (is_admin());
```

### Prioritet 2: HTTPS

Osigurajte da sajt koristi HTTPS u produkciji. Ovo je kritično za sigurnost podataka.

### Prioritet 3: Environment Variables

Umjesto hardkodovanih credentials u JavaScript-u, koristite environment variables ili Supabase Edge Functions.

## Trenutni Sigurnosni Rizici

### ⚠️ Srednji Rizik: Client-side Authentication
- Admin credentials su vidljivi u source kodu
- Bilo ko može vidjeti username i password
- **Mitigacija**: Rate limiting i input validacija pomažu, ali nisu dovoljni

### ⚠️ Srednji Rizik: Public Database Access
- RLS policies dozvoljavaju svima da mijenjaju proizvode
- **Mitigacija**: Client-side provjere, ali server-side provjere su potrebne

### ✅ Nizak Rizik: Input Injection
- Sanitizacija i validacija su implementirane
- Database constraints dodatno štite

### ✅ Nizak Rizik: Rate Limiting
- Implementiran na client-side
- Ograničava spam i automatske napade

## Kontakt i Podrška

Ako imate pitanja ili problema sa implementacijom, provjerite:
1. Browser konzolu za error poruke
2. Supabase Dashboard → Logs za database greške
3. Network tab u DevTools za API pozive

## Changelog

- **2026-01-XX**: Dodana rate limiting, input validacija, poboljšan session management
- **2026-01-XX**: Dodani database constraints i bolji indexi
- **2026-01-XX**: Dodana dokumentacija za sigurnosna poboljšanja

