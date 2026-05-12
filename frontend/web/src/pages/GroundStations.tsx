import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Radio, Plus, MapPin, X, Loader2 } from 'lucide-react';
import { api } from '../api/client';

interface GroundStation {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    elevation_m?: number;
    capabilities?: string[];
    health_status?: string;
    is_active?: boolean;
    location?: string;
}

export default function GroundStations() {
    const queryClient = useQueryClient();
    const [showAddModal, setShowAddModal] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [lat, setLat] = useState('');
    const [lon, setLon] = useState('');
    const [elevation, setElevation] = useState('');
    const [capabilities, setCapabilities] = useState('');

    // Fetch ground stations
    const { data: stationsResponse, isLoading, error } = useQuery({
        queryKey: ['groundStations'],
        queryFn: async () => {
            const response = await api.getGroundStations();
            return response.data;
        },
    });

    const stations: GroundStation[] = stationsResponse?.data || [];

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: Record<string, unknown>) => api.createGroundStation(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groundStations'] });
            setShowAddModal(false);
            resetForm();
        },
    });

    const resetForm = () => {
        setName('');
        setLat('');
        setLon('');
        setElevation('');
        setCapabilities('');
    };

    const handleAddStation = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            name,
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
            elevation_m: elevation ? parseFloat(elevation) : 0,
            capabilities: capabilities.split(',').map((c) => c.trim()).filter(Boolean),
        });
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'online':
            case 'nominal':
                return 'bg-aurora-500/20 text-aurora-400';
            case 'maintenance':
                return 'bg-yellow-500/20 text-yellow-400';
            case 'offline':
            case 'failed':
                return 'bg-red-500/20 text-red-400';
            default:
                return 'bg-cosmic-500/20 text-cosmic-400';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Ground Stations</h1>
                    <p className="text-white/60 mt-1">Manage ground station network</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Station
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-cosmic-400" />
                </div>
            ) : error ? (
                <div className="text-center py-8 text-red-400">
                    <p>Failed to load ground stations</p>
                    <p className="text-sm text-white/40 mt-1">{(error as Error).message}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stations.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-white/40">
                            No ground stations found
                        </div>
                    ) : (
                        stations.map((station) => (
                            <div key={station.id} className="card hover:border-white/20 transition-all">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${station.health_status === 'online' || station.health_status === 'nominal' ? 'bg-aurora-500/20' : 'bg-yellow-500/20'}`}>
                                            <Radio className={station.health_status === 'online' || station.health_status === 'nominal' ? 'text-aurora-400' : 'text-yellow-400'} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{station.name}</h3>
                                            <div className="flex items-center gap-1 text-sm text-white/60">
                                                <MapPin className="w-3 h-3" />
                                                {station.latitude?.toFixed(2)}, {station.longitude?.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {(station.capabilities || []).map((cap) => (
                                        <span key={cap} className="px-2 py-1 bg-space-600 rounded text-xs">{cap}</span>
                                    ))}
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(station.health_status)}`}>
                                        {station.health_status || 'unknown'}
                                    </span>
                                    <span className="text-xs text-white/40">
                                        Elev: {station.elevation_m ?? 0}m
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add Station Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-space-800 rounded-xl border border-white/10 p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Add New Ground Station</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-white/40 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddStation} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-1">Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input w-full"
                                    placeholder="e.g. GS-Delta"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-white/60 mb-1">Latitude *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        value={lat}
                                        onChange={(e) => setLat(e.target.value)}
                                        className="input w-full"
                                        placeholder="e.g. 40.7"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/60 mb-1">Longitude *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        value={lon}
                                        onChange={(e) => setLon(e.target.value)}
                                        className="input w-full"
                                        placeholder="e.g. -74.0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-1">Elevation (m)</label>
                                <input
                                    type="number"
                                    value={elevation}
                                    onChange={(e) => setElevation(e.target.value)}
                                    className="input w-full"
                                    placeholder="e.g. 10"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-1">Capabilities (comma separated)</label>
                                <input
                                    type="text"
                                    value={capabilities}
                                    onChange={(e) => setCapabilities(e.target.value)}
                                    className="input w-full"
                                    placeholder="e.g. S-band, X-band"
                                />
                            </div>
                            {createMutation.isError && (
                                <p className="text-red-400 text-sm">
                                    {(createMutation.error as Error)?.message || 'Failed to create station'}
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
                                        'Create Station'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
