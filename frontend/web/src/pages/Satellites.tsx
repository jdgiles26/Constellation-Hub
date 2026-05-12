import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Satellite, Plus, Search, Filter, RefreshCw, X, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';

interface SatelliteData {
    id: number;
    name: string;
    norad_id?: string;
    constellation_id?: number;
    health_status?: string;
    tle_data?: { line1: string; line2: string; epoch?: string } | null;
    metadata?: Record<string, unknown>;
    created_at?: string;
    updated_at?: string;
}

export default function Satellites() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedSatellite, setSelectedSatellite] = useState<SatelliteData | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Form state for add satellite
    const [newSatName, setNewSatName] = useState('');
    const [newSatNorad, setNewSatNorad] = useState('');
    const [newSatConstellation, setNewSatConstellation] = useState('');
    const [newSatTle1, setNewSatTle1] = useState('');
    const [newSatTle2, setNewSatTle2] = useState('');

    // Fetch satellites
    const { data: satellitesResponse, isLoading, error } = useQuery({
        queryKey: ['satellites'],
        queryFn: async () => {
            const response = await api.getSatellites();
            return response.data;
        },
    });

    const satellites: SatelliteData[] = satellitesResponse?.data || [];

    // Create satellite mutation
    const createMutation = useMutation({
        mutationFn: (data: Record<string, unknown>) => api.createSatellite(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['satellites'] });
            setShowAddModal(false);
            resetForm();
        },
    });

    const resetForm = () => {
        setNewSatName('');
        setNewSatNorad('');
        setNewSatConstellation('');
        setNewSatTle1('');
        setNewSatTle2('');
    };

    const handleAddSatellite = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: Record<string, unknown> = {
            name: newSatName,
            norad_id: newSatNorad,
            constellation_id: newSatConstellation ? parseInt(newSatConstellation) : undefined,
        };
        if (newSatTle1 && newSatTle2) {
            payload.tle_data = {
                line1: newSatTle1,
                line2: newSatTle2,
            };
        }
        createMutation.mutate(payload);
    };

    const handleViewDetails = (sat: SatelliteData) => {
        setSelectedSatellite(sat);
        setShowDetailModal(true);
    };

    const filteredSatellites = satellites.filter((sat) => {
        const matchesSearch =
            sat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (sat.norad_id || '').includes(searchQuery);
        const matchesStatus =
            statusFilter === 'all' || (sat.health_status || '') === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'healthy':
            case 'nominal':
            case 'operational':
                return 'bg-aurora-500/20 text-aurora-400';
            case 'degraded':
                return 'bg-yellow-500/20 text-yellow-400';
            case 'critical':
            case 'failed':
                return 'bg-red-500/20 text-red-400';
            default:
                return 'bg-cosmic-500/20 text-cosmic-400';
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Satellites</h1>
                    <p className="text-white/60 mt-1">Manage constellation satellites and TLE data</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Satellite
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        type="text"
                        placeholder="Search satellites..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input w-full pl-10"
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-white/10' : ''}`}
                >
                    <Filter className="w-4 h-4" />
                    Filters
                </button>
                <button
                    onClick={() => navigate('/tle-admin')}
                    className="btn-secondary flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Update TLEs
                </button>
            </div>

            {/* Filter panel */}
            {showFilters && (
                <div className="card flex items-center gap-4">
                    <span className="text-sm text-white/60">Status:</span>
                    {['all', 'healthy', 'degraded', 'critical'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1 rounded-lg text-sm transition-all ${
                                statusFilter === status
                                    ? 'bg-cosmic-500 text-white'
                                    : 'bg-space-700 text-white/60 hover:bg-space-600'
                            }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            )}

            {/* Satellites table */}
            <div className="card">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-cosmic-400" />
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-red-400">
                        <p>Failed to load satellites</p>
                        <p className="text-sm text-white/40 mt-1">{(error as Error).message}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-white/60 text-sm border-b border-white/10">
                                    <th className="pb-3 pl-4">Satellite</th>
                                    <th className="pb-3">NORAD ID</th>
                                    <th className="pb-3">Constellation</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSatellites.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-white/40">
                                            No satellites found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSatellites.map((sat) => (
                                        <tr key={sat.id} className="table-row">
                                            <td className="py-4 pl-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-cosmic-500/20 rounded-lg flex items-center justify-center">
                                                        <Satellite className="w-4 h-4 text-cosmic-400" />
                                                    </div>
                                                    <span className="font-medium">{sat.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 font-mono text-sm text-white/70">
                                                {sat.norad_id || 'N/A'}
                                            </td>
                                            <td className="py-4">{sat.constellation_id || 'N/A'}</td>
                                            <td className="py-4">
                                                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(sat.health_status)}`}>
                                                    {sat.health_status || 'unknown'}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                <button
                                                    onClick={() => handleViewDetails(sat)}
                                                    className="text-cosmic-400 hover:text-cosmic-300 text-sm"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Satellite Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-space-800 rounded-xl border border-white/10 p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Add New Satellite</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-white/40 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddSatellite} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-1">Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={newSatName}
                                    onChange={(e) => setNewSatName(e.target.value)}
                                    className="input w-full"
                                    placeholder="e.g. SAT-006"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-1">NORAD ID</label>
                                <input
                                    type="text"
                                    value={newSatNorad}
                                    onChange={(e) => setNewSatNorad(e.target.value)}
                                    className="input w-full"
                                    placeholder="e.g. 25549"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-1">Constellation ID</label>
                                <input
                                    type="number"
                                    value={newSatConstellation}
                                    onChange={(e) => setNewSatConstellation(e.target.value)}
                                    className="input w-full"
                                    placeholder="e.g. 1"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-1">TLE Line 1</label>
                                <input
                                    type="text"
                                    value={newSatTle1}
                                    onChange={(e) => setNewSatTle1(e.target.value)}
                                    className="input w-full font-mono text-xs"
                                    placeholder="1 25544U 98067A   24001.00000000  .00020000  00000-0  28000-4 0  9999"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-1">TLE Line 2</label>
                                <input
                                    type="text"
                                    value={newSatTle2}
                                    onChange={(e) => setNewSatTle2(e.target.value)}
                                    className="input w-full font-mono text-xs"
                                    placeholder="2 25544  51.6416 247.4627 0006703 130.5360 229.5775 15.72125392 56353"
                                />
                            </div>
                            {createMutation.isError && (
                                <p className="text-red-400 text-sm">
                                    {(createMutation.error as Error)?.message || 'Failed to create satellite'}
                                </p>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    {createMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        'Create Satellite'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedSatellite && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-space-800 rounded-xl border border-white/10 p-6 w-full max-w-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">{selectedSatellite.name}</h2>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="text-white/40 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-white/60">NORAD ID</span>
                                <span className="font-mono">{selectedSatellite.norad_id || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-white/60">Constellation ID</span>
                                <span>{selectedSatellite.constellation_id || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-white/60">Health Status</span>
                                <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(selectedSatellite.health_status)}`}>
                                    {selectedSatellite.health_status || 'unknown'}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-white/60">Created</span>
                                <span>{selectedSatellite.created_at ? new Date(selectedSatellite.created_at).toLocaleString() : 'N/A'}</span>
                            </div>
                            {selectedSatellite.tle_data && (
                                <div className="space-y-2">
                                    <span className="text-white/60 text-sm">TLE Data</span>
                                    <div className="bg-space-900 rounded p-3 font-mono text-xs space-y-1">
                                        <p>{selectedSatellite.tle_data.line1}</p>
                                        <p>{selectedSatellite.tle_data.line2}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-6">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="btn-secondary w-full"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
