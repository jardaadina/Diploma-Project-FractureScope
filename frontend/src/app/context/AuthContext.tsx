import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface User {
    name: string;
    email: string;
    role: UserRole;
    userId: number;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, role: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await fetch('http://localhost:8081/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Error to login');
            }

            const data = await response.json();

            localStorage.setItem('token', data.token);

            const loggedInUser: User = {
                userId: data.userId,
                name: data.name,
                email: data.email,
                role: data.role.toUpperCase() as UserRole
            };

            localStorage.setItem('user', JSON.stringify(loggedInUser));
            setUser(loggedInUser);

        } catch (error) {
            console.error("Login Error:", error);
            throw error;
        }
    };

    const register = async (name: string, email: string, password: string, role: string) => {
        try {
            const response = await fetch('http://localhost:8081/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Error to register');
            }

            const data = await response.json();

            localStorage.setItem('token', data.token);

            const registeredUser: User = {
                userId: data.userId,
                name: data.name,
                email: data.email,
                role: data.role.toUpperCase() as UserRole
            };

            localStorage.setItem('user', JSON.stringify(registeredUser));
            setUser(registeredUser);

        } catch (error) {
            console.error("Register Error:", error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}