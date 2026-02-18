// ========== AUTHENTICATION MODULE ==========
import { getClient, seedDefaultCategories } from './supabase-client.js';

let onAuthChange = null;

export function setAuthCallback(callback) {
    onAuthChange = callback;
}

export function initAuth() {
    const supabase = getClient();

    supabase.auth.onAuthStateChange((event, session) => {
        console.log('[Auth]', event, session?.user?.email);
        if (onAuthChange) onAuthChange(event, session);
    });
}

export async function signUp(email, password) {
    const supabase = getClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) throw error;

    // Seed default categories for new users
    if (data.user && !data.user.identities?.length === 0) {
        // User already exists
        throw new Error('Email sudah terdaftar. Silakan login.');
    }

    return data;
}

export async function signIn(email, password) {
    const supabase = getClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        if (error.message.includes('Invalid login')) {
            throw new Error('Email atau password salah.');
        }
        throw error;
    }

    return data;
}

export async function signOut() {
    const supabase = getClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function getSession() {
    const supabase = getClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
}

export async function getUser() {
    const session = await getSession();
    return session?.user || null;
}
