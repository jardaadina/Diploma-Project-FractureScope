import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';

export function TabNavigation() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const handleTabClick = (path: string) => {
        if (!user && path !== '/') {
            navigate('/auth');
        } else {
            navigate(path);
        }
    };

    const isActive = (path: string) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };

    const tabClass = (path: string) =>
        `py-4 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
            isActive(path)
                ? 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`;

    const tabStyle = (path: string) =>
        isActive(path) ? { borderColor: '#5B5EA6', color: '#5B5EA6' } : {};

    return (
        <div className="border-b border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <nav
                    className="flex gap-4 md:gap-8 overflow-x-auto"
                    role="navigation"
                    aria-label="Navigare principală"
                >
                    <button
                        onClick={() => handleTabClick('/')}
                        className={tabClass('/')}
                        style={tabStyle('/')}
                    >
                        OVERVIEW
                    </button>
                    <button
                        onClick={() => handleTabClick('/test')}
                        className={tabClass('/test')}
                        style={tabStyle('/test')}
                    >
                        TEST
                    </button>

                    {user && (
                        <button
                            onClick={() => handleTabClick('/radiographies')}
                            className={tabClass('/radiographies')}
                            style={tabStyle('/radiographies')}
                        >
                            MY RADIOGRAPHIES
                        </button>
                    )}

                    <button
                        onClick={() => handleTabClick('/statistics')}
                        className={tabClass('/statistics')}
                        style={tabStyle('/statistics')}
                    >
                        {user?.role === 'DOCTOR' ? 'ANALYTICS' : 'STATISTICS'}
                    </button>
                </nav>
            </div>
        </div>
    );
}