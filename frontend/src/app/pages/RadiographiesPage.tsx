import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { TabNavigation } from '../components/TabNavigation';
import { useAuth } from '../context/AuthContext';
import { Eye, Trash2, X, AlertCircle, ImageOff, RefreshCw } from 'lucide-react';

interface RadiographyDto {
    id: number;
    userId: number;
    filePath: string;
    anatomicRegion: string | null;
    uploadDate: string;
    hasFracture?: boolean | null;
    fractureType?: string | null;
    modelType?: string | null;
    confidence?: number | null;
}

const API_BASE = 'http://localhost:8081';

export function RadiographiesPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [radiographies, setRadiographies] = useState<RadiographyDto[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [imageUrls, setImageUrls] = useState<Record<number, string>>({});

    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState<boolean>(false);

    const [viewing, setViewing] = useState<RadiographyDto | null>(null);

    const [regionFilter, setRegionFilter] = useState<string>('all');

    useEffect(() => {
        if (!user) {
            navigate('/auth');
        }
    }, [user, navigate]);

    const fetchRadiographies = async () => {
        if (!user?.userId) return;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/radiographies/user/${user.userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || `Eroare ${res.status}`);
            }
            const data: RadiographyDto[] = await res.json();
            setRadiographies(data);
            loadImages(data);
        } catch (err: any) {
            console.error('Eroare la încărcarea radiografiilor:', err);
            setError(err.message || 'Eroare necunoscută');
        } finally {
            setLoading(false);
        }
    };

    const loadImages = async (list: RadiographyDto[]) => {
        const token = localStorage.getItem('token');
        const newUrls: Record<number, string> = {};
        await Promise.all(
            list.map(async (rad) => {
                try {
                    const r = await fetch(`${API_BASE}/api/radiographies/${rad.id}/image`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!r.ok) return;
                    const blob = await r.blob();
                    newUrls[rad.id] = URL.createObjectURL(blob);
                } catch (e) {
                    console.warn(`Nu am putut încărca imaginea pentru rad ${rad.id}`, e);
                }
            })
        );
        setImageUrls((prev) => {
            Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
            return newUrls;
        });
    };

    useEffect(() => {
        if (user?.userId) {
            fetchRadiographies();
        }
        return () => {
            setImageUrls((prev) => {
                Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
                return {};
            });
        };
    }, [user?.userId]);

    const handleDelete = async (id: number) => {
        setDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/radiographies/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || `Eroare ${res.status}`);
            }
            setRadiographies((prev) => prev.filter((r) => r.id !== id));
            setImageUrls((prev) => {
                if (prev[id]) URL.revokeObjectURL(prev[id]);
                const { [id]: _omit, ...rest } = prev;
                return rest;
            });
            setConfirmDeleteId(null);
        } catch (err: any) {
            console.error('Eroare la ștergere:', err);
            alert('Nu am putut șterge radiografia: ' + err.message);
        } finally {
            setDeleting(false);
        }
    };

    if (!user) return null;

    const uniqueRegions = Array.from(
        new Set(radiographies.map((r) => r.anatomicRegion).filter(Boolean) as string[])
    );

    const filtered = radiographies.filter((r) => {
        if (regionFilter === 'all') return true;
        return r.anatomicRegion === regionFilter;
    });

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleString('ro-RO', {
                dateStyle: 'short',
                timeStyle: 'short',
            });
        } catch {
            return iso;
        }
    };

    const verdictBadge = (rad: RadiographyDto) => {
        if (rad.hasFracture === true) {
            return (
                <span
                    className="px-2 py-1 text-xs font-semibold rounded-full"
                    style={{ backgroundColor: '#FFEBEE', color: '#E53935' }}
                >
                    FRACTURED
                </span>
            );
        }
        if (rad.hasFracture === false) {
            return (
                <span
                    className="px-2 py-1 text-xs font-semibold rounded-full"
                    style={{ backgroundColor: '#E8F5E9', color: '#43A047' }}
                >
                    UNFRACTURED
                </span>
            );
        }
        return (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
                N/A
            </span>
        );
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F0F0F0' }}>
            <Header />
            <TabNavigation />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                {/* Header pagină */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                            My Radiographies
                        </h1>

                    </div>

                    <button
                        onClick={fetchRadiographies}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Reload
                    </button>
                </div>

                {uniqueRegions.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex flex-wrap items-center gap-3">
                        <label htmlFor="region-filter" className="text-sm font-medium text-gray-700">
                            Filter after region:
                        </label>
                        <select
                            id="region-filter"
                            value={regionFilter}
                            onChange={(e) => setRegionFilter(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                            style={{ '--tw-ring-color': '#5B5EA6' } as any}
                        >
                            <option value="all">All</option>
                            {uniqueRegions.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                        <span className="text-sm text-gray-500 ml-auto">
                            {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
                        </span>
                    </div>
                )}

                {loading && (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <RefreshCw
                            className="w-8 h-8 mx-auto mb-3 animate-spin"
                            style={{ color: '#5B5EA6' }}
                        />
                        <p className="text-gray-600">Loading radiographies...</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-red-800">
                                Could not load the radiographies
                            </p>
                            <p className="text-sm text-red-700 mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {!loading && !error && radiographies.length === 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <ImageOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            No radiographies found.
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Go to <span className="font-medium">Test</span> și
                            Upload your first x-ray for analysis.
                        </p>
                        <button
                            onClick={() => navigate('/test')}
                            className="px-4 py-2 text-sm text-white rounded-lg hover:opacity-90"
                            style={{ backgroundColor: '#5B5EA6' }}
                        >
                            Go to Test
                        </button>
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((rad) => (
                            <div
                                key={rad.id}
                                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                            >
                                <div
                                    className="w-full h-48 bg-gray-100 flex items-center justify-center cursor-pointer"
                                    onClick={() => setViewing(rad)}
                                >
                                    {imageUrls[rad.id] ? (
                                        <img
                                            src={imageUrls[rad.id]}
                                            alt={`Radiografie ${rad.id}`}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <ImageOff className="w-10 h-10 text-gray-300" />
                                    )}
                                </div>

                                <div className="p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span
                                            className="px-2 py-1 text-xs font-medium rounded-full"
                                            style={{
                                                backgroundColor: '#E8E8F5',
                                                color: '#5B5EA6',
                                            }}
                                        >
                                            {rad.anatomicRegion || 'Nespecificat'}
                                        </span>
                                        {verdictBadge(rad)}
                                    </div>

                                    {rad.fractureType && (
                                        <p className="text-sm text-gray-700">
                                            <span className="font-medium">Type:</span>{' '}
                                            {rad.fractureType}
                                        </p>
                                    )}

                                    <p className="text-xs text-gray-500">
                                        {formatDate(rad.uploadDate)}
                                    </p>

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => setViewing(rad)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                                            style={{ color: '#5B5EA6' }}
                                        >
                                            <Eye className="w-4 h-4" />
                                            View
                                        </button>
                                        <button
                                            onClick={() => setConfirmDeleteId(rad.id)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-lg text-white hover:opacity-90"
                                            style={{ backgroundColor: '#E53935' }}
                                            aria-label="Șterge radiografia"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {confirmDeleteId !== null && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 rounded-full" style={{ backgroundColor: '#FFEBEE' }}>
                                <AlertCircle className="w-5 h-5" style={{ color: '#E53935' }} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Are you deleting the x-ray?
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    The action is permanent. The radiograph and associated analysis
                                    will be deleted from the database.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDeleteId)}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: '#E53935' }}
                            >
                                {deleting ? 'Se șterge...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewing && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-5xl w-full p-6 max-h-[92vh] overflow-y-auto">                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-gray-900">
                                X-ray details #{viewing.id}
                            </h3>
                            <button
                                onClick={() => setViewing(null)}
                                className="text-gray-400 hover:text-gray-600"
                                aria-label="Închide"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                         <div className="grid md:grid-cols-2 gap-6 items-start">
                                <div className="flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                                     {imageUrls[viewing.id] && (
                                         <img
                                             src={imageUrls[viewing.id]}
                                             alt={`Radiografie ${viewing.id}`}
                                             className="max-h-[45vh] md:max-h-[75vh] w-full object-contain rounded-lg"
                                         />
                                     )}
                                 </div>
                             <div className="space-y-4">
                            <span className="text-sm text-gray-500">
                                {formatDate(viewing.uploadDate)}
                            </span>

                            <div
                                className="text-2xl font-bold"
                                style={{
                                    color:
                                        viewing.hasFracture === true
                                            ? '#E53935'
                                            : viewing.hasFracture === false
                                                ? '#43A047'
                                                : '#5B5EA6',
                                }}
                            >
                                {viewing.anatomicRegion || 'Nespecificat'} —{' '}
                                {viewing.hasFracture === true
                                    ? 'FRACTURED'
                                    : viewing.hasFracture === false
                                        ? 'UNFRACTURED'
                                        : 'Status necunoscut'}
                            </div>

                            {viewing.fractureType && (
                                <p className="text-gray-700">
                                    Fracture Type: <strong>{viewing.fractureType}</strong>
                                </p>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {viewing.anatomicRegion && (
                                    <span
                                        className="px-3 py-1 rounded-full text-sm font-medium"
                                        style={{
                                            backgroundColor: '#E8E8F5',
                                            color: '#5B5EA6',
                                        }}
                                    >
                                        {viewing.anatomicRegion}
                                    </span>
                                )}
                                {viewing.fractureType && (
                                    <span
                                        className="px-3 py-1 rounded-full text-sm font-medium"
                                        style={{
                                            backgroundColor: '#FFEBEE',
                                            color: '#E53935',
                                        }}
                                    >
                                        {viewing.fractureType}
                                    </span>
                                )}
                                {viewing.modelType && (
                                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                                        Model: {viewing.modelType}
                                    </span>
                                )}
                            </div>

                            {viewing.confidence != null && (
                                <p className="text-sm text-gray-600">
                                    <strong>Model Confidence:</strong>{' '}
                                    {(viewing.confidence * 100).toFixed(1)}%
                                </p>
                            )}
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}