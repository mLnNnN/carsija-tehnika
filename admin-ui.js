// Admin UI Components
// Handles login modal, add product modal, edit product modal

// Show/hide login modal
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
        // Clear form
        const form = modal.querySelector('#loginForm');
        if (form) {
            form.reset();
        }
    }
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (AdminSystem.login(username, password)) {
        hideLoginModal();
        updateAdminUI();
        // Re-render products to show Edit buttons instead of Buy buttons
        if (typeof renderProducts === 'function') {
            await renderProducts();
        }
        alert('Uspešno ste se prijavili!');
    } else {
        alert('Pogrešno korisničko ime ili lozinka!');
    }
}

// Handle logout
async function handleLogout() {
    AdminSystem.logout();
    updateAdminUI();
    // Re-render products to show Buy buttons instead of Edit buttons
    if (typeof renderProducts === 'function') {
        await renderProducts();
    }
    alert('Uspešno ste se odjavili!');
}

// Update admin UI based on login status
function updateAdminUI() {
    const isLoggedIn = AdminSystem.isLoggedIn();
    const loginButton = document.getElementById('adminLoginBtn');
    const logoutButton = document.getElementById('adminLogoutBtn');
    const addProductButton = document.getElementById('addProductBtn');
    const migrateProductsButton = document.getElementById('migrateProductsBtn');
    
    if (loginButton) {
        loginButton.style.display = isLoggedIn ? 'none' : 'block';
    }
    if (logoutButton) {
        logoutButton.style.display = isLoggedIn ? 'block' : 'none';
    }
    if (addProductButton) {
        addProductButton.style.display = isLoggedIn ? 'block' : 'none';
    }
    if (migrateProductsButton) {
        migrateProductsButton.style.display = isLoggedIn ? 'block' : 'none';
    }
}

// Handle migrate products
async function handleMigrateProducts() {
    if (!confirm('Da li želite migrirati sve proizvode iz HTML-a u Supabase?\n\nOvo će dodati sve proizvode koji već ne postoje u bazi.')) {
        return;
    }
    
    const button = document.getElementById('migrateProductsBtn');
    const originalText = button.textContent;
    button.textContent = 'Migriram...';
    button.disabled = true;
    
    try {
        if (typeof window.migrateAllProductsFromHTML === 'function') {
            const result = await window.migrateAllProductsFromHTML();
            alert(`Migracija završena!\n\nDodano: ${result.added}\nPreskočeno: ${result.skipped}\nGreške: ${result.errors}`);
        } else {
            alert('Funkcija za migraciju nije dostupna. Provjerite konzolu za detalje.');
        }
    } catch (error) {
        console.error('Error during migration:', error);
        alert('Greška pri migraciji proizvoda! Provjerite konzolu za detalje.');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

// Show add product modal
function showAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) {
        modal.style.display = 'flex';
        // Reset form
        const form = modal.querySelector('#addProductForm');
        if (form) {
            form.reset();
            document.getElementById('productImagePreview').style.display = 'none';
        }
    }
}

// Hide add product modal
function hideAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Handle image preview
function handleImagePreview(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('productImagePreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Handle add product
async function handleAddProduct(event) {
    event.preventDefault();
    
    // Check if admin is logged in
    if (!AdminSystem.isLoggedIn()) {
        alert('Morate biti prijavljeni kao admin!');
        return;
    }
    
    const category = document.getElementById('productCategory').value;
    const categoryName = document.getElementById('productCategory').options[document.getElementById('productCategory').selectedIndex].text;
    const name = document.getElementById('productName').value;
    const price = document.getElementById('productPrice').value;
    const imageFile = document.getElementById('productImage').files[0];
    
    if (!category || !name || !price) {
        alert('Molimo popunite sva polja!');
        return;
    }
    
    // Validate price
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0 || priceNum > 1000000) {
        alert('Cijena mora biti između 0 i 1.000.000 KM!');
        return;
    }
    
    // Validate image file size (max 5MB)
    if (imageFile && imageFile.size > 5 * 1024 * 1024) {
        alert('Slika je prevelika! Maksimalna veličina je 5MB.');
        return;
    }
    
    let imageData = '';
    let isBase64 = false;
    
    if (imageFile) {
        try {
            imageData = await AdminSystem.fileToBase64(imageFile);
            isBase64 = true;
        } catch (error) {
            alert('Greška pri učitavanju slike!');
            return;
        }
    } else {
        alert('Molimo odaberite sliku!');
        return;
    }
    
    const product = {
        category: category,
        categoryName: categoryName,
        name: name,
        price: price + ' KM',
        image: imageData,
        imageAlt: name,
        isBase64: isBase64
    };
    
    try {
        await AdminSystem.addProduct(product);
        hideAddProductModal();
        
        if (typeof renderProducts === 'function') {
            await renderProducts();
        }
        
        alert('Proizvod je uspešno dodat!');
    } catch (error) {
        const errorMessage = error.message || 'Greška pri dodavanju proizvoda!';
        alert(errorMessage);
        console.error('Error adding product:', error);
    }
}

// Snapshot of edit form when modal opened (for detecting changes)
let editFormInitialSnapshot = null;

function getEditFormSnapshot() {
    const priceInput = document.getElementById('editProductPrice');
    const notAvailableCheckbox = document.getElementById('editProductNotAvailable');
    const priceValue = notAvailableCheckbox && notAvailableCheckbox.checked ? '' : (priceInput ? priceInput.value.trim() : '');
    const imageInput = document.getElementById('editProductImage');
    return {
        category: (document.getElementById('editProductCategory') || {}).value || '',
        name: (document.getElementById('editProductName') || {}).value.trim() || '',
        price: priceValue,
        notAvailable: !!(notAvailableCheckbox && notAvailableCheckbox.checked),
        hasNewImage: !!(imageInput && imageInput.files && imageInput.files.length > 0)
    };
}

function hasEditFormChanged() {
    if (!editFormInitialSnapshot) return false;
    const current = getEditFormSnapshot();
    return current.category !== editFormInitialSnapshot.category ||
        current.name !== editFormInitialSnapshot.name ||
        current.price !== editFormInitialSnapshot.price ||
        current.notAvailable !== editFormInitialSnapshot.notAvailable ||
        current.hasNewImage !== editFormInitialSnapshot.hasNewImage;
}

function updateEditSubmitButtonState() {
    const btn = document.getElementById('editProductUpdateBtn');
    if (!btn) return;
    const changed = hasEditFormChanged();
    btn.disabled = !changed;
    btn.classList.remove('btn-update-enabled', 'btn-update-disabled');
    btn.classList.add(changed ? 'btn-update-enabled' : 'btn-update-disabled');
}

// Show edit product modal
function openEditProductModal(product) {
    const modal = document.getElementById('editProductModal');
    if (!modal) return;
    
    // Reset image file input so "new image" is detectable
    const imageInput = document.getElementById('editProductImage');
    if (imageInput) imageInput.value = '';
    
    // Populate form with product data
    document.getElementById('editProductId').value = product.id;
    document.getElementById('editProductCategory').value = product.category;
    document.getElementById('editProductName').value = product.name;
    
    // Handle price - check if it's "NIJE DOSTUPNO"
    const priceInput = document.getElementById('editProductPrice');
    const notAvailableCheckbox = document.getElementById('editProductNotAvailable');
    const priceText = product.price ? product.price.trim() : '';
    
    if (priceText === 'NIJE DOSTUPNO' || priceText === 'Nije dostupno') {
        notAvailableCheckbox.checked = true;
        priceInput.value = '';
        priceInput.disabled = true;
        priceInput.required = false;
    } else {
        notAvailableCheckbox.checked = false;
        const priceValue = priceText.replace(' KM', '').trim();
        priceInput.value = priceValue;
        priceInput.disabled = false;
        priceInput.required = true;
    }
    
    const preview = document.getElementById('editProductImagePreview');
    if (product.image) {
        preview.src = product.image;
        preview.style.display = 'block';
    }
    
    // Snapshot initial state and set Ažuriraj button to disabled/faded
    editFormInitialSnapshot = getEditFormSnapshot();
    updateEditSubmitButtonState();
    
    // Listen for changes to enable green button
    const categoryEl = document.getElementById('editProductCategory');
    const nameEl = document.getElementById('editProductName');
    const priceEl = document.getElementById('editProductPrice');
    
    function onEditFormChange() {
        updateEditSubmitButtonState();
    }
    
    categoryEl.removeEventListener('change', onEditFormChange);
    nameEl.removeEventListener('input', onEditFormChange);
    priceEl.removeEventListener('input', onEditFormChange);
    notAvailableCheckbox.removeEventListener('change', onEditFormChange);
    if (imageInput) imageInput.removeEventListener('change', onEditFormChange);
    
    categoryEl.addEventListener('change', onEditFormChange);
    nameEl.addEventListener('input', onEditFormChange);
    priceEl.addEventListener('input', onEditFormChange);
    notAvailableCheckbox.addEventListener('change', onEditFormChange);
    if (imageInput) imageInput.addEventListener('change', onEditFormChange);
    
    modal.style.display = 'flex';
}

// Handle not available toggle
function handleNotAvailableToggle() {
    const checkbox = document.getElementById('editProductNotAvailable');
    const priceInput = document.getElementById('editProductPrice');
    
    if (checkbox.checked) {
        priceInput.value = '';
        priceInput.disabled = true;
        priceInput.required = false;
    } else {
        priceInput.disabled = false;
        priceInput.required = true;
    }
    updateEditSubmitButtonState();
}

// Hide edit product modal
function hideEditProductModal() {
    const modal = document.getElementById('editProductModal');
    if (modal) {
        modal.style.display = 'none';
        editFormInitialSnapshot = null;
        // Reset form state
        const priceInput = document.getElementById('editProductPrice');
        const notAvailableCheckbox = document.getElementById('editProductNotAvailable');
        if (priceInput) {
            priceInput.disabled = false;
            priceInput.required = true;
        }
        if (notAvailableCheckbox) {
            notAvailableCheckbox.checked = false;
        }
        const updateBtn = document.getElementById('editProductUpdateBtn');
        if (updateBtn) {
            updateBtn.disabled = true;
            updateBtn.classList.remove('btn-update-enabled');
            updateBtn.classList.add('btn-update-disabled');
        }
    }
}

// Handle edit product image preview
function handleEditImagePreview(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('editProductImagePreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Handle update product
async function handleUpdateProduct(event) {
    event.preventDefault();
    
    if (!hasEditFormChanged()) {
        return;
    }
    
    // Check if admin is logged in
    if (!AdminSystem.isLoggedIn()) {
        alert('Morate biti prijavljeni kao admin!');
        return;
    }
    
    const productId = document.getElementById('editProductId').value;
    const category = document.getElementById('editProductCategory').value;
    const categoryName = document.getElementById('editProductCategory').options[document.getElementById('editProductCategory').selectedIndex].text;
    const name = document.getElementById('editProductName').value;
    const priceInput = document.getElementById('editProductPrice');
    const notAvailableCheckbox = document.getElementById('editProductNotAvailable');
    const imageFile = document.getElementById('editProductImage').files[0];
    
    if (!category || !name) {
        alert('Molimo popunite sva obavezna polja!');
        return;
    }
    
    // Determine price based on checkbox
    let price;
    if (notAvailableCheckbox.checked) {
        price = 'NIJE DOSTUPNO';
    } else {
        const priceValue = priceInput.value;
        if (!priceValue) {
            alert('Molimo unesite cijenu ili označite "Nije dostupno"!');
            return;
        }
        // Validate price
        const priceNum = parseFloat(priceValue);
        if (isNaN(priceNum) || priceNum < 0 || priceNum > 1000000) {
            alert('Cijena mora biti između 0 i 1.000.000 KM!');
            return;
        }
        price = priceValue + ' KM';
    }
    
    const updates = {
        category: category,
        categoryName: categoryName,
        name: name,
        price: price
    };
    
    if (imageFile) {
        // Validate image file size (max 5MB)
        if (imageFile.size > 5 * 1024 * 1024) {
            alert('Slika je prevelika! Maksimalna veličina je 5MB.');
            return;
        }
        try {
            updates.image = await AdminSystem.fileToBase64(imageFile);
            updates.isBase64 = true;
        } catch (error) {
            alert('Greška pri učitavanju slike!');
            return;
        }
    }
    
    try {
        await AdminSystem.updateProduct(productId, updates);
        hideEditProductModal();
        
        if (typeof renderProducts === 'function') {
            await renderProducts();
        }
        
        alert('Proizvod je uspešno ažuriran!');
    } catch (error) {
        const errorMessage = error.message || 'Greška pri ažuriranju proizvoda!';
        alert(errorMessage);
        console.error('Error updating product:', error);
    }
}

// Handle delete product
async function handleDeleteProduct() {
    // Check if admin is logged in
    if (!AdminSystem.isLoggedIn()) {
        alert('Morate biti prijavljeni kao admin!');
        return;
    }
    
    const productId = document.getElementById('editProductId').value;
    const productName = document.getElementById('editProductName').value;
    
    if (!productId) {
        alert('Greška: Proizvod nije pronađen!');
        return;
    }
    
    // Confirm deletion
    if (!confirm(`Da li ste sigurni da želite obrisati proizvod "${productName}"?\n\nOva akcija se ne može poništiti!`)) {
        return;
    }
    
    try {
        await AdminSystem.deleteProduct(productId);
        hideEditProductModal();
        
        if (typeof renderProducts === 'function') {
            await renderProducts();
        }
        
        alert('Proizvod je uspešno obrisan!');
    } catch (error) {
        const errorMessage = error.message || 'Greška pri brisanju proizvoda!';
        alert(errorMessage);
        console.error('Error deleting product:', error);
    }
}

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    updateAdminUI();
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const loginModal = document.getElementById('loginModal');
        const addModal = document.getElementById('addProductModal');
        const editModal = document.getElementById('editProductModal');
        
        if (event.target === loginModal) {
            hideLoginModal();
        }
        if (event.target === addModal) {
            hideAddProductModal();
        }
        if (event.target === editModal) {
            hideEditProductModal();
        }
    });
});

