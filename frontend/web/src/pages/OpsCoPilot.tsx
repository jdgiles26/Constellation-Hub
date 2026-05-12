import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bot, Send, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';

interface SuggestedAction {
    id: string;
    action: string;
    priority: string;
    status: string;
}

interface AnalysisResult {
    summary: string;
    key_findings: string[];
    suggested_actions: SuggestedAction[];
    risk_level: string;
    confidence: number;
    affected_satellites?: string[];
    affected_stations?: string[];
}

export default function OpsCoPilot() {
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [actions, setActions] = useState<SuggestedAction[]>([]);
    const [error, setError] = useState<string | null>(null);

    const analyzeMutation = useMutation({
        mutationFn: (data: Record<string, unknown>) => api.analyzeEvents(data),
        onSuccess: (response) => {
            const result = response.data as AnalysisResult;
            setAnalysis(result);
            setActions(result.suggested_actions || []);
            setError(null);
        },
        onError: (err: Error) => {
            setError(err.message || 'Analysis failed');
        },
    });

    const handleAnalyze = () => {
        setError(null);
        analyzeMutation.mutate({
            events: [
                {
                    id: 'evt-001',
                    type: 'missed_pass',
                    severity: 'warning',
                    satellite_id: 1,
                    station_id: 1,
                    timestamp: new Date().toISOString(),
                    description: 'Pass missed due to ground station conflict',
                },
                {
                    id: 'evt-002',
                    type: 'link_degradation',
                    severity: 'critical',
                    satellite_id: 2,
                    station_id: 2,
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    description: 'Signal strength below threshold',
                },
            ],
            context: {
                time_range: 'last_24h',
                focus: 'operational_efficiency',
            },
            focus_areas: ['pass_efficiency', 'ground_station_health'],
        });
    };

    const handleActionStatus = (actionId: string, status: 'applied' | 'dismissed') => {
        setActions((prev) =>
            prev.map((a) => (a.id === actionId ? { ...a, status } : a))
        );
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical':
                return 'bg-red-500/20 text-red-400';
            case 'high':
                return 'bg-yellow-500/20 text-yellow-400';
            case 'medium':
                return 'bg-cosmic-500/20 text-cosmic-400';
            default:
                return 'bg-space-600 text-white/60';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Ops Co-Pilot</h1>
                    <p className="text-white/60 mt-1">AI-powered operations assistant</p>
                </div>
                <button
                    onClick={handleAnalyze}
                    disabled={analyzeMutation.isPending}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                    {analyzeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                    {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze Events'}
                </button>
            </div>

            {error && (
                <div className="card border-red-500/20 bg-red-500/10">
                    <div className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="w-5 h-5" />
                        <p>{error}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Analysis Summary */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <Bot className="w-5 h-5 text-cosmic-400" />
                        <h3 className="text-lg font-semibold">Analysis Summary</h3>
                    </div>
                    {analysis ? (
                        <div className="space-y-4">
                            <p className="text-white/80">{analysis.summary}</p>
                            {analysis.key_findings && analysis.key_findings.length > 0 && (
                                <div className="space-y-2">
                                    {analysis.key_findings.map((finding, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm">
                                            <span className="text-cosmic-400">•</span>
                                            <span>{finding}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center gap-4 pt-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-white/60">Risk Level:</span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                        analysis.risk_level === 'high' || analysis.risk_level === 'critical'
                                            ? 'bg-red-500/20 text-red-400'
                                            : analysis.risk_level === 'medium'
                                                ? 'bg-yellow-500/20 text-yellow-400'
                                                : 'bg-aurora-500/20 text-aurora-400'
                                    }`}>
                                        {analysis.risk_level}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-white/60">Confidence:</span>
                                    <span className="text-xs font-medium">{Math.round((analysis.confidence || 0) * 100)}%</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-white/40">
                            <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Click "Analyze Events" to get AI insights</p>
                        </div>
                    )}
                </div>

                {/* Suggested Actions */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Suggested Actions</h3>
                    {actions.length > 0 ? (
                        <div className="space-y-3">
                            {actions.map((action) => (
                                <div
                                    key={action.id}
                                    className={`p-3 rounded-lg transition-all ${
                                        action.status === 'applied'
                                            ? 'bg-aurora-500/10 border border-aurora-500/20'
                                            : action.status === 'dismissed'
                                                ? 'bg-white/5 opacity-50'
                                                : 'bg-space-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(action.priority)}`}>
                                            {action.priority}
                                        </span>
                                        <div className="flex gap-2">
                                            {action.status !== 'applied' && (
                                                <button
                                                    onClick={() => handleActionStatus(action.id, 'applied')}
                                                    className="p-1 hover:bg-aurora-500/20 rounded"
                                                    title="Apply"
                                                >
                                                    <CheckCircle className="w-4 h-4 text-aurora-400" />
                                                </button>
                                            )}
                                            {action.status !== 'dismissed' && (
                                                <button
                                                    onClick={() => handleActionStatus(action.id, 'dismissed')}
                                                    className="p-1 hover:bg-red-500/20 rounded"
                                                    title="Dismiss"
                                                >
                                                    <XCircle className="w-4 h-4 text-red-400" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm">{action.action}</p>
                                    {action.status === 'applied' && (
                                        <p className="text-xs text-aurora-400 mt-1">Applied</p>
                                    )}
                                    {action.status === 'dismissed' && (
                                        <p className="text-xs text-white/40 mt-1">Dismissed</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-white/40">
                            <p>No actions yet</p>
                            <p className="text-sm">Run an analysis to see suggested actions</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
