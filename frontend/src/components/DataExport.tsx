import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface DataExportProps {
    onClose: () => void;
}

export function DataExport({ onClose }: DataExportProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [exportType, setExportType] = useState<'json' | 'csv'>('json');
    const { toast } = useToast();

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const exportData = useCallback(async () => {
        setIsExporting(true);

        try {
            // Fetch all health history (max limit)
            const history = await api.getHealthHistory(365);
            const stats = await api.getUserStats();

            if (exportType === 'json') {
                // JSON Export
                const exportData = {
                    exportDate: new Date().toISOString(),
                    user: {
                        name: stats.name,
                        email: stats.email,
                        registrationDate: stats.registrationDate,
                        totalCheckIns: stats.totalCheckIns,
                        currentStreak: stats.streak
                    },
                    healthLogs: history.map((log: any) => ({
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        date: log.date,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        health: log.health,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        aiResponse: log.aiResponse ? {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            systemStatus: log.aiResponse.systemStatus,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            action: log.aiResponse.action,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            explanation: log.aiResponse.explanation,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            metrics: log.aiResponse.metrics
                        } : null
                    }))
                };

                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                downloadBlob(blob, `caretaker-data-${new Date().toISOString().split('T')[0]}.json`);
            } else {
                // CSV Export
                const headers = ['Date', 'Sleep', 'Water', 'Food', 'Exercise', 'Mental Load', 'Capacity', 'System Mode', 'AI Action'];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rows = history.map((log: any) => [
                    formatDate(log.date),
                    log.health?.sleep || 'N/A',
                    log.health?.water || 'N/A',
                    log.health?.food || 'N/A',
                    log.health?.exercise || 'N/A',
                    log.health?.mentalLoad || 'N/A',
                    log.aiResponse?.metrics?.capacity ? `${log.aiResponse.metrics.capacity}%` : 'N/A',
                    log.aiResponse?.metrics?.systemMode || 'N/A',
                    log.aiResponse?.action || 'N/A'
                ]);

                const csvContent = [
                    headers.join(','),
                    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                downloadBlob(blob, `caretaker-data-${new Date().toISOString().split('T')[0]}.csv`);
            }

            toast({
                title: '✅ Export Complete',
                description: `Your data has been exported as ${exportType.toUpperCase()}.`
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Export failed:', error);
            toast({
                title: 'Export Failed',
                description: error.message || 'Could not export data',
                variant: 'destructive'
            });
        } finally {
            setIsExporting(false);
        }
    }, [exportType, toast]);

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-muted/30 rounded-2xl max-w-md w-full p-6 animate-fade-in">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-mono font-bold text-primary flex items-center gap-2">
                            <span>📤</span>
                            <span>Export Data</span>
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">Download your health history</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-white text-xl transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Format Selection */}
                <div className="mb-6">
                    <p className="text-sm font-mono text-muted-foreground mb-3">Export Format</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setExportType('json')}
                            className={`flex-1 p-4 rounded-xl border transition-all ${exportType === 'json'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-muted/30 text-muted-foreground hover:border-primary/50'
                                }`}
                        >
                            <div className="text-2xl mb-2">📋</div>
                            <div className="font-mono font-bold">JSON</div>
                            <div className="text-[10px] text-muted-foreground mt-1">Full data with AI responses</div>
                        </button>
                        <button
                            onClick={() => setExportType('csv')}
                            className={`flex-1 p-4 rounded-xl border transition-all ${exportType === 'csv'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-muted/30 text-muted-foreground hover:border-primary/50'
                                }`}
                        >
                            <div className="text-2xl mb-2">📊</div>
                            <div className="font-mono font-bold">CSV</div>
                            <div className="text-[10px] text-muted-foreground mt-1">Spreadsheet compatible</div>
                        </button>
                    </div>
                </div>

                {/* Info */}
                <div className="bg-muted/10 border border-muted/20 rounded-xl p-4 mb-6">
                    <p className="text-xs font-mono text-muted-foreground">
                        <strong className="text-foreground">What's included:</strong>
                    </p>
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                        <li>• All health check-in records</li>
                        <li>• AI responses and recommendations</li>
                        <li>• Capacity scores and metrics</li>
                        <li>• Account information</li>
                    </ul>
                </div>

                {/* Export Button */}
                <button
                    onClick={exportData}
                    disabled={isExporting}
                    className="w-full py-4 bg-primary text-black font-mono font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isExporting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Exporting...</span>
                        </>
                    ) : (
                        <>
                            <span>📥</span>
                            <span>Download {exportType.toUpperCase()}</span>
                        </>
                    )}
                </button>

                {/* Privacy Note */}
                <p className="text-[10px] text-center text-muted-foreground/50 mt-4">
                    Your data is exported locally and never sent to external servers.
                </p>
            </div>
        </div>
    );
}

export default DataExport;
