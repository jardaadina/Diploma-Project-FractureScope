import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  showAuth?: boolean;
}

export function Header({ showAuth = true }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-gray-200" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button
            onClick={() => navigate('/')}
            className="hover:opacity-80 transition-opacity"
            aria-label="Înapoi la pagina principală"
          >
            <span className="text-xl md:text-2xl font-semibold" style={{ color: '#5B5EA6' }}>FractureScope</span>
          </button>

          {showAuth && (
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-700">
                    {user.name} <span className="text-gray-500">({user.role})</span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#5B5EA6' }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#5B5EA6' }}
                >
                  LOGIN
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
