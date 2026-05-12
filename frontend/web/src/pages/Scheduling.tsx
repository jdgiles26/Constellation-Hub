import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Sparkles, Clock, X, Loader2, Satellite, Radio } from 'lucide-react';
import { api } from '../api/client';

interface Pass {
    id: number;
    satellite_id: number;
    station_id: number;
    station_name?: string;
    aos: string;
    los: string;
    duration_seconds: number;
    is_scheduled: boolean;
    max_elevation_deg?: number;
}

interface Schedule {
    id: number;
    name: string;
    total_contact_minutes: number;
    is_optimized: boolean;
    scheduled_passes: number[];
}

export default function Scheduling() {
    const queryClient = useQueryClient();
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showOptimizeModal, setShowOptimizeModal] = useState(false);
    const [scheduleName, setScheduleName] = useState('');
    const [optimizeResult, setOptimizeResult] = useState<Record<string, unknown> | null>(null);

    // Fetch passes and schedule
    const { data: passesResponse, isLoading: passesLoading } = useQuery({
        queryKey: ['passes'],
        queryFn: async () => {
            const response = await api.getPasses();
            return response.data;
        },
    });

    const { data: scheduleResponse, isLoading: scheduleLoading } = useQuery({
        queryKey: ['schedule'],
        queryFn: async () => {
            const response = await api.getSchedule();
            return response.data;
        },
    });

    const passes: Pass[] = passesResponse?.data || [];
    const schedule: Schedule | null = scheduleResponse || null;

    const scheduledPasses = passes.filter((p) => p.is_scheduled);
    const computedMinutes = scheduledPasses.reduce((sum, p) => sum + p.duration_seconds / 60, 0);
    const totalMinutes = schedule?.total_contact_minutes ?? computedMinutes;
    const optimizationScore = schedule?.is_optimized ? 85 : 0;

    // Generate schedule mutation
    const generateMutation = useMutation({
        mutationFn: (data: Record<string, unknown>) => api.generateSchedule(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule'] });
            queryClient.invalidateQueries({ queryKey: ['passes'] });
            setShowGenerateModal(false);
            setScheduleName('');
        },
    });

    // Optimize mutation
    const optimizeMutation = useMutation({
        mutationFn: (data: Record<string, unknown>) => api.optimizeSchedule(data),
        onSuccess: (response) => {
            setOptimizeResult(response.data);
            queryClient.invalidateQueries({ queryKey: ['schedule'] });
            queryClient.invalidateQueries({ queryKey: ['passes'] });
        },
    });

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        generateMutation.mutate({
            name: scheduleName || `Schedule ${now.toLocaleDateString()}`,
            start_time: now.toISOString(),
            end_time: tomorrow.toISOString(),
            prefer_high_elevation: true,
        });
    };

    const handleOptimize = () => {
        const passesData = passes.map((p) => ({
            id: p.id,
            satellite_id: p.satellite_id,
            station_id: p.station_id,
            aos: p.aos,
            los: p.los,
            duration_seconds: p.duration_seconds,
            is_scheduled: p.is_scheduled,
            max_elevation_deg: p.max_elevation_deg || 0,
        }));

        optimizeMutation.mutate({
            passes: passesData,
            data_queues: [],
            stations: [],
            constraints: { max_conflicts: 0 },
        });
    };

    const formatTime = (iso: string) => {
        try {
            return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return iso;
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Scheduling</h1>
                    <p className="text-white/60 mt-1">Pass scheduling and AI optimization</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowGenerateModal(true)}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <Calendar className="w-4 h-4" />
                        Generate Schedule
                    </button>
                    <button
                        onClick={() => {
                            setOptimizeResult(null);
                            setShowOptimizeModal(true);
                            handleOptimize();
                        }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        Optimize with AI
                    </button>
                </div>
            </div>

            {/* Timeline */}
            <div className="card">
                <h3 className="text-lg font-semibold mb-4">Schedule Timeline</h3>
                {passesLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-cosmic-400" />
                    </div>
                ) : scheduledPasses.length === 0 ? (
                    <div className="h-64 flex items-center justify-center border border-dashed border-white/20 rounded-lg">
                        <div className="text-center text-white/60">
                            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No scheduled passes yet</p>
                            <p className="text-sm">Generate a schedule to see passes here</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {scheduledPasses.map((pass) => (
                            <div
                                key={pass.id}
                                className="flex items-center gap-4 p-3 bg-space-700/50 rounded-lg"
                            >
                                <div className="w-10 h-10 bg-cosmic-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Satellite className="w-5 h-5 text-cosmic-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">Pass #{pass.id}</span>
                                        <span className="text-white/40 text-xs">{pass.station_name || `Station ${pass.station_id}`}</span>
                                    </div>
                                    <div className="text-xs text-white/60">
                                        {formatTime(pass.aos)} - {formatTime(pass.los)}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="text-sm font-medium">{(pass.duration_seconds / 60).toFixed(1)} min</div>
                                    <div className="text-xs text-white/40">{pass.max_elevation_deg?.toFixed(0)}° max elev</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card text-center">
                    <p className="text-3xl font-bold text-cosmic-400">{scheduledPasses.length}</p>
                    <p className="text-white/60 text-sm">Scheduled Passes</p>
                </div>
                <div className="card text-center">
                    <p className="text-3xl font-bold text-aurora-400">{Math.round(totalMinutes)}</p>
                    <p className="text-white/60 text-sm">Contact Minutes</p>
                </div>
                <div className="card text-center">
                    <p className="text-3xl font-bold text-nebula-400">{optimizationScore}%</p>
                    <p className="text-white/60 text-sm">Optimization Score</p>
                </div>
            </div>

            {/* Generate Schedule Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-space-800 rounded-xl border border-white/10 p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Generate New Schedule</h2>
                            <button
                                onClick={() => setShowGenerateModal(false)}
                                className="text-white/40 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-white/60 mb-1">Schedule Name</label>
                                <input
                                    type="text"
                                    value={scheduleName}
                                    onChange={(e) => setScheduleName(e.target.value)}
                                    className="input w-full"
                                    placeholder="e.g. Daily Schedule"
                                />
                            </div>
                            <p className="text-sm text-white/60">
                                This will generate a schedule for the next 24 hours using available passes.
                            </p>
                            {generateMutation.isError && (
                                <p className="text-red-400 text-sm">
                                    {(generateMutation.error as Error)?.message || 'Failed to generate schedule'}
                                </p>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowGenerateModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={generateMutation.isPending}
                                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    {generateMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        'Generate'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Optimize Modal */}
            {showOptimizeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-space-800 rounded-xl border border-white/10 p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">AI Schedule Optimization</h2>
                            <button
                                onClick={() => setShowOptimizeModal(false)}
                                className="text-white/40 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {optimizeMutation.isPending ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-cosmic-400 mb-4" />
                                <p className="text-white/60">Optimizing schedule with AI...</p>
                            </div>
                        ) : optimizeResult ? (
                            <div className="space-y-4">
                                <div className="p-3 bg-aurora-500/10 border border-aurora-500/20 rounded-lg">
                                    <p className="text-aurora-400 font-medium">Optimization Complete</p>
                                    <p className="text-sm text-white/60 mt-1">
                                        Strategy: {(optimizeResult as any).optimization_strategy}
                                    </p>
                                    <p className="text-sm text-white/60">
                                        Computation time: {(optimizeResult as any).computation_time_ms?.toFixed(0)}ms
                                    </p>
                                </div>
                                {(optimizeResult as any).recommendations?.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium mb-2">Recommendations:</p>
                                        <ul className="space-y-1">
                                            {(optimizeResult as any).recommendations.map((rec: string, i: number) => (
                                                <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                                                    <Sparkles className="w-3 h-3 text-nebula-400 mt-0.5 flex-shrink-0" />
                                                    {rec}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <button
                                    onClick={() => setShowOptimizeModal(false)}
                                    className="btn-primary w-full"
                                >
                                    Done
                                </button>
                            </div>
                        ) : optimizeMutation.isError ? (
                            <div className="text-center py-4">
                                <p className="text-red-400">
                                    {(optimizeMutation.error as Error)?.message || 'Optimization failed'}
                                </p>
                                <button
                                    onClick={() => setShowOptimizeModal(false)}
                                    className="btn-secondary mt-4"
                                >
                                    Close
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
