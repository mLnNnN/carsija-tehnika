// Admin System for Čaršija Website
// Uses Supabase database for persistence

// Admin credentials (for client-side check)
// NOTE: This is still visible in source code. For production, use Supabase Auth.
const ADMIN_CREDENTIALS = {
    username: 'ABC123',
    password: 'slge233'
};

const ADMIN_SESSION_KEY = 'carsija_admin_session';
const CSRF_TOKEN_KEY = 'carsija_csrf_token';

// Rate limiting configuration
const RATE_LIMIT = {
    maxActions: 20, // Maximum actions per window
    windowMs: 60000, // 1 minute window
    actions: []
};

// Security: Rate limiting for admin actions
function checkRateLimit() {
    const now = Date.now();
    // Remove old actions outside the window
    RATE_LIMIT.actions = RATE_LIMIT.actions.filter(
        time => now - time < RATE_LIMIT.windowMs
    );
    
    if (RATE_LIMIT.actions.length >= RATE_LIMIT.maxActions) {
        throw new Error('Previše akcija u kratkom vremenu. Molimo sačekajte jedan minut.');
    }
    
    RATE_LIMIT.actions.push(now);
    return true;
}

// Security: Generate secure random token
function generateSecureToken() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Security: Input sanitization
function sanitizeInput(input, maxLength = 255) {
    if (typeof input !== 'string') return '';
    return input.trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .substring(0, maxLength);
}

// Security: Validate price
function validatePrice(price) {
    if (!price || typeof price !== 'string') return false;
    const trimmed = price.trim();
    if (trimmed === 'NIJE DOSTUPNO' || trimmed === 'Nije dostupno') return true;
    const num = parseFloat(trimmed.replace(' KM', '').trim());
    return !isNaN(num) && num >= 0 && num <= 1000000;
}

// Security: Validate category
function validateCategory(category) {
    const validCategories = [
        'ves-masine', 'masine-za-sudje', 'frizideri', 
        'klima-uredjaji', 'ugradni-aparati', 'stednjaci', 'televizori'
    ];
    return validCategories.includes(category);
}

// Security: Validate image (basic check)
function validateImage(imageData) {
    if (!imageData || typeof imageData !== 'string') return false;
    // Check if it's a valid base64 image or URL
    if (imageData.startsWith('data:image/')) {
        const base64 = imageData.split(',')[1];
        if (!base64) return false;
        // Check size (max 5MB base64 = ~6.7MB original)
        if (base64.length > 7000000) return false;
        return true;
    }
    if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
        return true;
    }
    return false;
}

// Initialize Supabase connection
function getSupabaseClient() {
    if (typeof window.getSupabase === 'function') {
        return window.getSupabase();
    }
    console.error('Supabase not initialized. Make sure supabase-config.js is loaded.');
    return null;
}

// Initialize products from Supabase
async function initializeProducts() {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.warn('Supabase not available, using localStorage fallback');
            return;
        }
        
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: true });
            
        if (error) {
            console.error('Error fetching products:', error);
            return;
        }
        
        console.log(`Loaded ${data ? data.length : 0} products from Supabase`);
        
        // If no products exist, extract from HTML and save to Supabase
        if (!data || data.length === 0) {
            const htmlProducts = extractProductsFromHTML();
            if (htmlProducts.length > 0) {
                console.log(`Found ${htmlProducts.length} products in HTML, migrating to Supabase...`);
                let successCount = 0;
                let errorCount = 0;
                
                for (const product of htmlProducts) {
                    try {
                        await addProductToSupabase(product);
                        successCount++;
                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 50));
                    } catch (error) {
                        console.error(`Error saving product "${product.name}":`, error);
                        errorCount++;
                    }
                }
                console.log(`Migration complete: ${successCount} successful, ${errorCount} errors`);
            }
        } else {
            // Log products by category for debugging
            const productsByCategory = data.reduce((acc, p) => {
                acc[p.category] = (acc[p.category] || 0) + 1;
                return acc;
            }, {});
            console.log('Products by category in Supabase:', productsByCategory);
        }
    } catch (error) {
        console.error('Error initializing products:', error);
    }
}

// Manual migration function - can be called from console
async function migrateAllProductsFromHTML() {
    console.log('Starting manual migration of all products from HTML to Supabase...');
    
    const supabase = getSupabaseClient();
    if (!supabase) {
        console.error('Supabase not available!');
        return;
    }
    
    // First, get existing products to avoid duplicates
    const { data: existingProducts } = await supabase
        .from('products')
        .select('name, category');
    
    const existingSet = new Set(
        (existingProducts || []).map(p => `${p.category}::${p.name}`)
    );
    
    console.log(`Found ${existingSet.size} existing products in Supabase`);
    
    // Extract all products from HTML
    const htmlProducts = extractProductsFromHTML();
    console.log(`Found ${htmlProducts.length} products in HTML`);
    
    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const product of htmlProducts) {
        const key = `${product.category}::${product.name}`;
        
        // Skip if already exists
        if (existingSet.has(key)) {
            skippedCount++;
            continue;
        }
        
        try {
            await addProductToSupabase(product);
            existingSet.add(key); // Add to set to avoid duplicates in same migration
            addedCount++;
            console.log(`✓ Added: ${product.name} (${product.category})`);
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`✗ Error adding "${product.name}":`, error);
            errorCount++;
        }
    }
    
    console.log(`\nMigration Summary:`);
    console.log(`  Added: ${addedCount}`);
    console.log(`  Skipped (already exists): ${skippedCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Total: ${htmlProducts.length}`);
    
    // Re-render products after migration
    if (addedCount > 0 && typeof renderProducts === 'function') {
        console.log('Re-rendering products...');
        await renderProducts();
    }
    
    return { added: addedCount, skipped: skippedCount, errors: errorCount };
}

// Make migration function globally accessible
window.migrateAllProductsFromHTML = migrateAllProductsFromHTML;

// Extract products from existing HTML structure
function extractProductsFromHTML() {
    const products = [];
    const categorySections = document.querySelectorAll('.category-section');
    
    console.log(`Found ${categorySections.length} category sections in HTML`);
    
    categorySections.forEach(section => {
        const categoryTitle = section.querySelector('.category-title');
        if (!categoryTitle) {
            console.warn('Category section without title found');
            return;
        }
        
        const categoryId = categoryTitle.id;
        const categoryName = categoryTitle.textContent.trim();
        
        // Get ALL product cards, not just those without data-product-id
        // This ensures we get all products from HTML
        const productCards = section.querySelectorAll('.product-card');
        
        console.log(`Category ${categoryId} (${categoryName}): Found ${productCards.length} product cards`);
        
        productCards.forEach((card, index) => {
            const img = card.querySelector('.product-image');
            const nameEl = card.querySelector('h3');
            const priceEl = card.querySelector('.product-price');
            
            if (img && nameEl && priceEl) {
                const product = {
                    category: categoryId,
                    category_name: categoryName,
                    name: nameEl.textContent.trim(),
                    price: priceEl.textContent.trim(),
                    image: img.src,
                    image_alt: img.alt || '',
                    is_base64: false
                };
                products.push(product);
            } else {
                console.warn(`Product card ${index} in ${categoryId} missing required elements`);
            }
        });
    });
    
    console.log(`Extracted ${products.length} total products from HTML`);
    return products;
}

// Fetch products from Supabase
async function fetchProducts() {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.warn('Supabase not available');
            return [];
        }
        
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: true });
            
        if (error) {
            console.error('Error fetching products:', error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

// Get products by category
async function getProductsByCategory(categoryId) {
    try {
        const products = await fetchProducts();
        const filtered = products.filter(p => p.category === categoryId);
        console.log(`getProductsByCategory(${categoryId}): Found ${filtered.length} products out of ${products.length} total`);
        return filtered;
    } catch (error) {
        console.error(`Error getting products for category ${categoryId}:`, error);
        return [];
    }
}

// Add product to Supabase
async function addProductToSupabase(product) {
    try {
        // Security checks
        if (!isAdminLoggedIn()) {
            throw new Error('Niste prijavljeni kao admin!');
        }
        
        checkRateLimit();
        
        // Validate and sanitize inputs
        if (!validateCategory(product.category)) {
            throw new Error('Nevažeća kategorija!');
        }
        
        const sanitizedName = sanitizeInput(product.name, 255);
        if (!sanitizedName || sanitizedName.length < 2) {
            throw new Error('Naziv proizvoda mora imati najmanje 2 karaktera!');
        }
        
        if (!validatePrice(product.price)) {
            throw new Error('Nevažeća cijena!');
        }
        
        if (!validateImage(product.image)) {
            throw new Error('Nevažeća slika!');
        }
        
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { data, error } = await supabase
            .from('products')
            .insert([{
                category: product.category,
                category_name: sanitizeInput(product.categoryName || product.category_name, 100),
                name: sanitizedName,
                price: product.price,
                image: product.image,
                image_alt: sanitizeInput(product.imageAlt || product.image_alt || product.name, 255),
                is_base64: product.isBase64 !== undefined ? product.isBase64 : (product.is_base64 || false)
            }])
            .select()
            .single();
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error adding product:', error);
        throw error;
    }
}

// Update product in Supabase
async function updateProductInSupabase(productId, updates) {
    try {
        // Security checks
        if (!isAdminLoggedIn()) {
            throw new Error('Niste prijavljeni kao admin!');
        }
        
        checkRateLimit();
        
        // Validate product ID
        if (!productId || typeof productId !== 'string') {
            throw new Error('Nevažeći ID proizvoda!');
        }
        
        // Validate and sanitize inputs
        if (!validateCategory(updates.category)) {
            throw new Error('Nevažeća kategorija!');
        }
        
        const sanitizedName = sanitizeInput(updates.name, 255);
        if (!sanitizedName || sanitizedName.length < 2) {
            throw new Error('Naziv proizvoda mora imati najmanje 2 karaktera!');
        }
        
        if (!validatePrice(updates.price)) {
            throw new Error('Nevažeća cijena!');
        }
        
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const updateData = {
            category: updates.category,
            category_name: sanitizeInput(updates.categoryName, 100),
            name: sanitizedName,
            price: updates.price
        };
        
        if (updates.image !== undefined) {
            if (!validateImage(updates.image)) {
                throw new Error('Nevažeća slika!');
            }
            updateData.image = updates.image;
        }
        
        if (updates.imageAlt !== undefined) {
            updateData.image_alt = sanitizeInput(updates.imageAlt, 255);
        }
        
        if (updates.isBase64 !== undefined) {
            updateData.is_base64 = updates.isBase64;
        }
        
        const { data, error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', productId)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating product:', error);
        throw error;
    }
}

// Delete product from Supabase
async function deleteProductFromSupabase(productId) {
    try {
        // Security checks
        if (!isAdminLoggedIn()) {
            throw new Error('Niste prijavljeni kao admin!');
        }
        
        checkRateLimit();
        
        // Validate product ID
        if (!productId || typeof productId !== 'string') {
            throw new Error('Nevažeći ID proizvoda!');
        }
        
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase not initialized');
        
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);
            
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting product:', error);
        throw error;
    }
}

// Admin login (simple client-side check)
// NOTE: For production, use Supabase Auth instead
function adminLogin(username, password) {
    // Sanitize inputs
    const sanitizedUsername = sanitizeInput(username, 100);
    const sanitizedPassword = sanitizeInput(password, 100);
    
    // Rate limiting for login attempts
    try {
        checkRateLimit();
    } catch (error) {
        console.error('Rate limit exceeded for login');
        return false;
    }
    
    if (sanitizedUsername === ADMIN_CREDENTIALS.username && sanitizedPassword === ADMIN_CREDENTIALS.password) {
        // Create secure session with token and expiry
        const session = {
            token: generateSecureToken(),
            expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            createdAt: Date.now()
        };
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
        
        // Generate CSRF token
        const csrfToken = generateSecureToken();
        localStorage.setItem(CSRF_TOKEN_KEY, csrfToken);
        
        return true;
    }
    return false;
}

// Admin logout
function adminLogout() {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(CSRF_TOKEN_KEY);
    // Clear rate limit
    RATE_LIMIT.actions = [];
}

// Check if admin is logged in
function isAdminLoggedIn() {
    const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!sessionData) return false;
    
    try {
        const session = JSON.parse(sessionData);
        // Check if session expired
        if (Date.now() > session.expires) {
            adminLogout();
            return false;
        }
        return true;
    } catch {
        // Invalid session data
        adminLogout();
        return false;
    }
}

// Get CSRF token
function getCSRFToken() {
    return localStorage.getItem(CSRF_TOKEN_KEY) || '';
}

// Verify CSRF token
function verifyCSRFToken(token) {
    const storedToken = localStorage.getItem(CSRF_TOKEN_KEY);
    return storedToken && storedToken === token;
}

// Render products to the page
async function renderProducts() {
    const categories = [
        { id: 'ves-masine', name: 'Veš mašine' },
        { id: 'masine-za-sudje', name: 'Mašine za sudje' },
        { id: 'frizideri', name: 'Frižideri' },
        { id: 'klima-uredjaji', name: 'Klime' },
        { id: 'ugradni-aparati', name: 'Električni šporeti' },
        { id: 'stednjaci', name: 'Štednjaci' },
        { id: 'televizori', name: 'Televizori' }
    ];
    
    console.log('Starting to render products for all categories...');
    
    for (const category of categories) {
        try {
            const categorySection = Array.from(document.querySelectorAll('.category-section')).find(sec => {
                const title = sec.querySelector('.category-title');
                return title && title.id === category.id;
            });
            
            if (categorySection) {
                console.log(`Rendering category: ${category.id} (${category.name})`);
                await renderCategoryProducts(categorySection, category.id, category.name);
            } else {
                console.warn(`Category section not found for: ${category.id}`);
            }
        } catch (error) {
            console.error(`Error rendering category ${category.id}:`, error);
            // Continue with next category even if this one fails
        }
    }
    
    console.log('Finished rendering all categories');
}

// Render products for a specific category
async function renderCategoryProducts(section, categoryId, categoryName) {
    const productGrid = section.querySelector('.product-grid');
    if (!productGrid) {
        console.warn(`Product grid not found for category: ${categoryId}`);
        return;
    }
    
    try {
        // Get products from Supabase
        const products = await getProductsByCategory(categoryId);
        console.log(`Found ${products.length} products for category ${categoryId}:`, products);
        
        // Clear all existing product cards
        const allProductCards = productGrid.querySelectorAll('.product-card');
        console.log(`Clearing ${allProductCards.length} existing product cards for category ${categoryId}`);
        allProductCards.forEach(card => {
            card.remove();
        });
        
        // Add products from Supabase
        if (products && products.length > 0) {
            products.forEach((product, index) => {
                try {
                    const productCard = createProductCard(product);
                    productGrid.appendChild(productCard);
                    console.log(`Added product ${index + 1}/${products.length}: ${product.name}`);
                } catch (error) {
                    console.error(`Error creating card for product ${product.name}:`, error);
                }
            });
            console.log(`Successfully rendered ${products.length} products for category ${categoryId}`);
        } else {
            console.warn(`No products found in Supabase for category: ${categoryId}`);
        }
    } catch (error) {
        console.error(`Error rendering products for category ${categoryId}:`, error);
    }
}

// Create a product card element
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-product-id', product.id);
    
    const img = document.createElement('img');
    img.src = product.image;
    img.alt = product.image_alt || product.name;
    img.className = 'product-image';
    
    const info = document.createElement('div');
    info.className = 'product-info';
    
    const h3 = document.createElement('h3');
    h3.textContent = product.name;
    
    const price = document.createElement('div');
    price.className = 'product-price';
    price.textContent = product.price;
    
    // Add h3 and price first
    info.appendChild(h3);
    info.appendChild(price);
    
    // Add buttons based on user role
    if (isAdminLoggedIn()) {
        // Admin sees only Edit button
        const editButton = document.createElement('button');
        editButton.className = 'edit-button';
        editButton.textContent = 'Uredi';
        editButton.style.cssText = 'background-color: #75ACC8; color: white; padding: 0.5rem 1rem; border: none; border-radius: 25px; font-weight: bold; cursor: pointer; margin-top: 0.5rem; width: 100%;';
        editButton.addEventListener('click', () => openEditProductModal(product));
        info.appendChild(editButton);
    } else {
        // Regular users see only Buy button
        const buyButton = document.createElement('button');
        buyButton.className = 'buy-button';
        buyButton.textContent = 'Kupi';
        buyButton.addEventListener('click', function() {
            const productName = h3.textContent;
            const url = `kupi.html?product=${encodeURIComponent(productName)}`;
            window.open(url, '_blank', 'noopener');
        });
        info.appendChild(buyButton);
    }
    
    card.appendChild(img);
    card.appendChild(info);
    
    return card;
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Export functions for use in other scripts
window.AdminSystem = {
    login: adminLogin,
    logout: adminLogout,
    isLoggedIn: isAdminLoggedIn,
    addProduct: addProductToSupabase,
    updateProduct: updateProductInSupabase,
    deleteProduct: deleteProductFromSupabase,
    getProducts: fetchProducts,
    getProductsByCategory: getProductsByCategory,
    renderProducts: renderProducts,
    fileToBase64: fileToBase64
};

// Make renderProducts globally accessible
window.renderProducts = renderProducts;

// Initialize admin system when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    await initializeProducts();
    if (document.querySelector('.product-grid')) {
        setTimeout(async () => {
            await renderProducts();
        }, 500);
    }
    if (typeof updateAdminUI === 'function') {
        updateAdminUI();
    }
});
