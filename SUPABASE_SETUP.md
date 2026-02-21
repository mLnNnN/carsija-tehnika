# Supabase Setup Instrukcije

## Korak 1: Kreiranje Supabase Projekta

1. Idite na https://supabase.com i prijavite se
2. Kliknite "New Project"
3. Unesite:
   - **Project Name**: carsija-website (ili bilo koji naziv)
   - **Database Password**: Izaberite sigurnu lozinku (zabilježite je!)
   - **Region**: Izaberite najbližu regiju (npr. West Europe)
4. Kliknite "Create new project"
5. Sačekajte da se projekat kreira (2-3 minute)

## Korak 2: Dobijanje Credentials

1. U Supabase dashboardu, idite na **Settings** → **API**
2. Zabilježite:
   - **Project URL** (npr. `https://xxxxx.supabase.co`)
   - **anon public** key (dugački string)

## Korak 3: Kreiranje Tabela

1. U Supabase dashboardu, idite na **SQL Editor**
2. Kliknite "New query"
3. Kopirajte i zalijepite cijeli sadržaj iz fajla `supabase-setup.sql`
4. Kliknite "Run" ili pritisnite Ctrl+Enter
5. Provjerite da li su tabele kreirane:
   - Idite na **Table Editor**
   - Trebali biste vidjeti `products` i `admin_users` tabele

## Korak 4: Konfiguracija

1. Otvorite fajl `supabase-config.js`
2. Zamijenite:
   - `YOUR_SUPABASE_URL` sa vašim Project URL-om
   - `YOUR_SUPABASE_ANON_KEY` sa vašim anon public key-om

Primjer:
```javascript
const SUPABASE_CONFIG = {
    url: 'https://abcdefghijklmnop.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NzE2ODAwMCwiZXhwIjoxOTYyNzQ0MDAwfQ.abcdefghijklmnopqrstuvwxyz1234567890'
};
```

## Korak 5: Testiranje

1. Otvorite `ponuda.html` u browseru
2. Otvorite Developer Console (F12)
3. Provjerite da li ima grešaka
4. Kliknite "Prijava" i unesite:
   - Username: `admin`
   - Password: `admin123`
5. Pokušajte dodati novi proizvod
6. Provjerite u Supabase Table Editor da li je proizvod dodat

## Korak 6: Upload na Hosting

1. Uploadujte sve fajlove na hosting
2. **VAŽNO**: Ne uploadujte `supabase-config.js` sa credentials-ima na public repo!
3. Na serveru, editujte `supabase-config.js` i unesite credentials

## Troubleshooting

### Problem: "Supabase not initialized"
- Provjerite da li je Supabase script uključen prije `supabase-config.js`
- Provjerite da li su credentials ispravno uneseni

### Problem: "Error fetching products"
- Provjerite da li su tabele kreirane u Supabase
- Provjerite RLS policies (trebaju biti omogućene)
- Provjerite da li je anon key ispravan

### Problem: "Error adding product"
- Provjerite browser konzolu za detaljne greške
- Provjerite da li su sva polja popunjena
- Provjerite RLS policies za INSERT

### Problem: Promjene se ne vide drugim korisnicima
- Provjerite da li se proizvodi čuvaju u Supabase (Table Editor)
- Provjerite da li drugi korisnici učitavaju sa Supabase (ne localStorage)
- Očistite browser cache

## Sigurnost

1. **NE dijelite** vaš Supabase credentials javno
2. **NE commit-ujte** `supabase-config.js` sa credentials-ima u Git
3. Za produkciju, razmislite o korištenju Supabase Auth umjesto jednostavne lozinke
4. Promijenite admin lozinku u `admin.js` (linija 7)

## Dodatne Napomene

- Supabase ima besplatan tier sa 500MB baze podataka
- Proizvodi se automatski migriraju iz HTML-a u Supabase pri prvom učitavanju
- Sve promjene su trajne i vidljive svim korisnicima
- Slike se čuvaju kao base64 stringovi (može biti sporo za velike slike)

