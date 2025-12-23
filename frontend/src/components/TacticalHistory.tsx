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
                // Ensure chronological order for display (oldest -> newest)
                setLogs(data.reverse());
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
            case "LOW": return "×"; // Warning
            case "HIGH": return "!"; // Critical
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
            case "PENDING": return "text-muted-foreground";
            default: return "text-muted";
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

    const categories = ["water", "food", "sleep", "exercise", "mental"];

    if (loading) return <div className="text-xs font-mono animate-pulse">LOADING ARCHIVES...</div>;
    if (logs.length === 0) return <div className="text-xs font-mono text-muted-foreground">NO DATA LOGGED.</div>;

    return (
        <div className="system-card border-dashed">
            <p className="system-text text-muted-foreground mb-4">TACTICAL OVERVIEW (LAST 7 DAYS)</p>

            {/* Integrity Graph Chart */}
            <div className="mb-6 h-32 flex items-end justify-between gap-2 px-2 border-b border-border pb-2">
                {logs.map((log, i) => {
                    const score = calculateDailyScore(log);
                    const height = `${score}%`;
                    const color = score > 90 ? 'bg-primary' : score > 60 ? 'bg-yellow-500' : 'bg-destructive';

                    return (
                        <div key={i} className="flex flex-col items-center justify-end h-full flex-1 group relative">
                            <div className="absolute -top-4 text-[10px] font-mono text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {score}%
                            </div>
                            <div
                                className={`w-full max-w-[20px] rounded-t-sm transition-all duration-500 ${color} hover:opacity-80`}
                                style={{ height }}
                            />
                            <div className="text-[10px] font-mono text-muted-foreground mt-2">
                                {new Date(log.date).toLocaleDateString('en-US', { weekday: 'narrow' })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse">
                    <thead>
                        <tr>
                            <th className="p-1 text-xs font-mono text-muted-foreground text-left">SYS</th>
                            {logs.map((log, i) => (
                                <th key={i} className="p-1 text-xs font-mono text-muted-foreground">
                                    {new Date(log.date).toLocaleDateString('en-US', { weekday: 'narrow' })}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((cat) => (
                            <tr key={cat} className="border-b border-muted/20 last:border-0 hover:bg-muted/10">
                                <td className="p-2 text-xs font-mono text-left uppercase text-muted-foreground">{cat}</td>
                                {logs.map((log, i) => {
                                    const status = log.health[cat as keyof typeof log.health] as StatusValue;
                                    return (
                                        <td key={i} className={`p-2 font-mono text-sm ${getColor(status)}`}>
                                            {getSymbol(status)}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex gap-4 text-xs font-mono text-muted-foreground justify-center">
                <div className="flex items-center gap-1"><span className="text-primary">●</span> OPTIMAL</div>
                <div className="flex items-center gap-1"><span className="text-destructive">×</span> ISSUE</div>
            </div>
        </div>
    );
};

export default TacticalHistory;
