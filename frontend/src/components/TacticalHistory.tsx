import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type StatusValue = "OK" | "LOW" | "DONE" | "PENDING" | "HIGH" | "NOT_SET";

interface Log {
    date: string;
    health: {
        water: StatusValue;
        food: StatusValue;
        sleep: StatusValue;
        exercise: StatusValue;
        mental: StatusValue;
    };
}

const TacticalHistory = () => {
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const data = await api.getHealthHistory(7);
                // Map mentalLoad -> mental for display
                const mappedData = data.map((log: any) => ({
                    ...log,
                    health: {
                        water: log.health?.water || 'NOT_SET',
                        food: log.health?.food || 'NOT_SET',
                        sleep: log.health?.sleep || 'NOT_SET',
                        exercise: log.health?.exercise || 'NOT_SET',
                        mental: log.health?.mentalLoad || log.health?.mental || 'NOT_SET',
                    }
                }));
                // Ensure chronological order for display (oldest -> newest)
                setLogs(mappedData.reverse());
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadHistory();
    }, []);

    const getSymbol = (status: StatusValue) => {
        switch (status) {
            case "OK": return "●";
            case "DONE": return "●";
            case "LOW": return "×";
            case "HIGH": return "!";
            case "PENDING": return "○";
            default: return "-";
        }
    };

    const getColor = (status: StatusValue) => {
        switch (status) {
            case "OK":
            case "DONE": return "text-primary";
            case "LOW":
            case "HIGH": return "text-destructive";
            case "PENDING": return "text-yellow-500";
            default: return "text-muted";
        }
    };

    const getBgColor = (status: StatusValue) => {
        switch (status) {
            case "OK":
            case "DONE": return "bg-primary/10";
            case "LOW":
            case "HIGH": return "bg-destructive/10";
            case "PENDING": return "bg-yellow-500/10";
            default: return "bg-muted/10";
        }
    };

    const calculateDailyScore = (log: Log) => {
        let score = 100;
        if (log.health.water === 'LOW') score -= 15;
        if (log.health.food === 'LOW') score -= 15;
        if (log.health.sleep === 'LOW') score -= 20;
        if (log.health.mental === 'HIGH') score -= 20;
        if ((log.health as any).mental === 'CRITICAL') score -= 30;
        if (log.health.exercise === 'PENDING') score -= 10;
        return Math.max(0, score);
    };

    const categories = [
        { key: "water", label: "💧", fullLabel: "Water" },
        { key: "food", label: "🍽️", fullLabel: "Food" },
        { key: "sleep", label: "😴", fullLabel: "Sleep" },
        { key: "exercise", label: "🏃", fullLabel: "Exercise" },
        { key: "mental", label: "🧠", fullLabel: "Mental" }
    ];

    if (loading) {
        return (
            <div className="system-card border-dashed">
                <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
                    <span className="text-xs font-mono text-muted-foreground">LOADING ARCHIVES...</span>
                </div>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="system-card border-dashed">
                <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-muted/10 flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">📂</span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">NO DATA LOGGED YET</p>
                </div>
            </div>
        );
    }

    return (
        <div className="system-card border-dashed">
            <p className="system-text text-muted-foreground mb-4">TACTICAL OVERVIEW (LAST 7 DAYS)</p>

            {/* Integrity Graph Chart */}
            <div className="mb-6 h-28 sm:h-32 flex items-end justify-between gap-1 sm:gap-2 px-1 border-b border-border pb-3">
                {logs.map((log, i) => {
                    const score = calculateDailyScore(log);
                    const height = `${Math.max(8, score)}%`;
                    const color = score > 90 ? 'bg-primary' : score > 60 ? 'bg-yellow-500' : 'bg-destructive';
                    const dayName = new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' });

                    return (
                        <div key={i} className="flex flex-col items-center justify-end h-full flex-1 group relative">
                            {/* Tooltip */}
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-foreground bg-background/90 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                {score}%
                            </div>
                            <div
                                className={`w-full max-w-[28px] rounded-t-md transition-all duration-500 ${color} group-hover:opacity-80`}
                                style={{ height }}
                            />
                            <div className="text-[9px] sm:text-[10px] font-mono text-muted-foreground mt-2 text-center">
                                <span className="hidden sm:inline">{dayName}</span>
                                <span className="sm:hidden">{dayName.charAt(0)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Status Grid - Mobile optimized */}
            <div className="overflow-x-auto scroll-container -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full text-center border-collapse min-w-[300px]">
                    <thead>
                        <tr>
                            <th className="p-2 text-left text-[10px] font-mono text-muted-foreground sticky left-0 bg-black/40 backdrop-blur-sm">
                                <span className="hidden sm:inline">SYS</span>
                            </th>
                            {logs.map((log, i) => (
                                <th key={i} className="p-2 text-[9px] sm:text-[10px] font-mono text-muted-foreground">
                                    <span className="hidden sm:inline">
                                        {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                    </span>
                                    <span className="sm:hidden">
                                        {new Date(log.date).toLocaleDateString('en-US', { weekday: 'narrow' })}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((cat) => (
                            <tr key={cat.key} className="border-b border-muted/20 last:border-0">
                                <td className="p-2 text-left sticky left-0 bg-black/40 backdrop-blur-sm">
                                    <span className="sm:hidden text-base">{cat.label}</span>
                                    <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground uppercase">
                                        {cat.fullLabel}
                                    </span>
                                </td>
                                {logs.map((log, i) => {
                                    const status = log.health[cat.key as keyof typeof log.health] as StatusValue;
                                    return (
                                        <td key={i} className="p-1.5 sm:p-2">
                                            <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full font-mono text-xs sm:text-sm ${getColor(status)} ${getBgColor(status)}`}>
                                                {getSymbol(status)}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 sm:gap-4 text-[10px] font-mono text-muted-foreground justify-center">
                <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">●</span>
                    <span>OPTIMAL</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">×</span>
                    <span>ISSUE</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">○</span>
                    <span>PENDING</span>
                </div>
            </div>
        </div>
    );
};

export default TacticalHistory;
