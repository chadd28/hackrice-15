import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
// Use service role key for everything - it can do auth + bypass RLS
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
export const register = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        // Create user in Supabase Auth using service role
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    name: `${firstName} ${lastName}`
                }
            }
        });
        if (authError) {
            console.error('Auth error:', authError);
            return res.status(400).json({ error: authError.message });
        }
        if (!authData.user) {
            return res.status(400).json({ error: 'User creation failed' });
        }
        // Create profile in Profiles table (service role bypasses RLS automatically)
        const { data: profileData, error: profileError } = await supabase
            .from('Profiles')
            .insert({
            id: authData.user.id, // Link to auth.users
            first_name: firstName,
            last_name: lastName,
            email: email,
            display_name: null
        })
            .select()
            .single();
        if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't fail the registration if profile creation fails
        }
        res.status(201).json({
            message: 'User registered successfully',
            user: authData.user,
            session: authData.session,
            profile: profileData
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Login using service role
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) {
            console.error('Login error:', error);
            return res.status(400).json({ error: error.message });
        }
        // Get user profile (service role bypasses RLS)
        const { data: profileData } = await supabase
            .from('Profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
        res.status(200).json({
            message: 'Login successful',
            user: data.user,
            session: data.session,
            profile: profileData
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
