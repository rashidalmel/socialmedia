import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    // Token is handled automatically by the API interceptor
    // No need for manual header management

    // Check if user is logged in on app start - optimized
    useEffect(() => {
        const checkAuth = async () => {
            if (token) {
                try {
                    // Add timeout to prevent hanging on slow connections
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
                    
                    const response = await api.get('/api/auth/me', {
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    setUser(response.data);
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        localStorage.removeItem('token');
                        setToken(null);
                    }
                }
            }
            setLoading(false);
        };

        // Delay auth check slightly to improve perceived performance
        const timeoutId = setTimeout(checkAuth, 100);
        return () => clearTimeout(timeoutId);
    }, [token]);

    const login = async (email, password) => {
        try {
            const response = await api.post('/api/auth/login', { email, password });
            const { user, token } = response.data;
            
            localStorage.setItem('token', token);
            setToken(token);
            setUser(user);
            
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed'
            };
        }
    };

    const register = async (username, email, password) => {
        try {
            const response = await api.post('/api/auth/register', {
                username,
                email,
                password
            });
            const { user, token } = response.data;
            
            localStorage.setItem('token', token);
            setToken(token);
            setUser(user);
            
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Registration failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        // No need to delete axios headers as we're using interceptors
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
