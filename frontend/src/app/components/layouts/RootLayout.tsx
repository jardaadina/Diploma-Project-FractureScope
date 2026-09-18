import { Outlet } from 'react-router';
import { ChatbotWidget } from '../ChatbotWidget';

export function RootLayout() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Outlet />
            <ChatbotWidget />
        </div>
    );
}