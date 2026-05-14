import { Outlet } from 'react-router';
import { ChatbotWidget } from '../ChatbotWidget';

export function RootLayout() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Outlet />
            {/* Chatbot-ul se afișează pe toate paginile, dar doar dacă user-ul este logat
          (logica de afișare e în widget-ul însuși) */}
            <ChatbotWidget />
        </div>
    );
}