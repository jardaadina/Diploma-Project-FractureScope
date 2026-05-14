import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { TabNavigation } from '../components/TabNavigation';
import { useAuth } from '../context/AuthContext';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#5B5EA6', '#7B7EC9', '#9B9EDB', '#BBBEED', '#DBDEFF'];

const API_BASE = 'http://localhost:8081';

const fractureDescriptions: Record<string, { title: string; description: string; treatment: string; recovery: string }> = {
    'Oblique fracture': {
        title: 'Oblique fracture',
        description: 'An oblique fracture is a break in the bone that occurs at an angle to the bone\'s axis. It is often caused by an impact or twisting force.',
        treatment: 'Treatment may include immobilizing the bone with a cast or splint. In more severe cases, surgery may be required to realign the bone.',
        recovery: 'Healing typically takes 6–8 weeks, depending on severity and location.',
    },
    'Comminuted fracture': {
        title: 'Comminuted fracture',
        description: 'A comminuted fracture involves the bone being shattered into three or more fragments. It is commonly caused by high-impact trauma.',
        treatment: 'Usually requires surgery to fix the fragments using screws or metal plates.',
        recovery: 'Recovery can take 3–6 months, followed by physical therapy.',
    },
    'Greenstick fracture': {
        title: 'Greenstick fracture',
        description: 'A greenstick fracture occurs when the bone bends and cracks on one side without breaking completely. It is more common in children.',
        treatment: 'Usually treated with immobilization in a cast for a few weeks.',
        recovery: 'Healing typically occurs within 4–8 weeks.',
    },
    'Hairline Fracture': {
        title: 'Hairline Fracture',
        description: 'A hairline fracture is a small crack, often caused by repetitive overuse. It is common in athletes.',
        treatment: 'Rest and reduction of physical activity are essential. Surgery is rarely required.',
        recovery: 'Healing typically takes 6–8 weeks with adequate rest.',
    },
    'Avulsion fracture': {
        title: 'Avulsion fracture',
        description: 'Occurs when a fragment of bone is pulled away by a tendon or ligament following a strong muscular contraction.',
        treatment: 'Immobilization and rest in mild cases; surgery if the fragment is large or displaced.',
        recovery: 'Full recovery can take 3–12 weeks.',
    },
    'Fracture Dislocation': {
        title: 'Fracture Dislocation',
        description: 'Combines a bone fracture with dislocation of the adjacent joint. It is a serious injury.',
        treatment: 'Often requires surgery for realignment and stabilization.',
        recovery: 'Recovery takes several months, including intensive physical therapy.',
    },
    'Impacted fracture': {
        title: 'Impacted fracture',
        description: 'The two ends of the fractured bone are driven into each other, usually by an axial impact force.',
        treatment: 'Can be treated conservatively or surgically, depending on stability.',
        recovery: 'Typically 6–12 weeks, with careful monitoring.',
    },
    'Longitudinal fracture': {
        title: 'Longitudinal fracture',
        description: 'The fracture line follows the long axis of the bone. It is less common and usually results from compressive forces.',
        treatment: 'Immobilization or surgery depending on displacement.',
        recovery: 'Usually 6–10 weeks.',
    },
    'Pathological fracture': {
        title: 'Pathological fracture',
        description: 'Occurs in a bone weakened by disease (osteoporosis, tumor, infection), even following minor trauma.',
        treatment: 'Treatment addresses both the fracture and the underlying disease.',
        recovery: 'Variable, depending on the underlying cause.',
    },
    'Spiral Fracture': {
        title: 'Spiral Fracture',
        description: 'The fracture line spirals around the bone, caused by a torsional force.',
        treatment: 'Immobilization or surgery depending on severity and displacement.',
        recovery: 'Healing typically takes 6–8 weeks.',
    },
};

const defaultFractureDescription = {
    title: 'Unknown type fracture',
    description: 'No information is available for this fracture type.',
    treatment: 'Consult a doctor for a personalized treatment plan.',
    recovery: 'Recovery time varies depending on the case.',
};

export function StatisticsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [globalStats, setGlobalStats] = useState<any>(null);
    const [fractureInfo, setFractureInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchStatistics = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const globalRes = await fetch(`${API_BASE}/api/statistics/global`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!globalRes.ok) throw new Error('Could not find global statistics');
            const globalData = await globalRes.json();
            setGlobalStats(globalData);

            if (user?.userId) {
                const fractureRes = await fetch(
                    `${API_BASE}/api/statistics/user/${user.userId}/fracture-info`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!fractureRes.ok) throw new Error('Could not load fracture information');
                const fractureData = await fractureRes.json();
                setFractureInfo(fractureData);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
        fetchStatistics();
    }, [user]);

    if (!user) return null;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>SLoading statistics...</p>
            </div>
        );
    }

    if (user.role === 'DOCTOR') {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <TabNavigation />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">
                        Analytics Dashboard
                    </h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <span className="text-sm text-gray-600 block mb-2">Total analysis</span>
                            <p className="text-3xl font-bold text-gray-900">
                                {globalStats?.totalAnalyses ?? '—'}
                            </p>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <span className="text-sm text-gray-600 block mb-2">Detected Fracture</span>
                            <p className="text-3xl font-bold text-gray-900">
                                {globalStats?.fractureRate != null
                                    ? `${globalStats.fractureRate.toFixed(1)}%`
                                    : '—'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {globalStats?.fracturedCount ?? '—'} din {globalStats?.totalAnalyses ?? '—'} cases
                            </p>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <span className="text-sm text-gray-600 block mb-2">Most used model</span>
                            <p className="text-3xl font-bold text-gray-900">
                                {globalStats?.mostUsedModel ?? '—'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {globalStats?.mostUsedModelPercent != null
                                    ? `${globalStats.mostUsedModelPercent.toFixed(0)}% from analyses`
                                    : ''}
                            </p>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <span className="text-sm text-gray-600 block mb-2">Average Accuracy</span>
                            <p className="text-3xl font-bold text-gray-900">
                                {globalStats?.averageConfidence != null
                                    ? `${globalStats.averageConfidence.toFixed(1)}%`
                                    : '—'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                The most common types of fractures
                            </h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={globalStats?.fractureTypes ?? []}
                                    layout="vertical"
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={110} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#5B5EA6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Anatomic distribution
                            </h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={globalStats?.anatomicalDistribution ?? []}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) =>
                                            `${name} ${(percent * 100).toFixed(0)}%`
                                        }
                                        outerRadius={100}
                                        dataKey="value"
                                    >
                                        {(globalStats?.anatomicalDistribution ?? []).map(
                                            (_: any, index: number) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={COLORS[index % COLORS.length]}
                                                />
                                            )
                                        )}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Analyses per day (last 15 days)
                        </h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={globalStats?.dailyAnalyses ?? []}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#5B5EA6"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                    name="Analize"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    }

    const fractureDesc =
        fractureInfo?.fractureType
            ? fractureDescriptions[fractureInfo.fractureType] ?? defaultFractureDescription
            : null;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F0F0F0' }}>
            <Header />
            <TabNavigation />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">
                    General Statistics
                </h1>

                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        The most common types of fractures
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Data collected from the general patient population
                    </p>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={globalStats?.fractureTypes ?? []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#7B7EC9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        About your fracture type
                    </h2>

                    {fractureInfo && (
                        <p className="text-sm text-gray-500 mb-4">
                            You have performed{' '}
                            <strong>{fractureInfo.totalAnalyses}</strong>{' '}
                            {fractureInfo.totalAnalyses === 1 ? 'analysis' : 'analyses'}, from which{' '}
                            <strong>{fractureInfo.fracturedCount}</strong>{' '}
                            {fractureInfo.fracturedCount === 1
                                ? 'indicated'
                                : 'they indicated'}{' '}
                            a fracture.
                            {fractureInfo.anatomicRegion && (
                                <> Last region analyzed: <strong>{fractureInfo.anatomicRegion}</strong>.</>
                            )}
                        </p>
                    )}

                    {fractureInfo?.hasAnyFracture && fractureDesc ? (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div
                                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                                    style={{ backgroundColor: '#5B5EA6' }}
                                />
                                <div>
                                    <h3 className="font-medium text-gray-900">{fractureDesc.title}</h3>
                                    <p className="text-sm text-gray-600 mt-1">{fractureDesc.description}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div
                                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                                    style={{ backgroundColor: '#5B5EA6' }}
                                />
                                <div>
                                    <h3 className="font-medium text-gray-900">Treatment</h3>
                                    <p className="text-sm text-gray-600 mt-1">{fractureDesc.treatment}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div
                                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                                    style={{ backgroundColor: '#5B5EA6' }}
                                />
                                <div>
                                    <h3 className="font-medium text-gray-900">Recovery period</h3>
                                    <p className="text-sm text-gray-600 mt-1">{fractureDesc.recovery}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic">
                            {fractureInfo
                                ? 'Nu a fost detectată nicio fractură în analizele tale.'
                                : 'Nu au fost găsite informații despre fractura ta.'}
                        </p>
                    )}
                </div>

                <div
                    className="rounded-lg p-4"
                    style={{
                        backgroundColor: '#E8E8F5',
                        borderColor: '#5B5EA6',
                        borderWidth: '1px',
                    }}
                >
                    <p className="text-sm" style={{ color: '#5B5EA6' }}>
                        <strong>Disclaimer:</strong> This information is for guidance and educational purposes only.
                        For an accurate diagnosis and personalized treatment plan, please consult a medical professional.
                    </p>
                </div>
            </div>
        </div>
    );
}