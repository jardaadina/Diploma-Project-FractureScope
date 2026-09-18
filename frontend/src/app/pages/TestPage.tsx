import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { TabNavigation } from '../components/TabNavigation';
import { useAuth } from '../context/AuthContext';
import { Upload, X, Eye, ArrowUpDown, RefreshCw } from 'lucide-react';

interface AnalysisResult {
    id: string;
    timestamp: Date;
    image: string;
    model: string;
    verdict: 'fractured' | 'not-fractured';
    boneType: string;
    fractureType?: string;
}

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

export function TestPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedModel, setSelectedModel] = useState<string>('YOLO');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
    const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [viewingResult, setViewingResult] = useState<AnalysisResult | null>(null);
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [fractureTypeFilter, setFractureTypeFilter] = useState<string>('all');
    const [sortColumn, setSortColumn] = useState<'timestamp' | 'verdict'>('timestamp');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        if (!user) {
            navigate('/auth');
        }
    }, [user, navigate]);

    const fetchHistoryFromBackend = async () => {
        if (!user?.userId) return;
        setLoadingHistory(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/radiographies/user/${user.userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`Error ${res.status}`);

            const data: RadiographyDto[] = await res.json();

            const results: AnalysisResult[] = await Promise.all(
                data.map(async (rad) => {
                    let imageUrl = '';
                    try {
                        const r = await fetch(`${API_BASE}/api/radiographies/${rad.id}/image`, {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        if (r.ok) {
                            const blob = await r.blob();
                            imageUrl = URL.createObjectURL(blob);
                        }
                    } catch {
                    }
                    return {
                        id: rad.id.toString(),
                        timestamp: new Date(rad.uploadDate),
                        image: imageUrl,
                        model: (rad.modelType || 'N/A').toUpperCase(),
                        verdict: rad.hasFracture ? 'fractured' : 'not-fractured',
                        boneType: rad.anatomicRegion || 'Nespecificat',
                        fractureType: rad.fractureType || undefined,
                    };
                })
            );

            setAnalysisHistory((prev) => {
                prev.forEach((p) => {
                    if (p.image.startsWith('blob:')) URL.revokeObjectURL(p.image);
                });
                return results;
            });
        } catch (err) {
            console.error('Error loading history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (user?.userId) {
            fetchHistoryFromBackend();
        }
        return () => {
            setAnalysisHistory((prev) => {
                prev.forEach((p) => {
                    if (p.image.startsWith('blob:')) URL.revokeObjectURL(p.image);
                });
                return [];
            });
        };
    }, [user?.userId]);

    if (!user) {
        return null;
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/dicom'];
            if (!validTypes.includes(file.type)) {
                alert('Invalid file type. Please upload a JPG, PNG or DICOM image.');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                alert('The file is too large. The maximum permitted size is 10MB.');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/dicom'];
            if (!validTypes.includes(file.type)) {
                alert('Invalid file type. Please upload a JPG, PNG or DICOM image.');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                alert('The file is too large. The maximum permitted size is 10MB.');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleSort = (column: 'timestamp' | 'verdict') => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
    };

    const filteredAndSortedHistory = analysisHistory
        .filter((item) => {
            const itemDate = item.timestamp.getTime();
            const fromTime = dateFrom ? new Date(dateFrom).getTime() : 0;
            const toTime = dateTo ? new Date(dateTo).setHours(23, 59, 59) : Infinity;

            const dateMatch = itemDate >= fromTime && itemDate <= toTime;
            const typeMatch =
                fractureTypeFilter === 'all' ||
                (fractureTypeFilter === 'fractured' && item.verdict === 'fractured') ||
                (fractureTypeFilter === 'not-fractured' && item.verdict === 'not-fractured');

            return dateMatch && typeMatch;
        })
        .sort((a, b) => {
            if (sortColumn === 'timestamp') {
                return sortDirection === 'asc'
                    ? a.timestamp.getTime() - b.timestamp.getTime()
                    : b.timestamp.getTime() - a.timestamp.getTime();
            } else {
                const aVal = a.verdict === 'fractured' ? 1 : 0;
                const bVal = b.verdict === 'fractured' ? 1 : 0;
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
        });

    const handleAnalyze = async () => {
        if (!selectedFile || !selectedModel || !user?.userId) return;

        setIsAnalyzing(true);
        setCurrentResult(null);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('model', selectedModel);
        formData.append('userId', user.userId.toString());

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/radiographies/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error message from server:', errorText);
                throw new Error(errorText);
            }

            const data = await response.json();

            const newResult: AnalysisResult = {
                id: data.radiography_id?.toString() ?? Date.now().toString(),
                timestamp: new Date(),
                image: `data:image/jpeg;base64,${data.result_image_base64}`,
                model: selectedModel.toUpperCase(),
                verdict: data.has_fracture ? 'fractured' : 'not-fractured',
                boneType: data.anatomic_region || 'Nespecificat',
                fractureType: data.fracture_type || undefined,
            };

            setCurrentResult(newResult);

            await fetchHistoryFromBackend();
        } catch (error) {
            console.error('Eroare:', error);
            alert('An error occured. Check the console for details.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const exportToCSV = () => {
        const headers = ['Date/Hour', 'Model', 'Verdict', 'Bone Type', 'Fracture Type'];
        const rows = analysisHistory.map((item) => [
            item.timestamp.toLocaleString('ro-RO'),
            item.model,
            item.verdict === 'fractured' ? 'FRACTURED' : 'UNFRACTURED',
            item.boneType,
            item.fractureType || 'N/A',
        ]);

        const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fracture-analysis-${new Date().toISOString()}.csv`;
        a.click();
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F0F0F0' }}>
            <Header />
            <TabNavigation />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                <div className="space-y-6 mb-8">
                    <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center transition-colors cursor-pointer bg-white"
                        style={{ borderColor: selectedFile ? '#5B5EA6' : undefined }}
                        onMouseEnter={(e) => {
                            if (!selectedFile) e.currentTarget.style.borderColor = '#5B5EA6';
                        }}
                        onMouseLeave={(e) => {
                            if (!selectedFile) e.currentTarget.style.borderColor = '';
                        }}
                    >
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">Drag & Drop files here or click to browse</p>
                        {selectedFile && (
                            <p className="text-sm font-medium" style={{ color: '#5B5EA6' }}>
                                {selectedFile.name}
                            </p>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/jpg"
                            onChange={handleFileSelect}
                            className="hidden"
                            aria-label="Load radiography"
                        />
                    </div>

                    <div>
                        <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 mb-2">
                            Select a Model
                        </label>
                        <select
                            id="model-select"
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                            style={{ '--tw-ring-color': '#5B5EA6' } as any}
                            aria-label="Selectare model AI"
                        >
                            <option value="YOLO">YOLO V8</option>
                            <option value="UNet">UNet</option>
                        </select>
                    </div>

                    <button
                        onClick={handleAnalyze}
                        disabled={!selectedFile || isAnalyzing}
                        className="w-full py-3 px-4 text-white rounded-lg transition-opacity font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                        style={{ backgroundColor: !selectedFile || isAnalyzing ? undefined : '#5B5EA6' }}
                    >
                        {isAnalyzing ? 'Analyzing...' : 'Upload & Analyze'}
                    </button>
                </div>

                {currentResult && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                                {currentResult.timestamp.toLocaleString('ro-RO')}
                            </span>
                        </div>

                        <div
                            className="text-2xl font-bold"
                            style={{ color: currentResult.verdict === 'fractured' ? '#E53935' : '#43A047' }}
                        >
                            {currentResult.boneType} —{' '}
                            {currentResult.verdict === 'fractured' ? 'FRACTURAED' : 'UNFRACTURED'}
                        </div>

                        {currentResult.fractureType && (
                            <p className="text-gray-700">
                                Fracture Type: {currentResult.fractureType.toLowerCase()}
                            </p>
                        )}

                        <div className="relative">
                            <img src={currentResult.image} alt="X-Ray Analysis" className="w-full max-h-[500px] object-contain rounded-lg"/>
                        </div>

                        <div className="flex gap-2">
                            <span
                                className="px-3 py-1 rounded-full text-sm font-medium"
                                style={{ backgroundColor: '#E8E8F5', color: '#5B5EA6' }}
                            >
                                {currentResult.boneType}
                            </span>
                            {currentResult.fractureType && (
                                <span
                                    className="px-3 py-1 rounded-full text-sm font-medium"
                                    style={{ backgroundColor: '#FFEBEE', color: '#E53935' }}
                                >
                                    {currentResult.fractureType}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {user?.role?.toUpperCase() === 'DOCTOR' && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 mt-8">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Analysis History (all yours)
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={fetchHistoryFromBackend}
                                    disabled={loadingHistory}
                                    className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <RefreshCw
                                        className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`}
                                    />
                                    Reload
                                </button>
                                <button
                                    onClick={exportToCSV}
                                    className="px-4 py-2 text-sm text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                                    style={{ backgroundColor: '#43A047' }}
                                    disabled={analysisHistory.length === 0}
                                >
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div>
                                <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-2">
                                    Start Date
                                </label>
                                <input
                                    id="date-from"
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                                    style={{ '--tw-ring-color': '#5B5EA6' } as any}
                                />
                            </div>
                            <div>
                                <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-2">
                                    End Date
                                </label>
                                <input
                                    id="date-to"
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                                    style={{ '--tw-ring-color': '#5B5EA6' } as any}
                                />
                            </div>
                            <div>
                                <label htmlFor="filter-verdict" className="block text-sm font-medium text-gray-700 mb-2">
                                    Verdict Filter
                                </label>
                                <select
                                    id="filter-verdict"
                                    value={fractureTypeFilter}
                                    onChange={(e) => setFractureTypeFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                                    style={{ '--tw-ring-color': '#5B5EA6' } as any}
                                >
                                    <option value="all">All</option>
                                    <option value="fractured">Fractured</option>
                                    <option value="not-fractured">Unfractured</option>
                                </select>
                            </div>
                        </div>

                        {loadingHistory && analysisHistory.length === 0 ? (
                            <div className="text-center text-gray-500 py-8 border-t border-gray-200 mt-4">
                                <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                                Loading History...
                            </div>
                        ) : analysisHistory.length === 0 ? (
                            <div className="text-center text-gray-500 py-8 border-t border-gray-200 mt-4">
                                No x-rays analyzed. <br />
                                Upload an image above to get started!
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-700">
                                            <button
                                                onClick={() => handleSort('timestamp')}
                                                className="flex items-center gap-1 hover:text-gray-900"
                                            >
                                                Date/Hour
                                                <ArrowUpDown className="w-4 h-4" />
                                            </button>
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-700">Image</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-700">Model</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-700">
                                            <button
                                                onClick={() => handleSort('verdict')}
                                                className="flex items-center gap-1 hover:text-gray-900"
                                            >
                                                Verdict
                                                <ArrowUpDown className="w-4 h-4" />
                                            </button>
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                    {filteredAndSortedHistory.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-900">
                                                {item.timestamp.toLocaleString('ro-RO', {
                                                    dateStyle: 'short',
                                                    timeStyle: 'short',
                                                })}
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt="Thumbnail"
                                                        className="w-12 h-12 object-cover rounded"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 bg-gray-200 rounded" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900">{item.model}</td>
                                            <td className="px-4 py-3">
                                                    <span
                                                        className="font-medium"
                                                        style={{
                                                            color:
                                                                item.verdict === 'fractured'
                                                                    ? '#E53935'
                                                                    : '#43A047',
                                                        }}
                                                    >
                                                        {item.verdict === 'fractured' ? 'FRACTURED' : 'UNFRACTURED'}
                                                    </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => setViewingResult(item)}
                                                    className="flex items-center gap-1 hover:opacity-80"
                                                    style={{ color: '#5B5EA6' }}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {viewingResult && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-gray-900">Details</h3>
                            <button
                                onClick={() => setViewingResult(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <span className="text-sm text-gray-500">
                                    {viewingResult.timestamp.toLocaleString('ro-RO')}
                                </span>
                            </div>

                            <div
                                className="text-2xl font-bold"
                                style={{
                                    color: viewingResult.verdict === 'fractured' ? '#E53935' : '#43A047',
                                }}
                            >
                                {viewingResult.boneType} —{' '}
                                {viewingResult.verdict === 'fractured' ? 'FRACTURED' : 'UNFRACTURED'}
                            </div>

                            {viewingResult.fractureType && (
                                <p className="text-gray-700">
                                    Fracture {viewingResult.fractureType.toLowerCase()}
                                </p>
                            )}

                            <div className="relative">
                                {viewingResult.image && (
                                    <img
                                        src={viewingResult.image}
                                        alt="X-Ray Analysis"
                                        className="w-full max-h-[500px] object-contain rounded-lg"
                                    />
                                )}
                            </div>

                            <div className="flex gap-2">
                                <span
                                    className="px-3 py-1 rounded-full text-sm font-medium"
                                    style={{ backgroundColor: '#E8E8F5', color: '#5B5EA6' }}
                                >
                                    {viewingResult.boneType}
                                </span>
                                {viewingResult.fractureType && (
                                    <span
                                        className="px-3 py-1 rounded-full text-sm font-medium"
                                        style={{ backgroundColor: '#FFEBEE', color: '#E53935' }}
                                    >
                                        {viewingResult.fractureType}
                                    </span>
                                )}
                            </div>

                            <div className="pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                    <strong>Used Model:</strong> {viewingResult.model}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}