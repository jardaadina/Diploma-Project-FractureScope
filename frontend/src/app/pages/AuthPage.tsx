import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, UserRole } from '../context/AuthContext';

export function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<UserRole>('PATIENT');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleTabSwitch = (loginMode: boolean) => {
        setIsLogin(loginMode);
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }

        if (password.length < 6) {
            setError('Password must contain at least 6 characters');
            return;
        }

        if (!isLogin) {
            if (name.trim().length < 2) {
                setError('Name must contain at least 2 characters');
                return;
            }

            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
        }

        setIsLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await register(name, email, password, role);
            }
            navigate('/test');
        } catch (err) {
            setError((err as Error).message || 'An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 relative overflow-hidden">
            <div
                className="absolute inset-0 bg-cover bg-center filter blur-sm opacity-20"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1200')`,
                }}
            />

            <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                    <div className="flex border-b border-gray-200 mb-6">
                        <button
                            onClick={() => handleTabSwitch(true)}
                            className="flex-1 pb-3 text-sm font-medium transition-colors"
                            style={isLogin ? { borderBottom: '2px solid #5B5EA6', color: '#5B5EA6' } : { color: '#6B7280' }}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => handleTabSwitch(false)}
                            className="flex-1 pb-3 text-sm font-medium transition-colors"
                            style={!isLogin ? { borderBottom: '2px solid #5B5EA6', color: '#5B5EA6' } : { color: '#6B7280' }}
                        >
                            Register
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label htmlFor="name-input" className="block text-sm font-medium text-gray-700 mb-1">
                                    Name
                                </label>
                                <input
                                    id="name-input"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                                    style={{ '--tw-ring-color': '#5B5EA6' } as any}
                                    required
                                    minLength={2}
                                    aria-required="true"
                                />
                            </div>
                        )}

                        <div>
                            <label htmlFor="email-input" className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                id="email-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                                style={{ '--tw-ring-color': '#5B5EA6' } as any}
                                required
                                aria-required="true"
                            />
                        </div>

                        <div>
                            <label htmlFor="password-input" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                id="password-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                                style={{ '--tw-ring-color': '#5B5EA6' } as any}
                                required
                                minLength={6}
                                aria-required="true"
                            />
                        </div>

                        {!isLogin && (
                            <>
                                <div>
                                    <label htmlFor="confirm-password-input" className="block text-sm font-medium text-gray-700 mb-1">
                                        Confirm Password
                                    </label>
                                    <input
                                        id="confirm-password-input"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                                        style={{ '--tw-ring-color': '#5B5EA6' } as any}
                                        required
                                        minLength={6}
                                        aria-required="true"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 mb-1">
                                        Account Type
                                    </label>
                                    <select
                                        id="role-select"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value as UserRole)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                                        style={{ '--tw-ring-color': '#5B5EA6' } as any}
                                        aria-label="Selectare tip cont"
                                    >
                                            <option value="PATIENT">Patient</option>
                                        <option value="DOCTOR">Doctor</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {error && (
                            <div
                                role="alert"
                                style={{
                                    color: '#A32D2D',
                                    background: '#FCEBEB',
                                    border: '0.5px solid #F09595',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    fontSize: '14px',
                                }}
                            >
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2 px-4 text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                            style={{
                                backgroundColor: '#5B5EA6',
                                opacity: isLoading ? 0.7 : 1,
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isLoading ? 'Processing...' : isLogin ? 'Log in' : 'Create account'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}