import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, X, Send, Loader2, Bot, User as UserIcon } from 'lucide-react';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

const API_BASE = 'http://localhost:8081';

const SUGGESTIONS = [
    'Ce este o fractură oblică?',
    'Cum se tratează o fractură de mână?',
    'Care sunt simptomele unei fracturi de șold?',
    'Cât durează vindecarea unei fracturi greenstick?',
];

export function ChatbotWidget() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content:
                'Salut! Sunt Dr. Scope, asistentul virtual FractureScope. Te pot ajuta cu întrebări despre fracturi, tipuri de fracturi, tratament și recuperare. Cu ce te pot ajuta?',
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!user) return null;

    const sendMessage = async (textOverride?: string) => {
        const text = (textOverride ?? input).trim();
        if (!text || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', content: text };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/chatbot/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userId: user.userId,
                    history: newMessages.slice(-8),
                }),
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || `Eroare ${res.status}`);
            }

            const data = await res.json();
            const reply: string =
                data.reply ?? 'Îmi pare rău, nu am putut genera un răspuns.';

            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: reply },
            ]);
        } catch (err: any) {
            console.error('Eroare chatbot:', err);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content:
                        '⚠️ Nu am putut contacta serverul AI. Verifică conexiunea și că backend-ul rulează. (' +
                        (err.message || 'Eroare necunoscută') +
                        ')',
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity z-50"
                    style={{ backgroundColor: '#5B5EA6' }}
                    aria-label="Deschide chatbot medical"
                >
                    <MessageCircle className="w-6 h-6" />
                </button>
            )}

            {isOpen && (
                <div
                    className="fixed bottom-6 right-6 w-[calc(100vw-3rem)] sm:w-96 max-w-md h-[600px] max-h-[calc(100vh-3rem)] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200"
                    role="dialog"
                    aria-label="Chatbot medical FractureScope"
                >
                    <div
                        className="flex items-center justify-between px-4 py-3 rounded-t-lg text-white"
                        style={{ backgroundColor: '#5B5EA6' }}
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">Dr. Scope</p>
                                <p className="text-xs opacity-80">
                                    Asistent medical FractureScope
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded hover:bg-white hover:bg-opacity-20 transition"
                            aria-label="Închide chatbot"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex gap-2 ${
                                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                                }`}
                            >
                                {msg.role === 'assistant' && (
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                                        style={{ backgroundColor: '#5B5EA6' }}
                                    >
                                        <Bot className="w-4 h-4" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[75%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
                                        msg.role === 'user'
                                            ? 'text-white rounded-br-none'
                                            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                                    }`}
                                    style={
                                        msg.role === 'user'
                                            ? { backgroundColor: '#5B5EA6' }
                                            : undefined
                                    }
                                >
                                    {msg.content}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-300 text-gray-700 flex-shrink-0">
                                        <UserIcon className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {messages.length === 1 && !isLoading && (
                            <div className="pt-2 space-y-2">
                                <p className="text-xs text-gray-500 px-1">
                                    Întrebări sugerate:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {SUGGESTIONS.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => sendMessage(s)}
                                            className="text-xs px-3 py-1.5 rounded-full border bg-white hover:bg-gray-100 text-gray-700"
                                            style={{ borderColor: '#5B5EA6', color: '#5B5EA6' }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isLoading && (
                            <div className="flex gap-2 justify-start">
                                <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white"
                                    style={{ backgroundColor: '#5B5EA6' }}
                                >
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="px-3 py-2 rounded-lg bg-white border border-gray-200 flex items-center gap-2 text-gray-500 text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Dr. Scope se gândește...</span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <div className="border-t border-gray-200 p-3 bg-white rounded-b-lg">
                        <div className="flex gap-2 items-end">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Întreabă-mă orice despre fracturi..."
                                rows={1}
                                disabled={isLoading}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 resize-none max-h-24 disabled:bg-gray-50"
                                style={{ '--tw-ring-color': '#5B5EA6' } as any}
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={!input.trim() || isLoading}
                                className="p-2 rounded-lg text-white hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                style={{
                                    backgroundColor:
                                        !input.trim() || isLoading ? undefined : '#5B5EA6',
                                }}
                                aria-label="Trimite mesaj"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}