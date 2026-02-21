// Supabase Configuration Template
// Copy this file to supabase-config.js and fill in your credentials
// DO NOT commit supabase-config.js to version control!

const SUPABASE_CONFIG = {
    url: 'https://ddwbekwmybpmlfjghsoh.supabase.co', // Example: 'https://xxxxx.supabase.co'
    anonKey: 'sb_publishable_o_-mBnPPGtL5F0OrJyaymg_fY-lIl_E' // Your Supabase Anon/Public Key
};

// Initialize Supabase client
let supabaseClient = null;

function initSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase library not loaded. Make sure to include supabase.js script.');
        return null;
    }
    
    if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
        console.error('Supabase URL not configured. Please update supabase-config.js');
        return null;
    }
    
    if (!SUPABASE_CONFIG.anonKey || SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
        console.error('Supabase Anon Key not configured. Please update supabase-config.js');
        return null;
    }
    
    supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    return supabaseClient;
}

function getSupabase() {
    if (!supabaseClient) {
        return initSupabase();
    }
    return supabaseClient;
}

// Export for use in other scripts
window.getSupabase = getSupabase;

