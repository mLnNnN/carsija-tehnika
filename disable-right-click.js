// Check if admin is logged in
function isAdminLoggedIn() {
    return localStorage.getItem('carsija_admin_session') === 'true';
}

// Disable right-click context menu on the entire website (except for admin)
document.addEventListener('contextmenu', function(e) {
    if (!isAdminLoggedIn()) {
        e.preventDefault();
        return false;
    }
});

// Also disable common keyboard shortcuts that could be used to access context menu (except for admin)
document.addEventListener('keydown', function(e) {
    // Allow F12 and dev tools for admin users
    if (isAdminLoggedIn()) {
        return true; // Allow all shortcuts for admin
    }
    
    // Disable F12 (Developer Tools)
    if (e.key === 'F12') {
        e.preventDefault();
        return false;
    }
    
    // Disable Ctrl+Shift+I (Developer Tools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
    }
    
    // Disable Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
    }
    
    // Disable Ctrl+U (View Source)
    if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
    }
    
    // Disable Ctrl+S (Save Page)
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
    }
});

// Disable text selection (optional - can be removed if you want users to select text)
// Allow text selection for admin
document.addEventListener('selectstart', function(e) {
    if (!isAdminLoggedIn()) {
        e.preventDefault();
        return false;
    }
});

// Disable drag and drop (except for admin)
document.addEventListener('dragstart', function(e) {
    if (!isAdminLoggedIn()) {
        e.preventDefault();
        return false;
    }
});

