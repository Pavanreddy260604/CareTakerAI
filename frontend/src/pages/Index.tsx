import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import SystemHeader from "@/components/SystemHeader";
import { BiologicalStatus } from "@/components/BiologicalStatus";
import TacticalHistory from "@/components/TacticalHistory";
import ConsistencyState from "@/components/ConsistencyState";
import RecoveryMode from "@/components/RecoveryMode";
import PresenceNotification from "@/components/PresenceNotification";
import NotificationControl from "@/components/NotificationControl";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { RecoveryLock } from "@/components/RecoveryLock";
import { useNotifications } from "@/hooks/use-notifications";
import { useToast } from "@/hooks/use-toast";

// Task categories that map to health status
const TASK_CATEGORIES = {
  water: {
    label: "WATER", question: "Water intake today?", options: [
      { value: "none", label: "None", status: "LOW" },
      { value: "low", label: "< 1L", status: "LOW" },
      { value: "moderate", label: "1-2L", status: "OK" },
      { value: "adequate", label: "> 2L", status: "OK" },
    ]
  },
  food: {
    label: "FOOD", question: "Meal intake today?", options: [
      { value: "none", label: "No meals", status: "LOW" },
      { value: "light", label: "Light intake", status: "LOW" },
      { value: "moderate", label: "1-2 meals", status: "OK" },
      { value: "adequate", label: "3+ meals", status: "OK" },
    ]
  },
  exercise: {
    label: "EXERCISE", question: "Physical activity?", options: [
      { value: "none", label: "None", status: "PENDING" },
      { value: "light", label: "< 15 min", status: "PENDING" },
      { value: "moderate", label: "15-45 min", status: "DONE" },
      { value: "heavy", label: "> 45 min", status: "DONE" },
    ]
  },
  sleep: {
    label: "SLEEP", question: "Hours slept last night?", options: [
      { value: "poor", label: "< 5 hours", status: "LOW" },
      { value: "low", label: "5-6 hours", status: "LOW" },
      { value: "adequate", label: "7-8 hours", status: "OK" },
      { value: "optimal", label: "> 8 hours", status: "OK" },
    ]
  },
  mental: {
    label: "MENTAL", question: "Current stress level?", options: [
      { value: "low", label: "Low", status: "OK" },
      { value: "moderate", label: "Moderate", status: "OK" },
      { value: "high", label: "High", status: "HIGH" },
      { value: "critical", label: "Critical", status: "HIGH" },
    ]
  },
};

type CategoryKey = keyof typeof TASK_CATEGORIES;
type StatusValue = "OK" | "LOW" | "DONE" | "PENDING" | "HIGH" | "NOT_SET";

interface HealthData {
  category: CategoryKey;
  value: string;
  status: StatusValue;
  logged: boolean;
}

const Index = () => {
  const [showPresence, setShowPresence] = useState(true);
  const [dayCount, setDayCount] = useState(1);
  const [streak, setStreak] = useState(0);
  const [userName, setUserName] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [aiResponse, setAiResponse] = useState<{ systemStatus: string; action: string; explanation: string; metrics?: any; memoryCallback?: { message?: string } } | null>(null);
  const [bioMetrics, setBioMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(Object.keys(TASK_CATEGORIES).length); // Default to Dashboard (Passive Mode)
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showRecoveryLock, setShowRecoveryLock] = useState(false);
  const [warningsIgnored, setWarningsIgnored] = useState(0);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState('');
  const [reflection, setReflection] = useState({ wentWell: '', drained: '', experiment: '' });
  const [todayCheckedIn, setTodayCheckedIn] = useState(false);
  const [nextCycleTime, setNextCycleTime] = useState('');

  // Engagement state
  const [engagement, setEngagement] = useState<{
    focus: { title: string; reason: string; action: string; priority: string };
    patterns: Array<{ type: string; day?: string; days?: number; frequency?: number }>;
    recoveryScore: { score: number; trend: string; message: string };
    timeAdvice?: { timeOfDay: string; hour: number; message: string; icon: string };
    whatChanged?: {
      changes: Array<{ metric: string; from: string; to: string; improved: boolean }>;
      insights: string[];
      summary: string;
    };
  } | null>(null);

  const toggleMode = async (mode: 'CARETAKER' | 'OBSERVER') => {
    try {
      await api.updateSettings(mode);
      const stats: any = await api.getUserStats();
      if (stats.metrics) setBioMetrics(stats.metrics);
      toast({ title: "System Reconfigured", description: `Operating Mode: ${mode}` });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    }
  };

  const navigate = useNavigate();
  const { toast } = useToast();
  const { notifyRecoveryMode, permission } = useNotifications();

  // Health data state
  const [healthData, setHealthData] = useState<Record<CategoryKey, HealthData>>({
    water: { category: "water", value: "", status: "NOT_SET", logged: false },
    food: { category: "food", value: "", status: "NOT_SET", logged: false },
    exercise: { category: "exercise", value: "", status: "NOT_SET", logged: false },
    sleep: { category: "sleep", value: "", status: "NOT_SET", logged: false },
    mental: { category: "mental", value: "", status: "NOT_SET", logged: false },
  });

  const categories = Object.keys(TASK_CATEGORIES) as CategoryKey[];
  const allLogged = categories.every(cat => healthData[cat].logged);
  const loggedCount = categories.filter(cat => healthData[cat].logged).length;
  const currentCategory = categories[currentTaskIndex];

  // Fetch user stats on mount and restore state
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats: any = await api.getUserStats();

        // Passive Continuity: Set Metrics immediately
        if (stats.metrics) {
          setBioMetrics(stats.metrics);
        }

        // Calculate Day Count locally to handle Timezones correctly
        // (Server sends UTC, we convert to Local Calendar Days)
        const regDate = new Date(stats.registrationDate);
        regDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const localDayCount = Math.floor((today.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        setDayCount(localDayCount);
        setStreak(stats.streak);
        setUserName(stats.name);

        // Restore state if checked in today
        if (stats.todayCheckedIn && stats.latestLog) {
          const log = stats.latestLog;

          // Restore health data
          if (log.health) {
            // ... Code to restore healthData (omitted for brevity in replacement, but wait, replace needs full block!)
            // I will try to keep the restore logic...
            // Since I am replacing a huge chunk, I must be careful.
            // Actually, I can just leave the 'Restore state' block mostly alone, 
            // but I need to make sure I don't AUTO-OPEN the form if NOT checked in.
            // My initialization `useState(length)` handles that.
            // If Restore logic ran, it would set index to length anyway.
            // If NOT checked in, index stays at length (Dashboard).
            // Perfect. 

            const restoredData: any = { ...healthData };
            // Key mapping: frontend uses 'mental', backend uses 'mentalLoad'
            const keyMap: Record<string, string> = { mental: 'mentalLoad' };

            Object.keys(TASK_CATEGORIES).forEach((key) => {
              const catKey = key as CategoryKey;
              const backendKey = keyMap[catKey] || catKey; // Use mapped key or same key
              const backendStatus = log.health[backendKey];
              restoredData[catKey] = {
                category: catKey,
                value: "restored",
                status: backendStatus || 'NOT_SET',
                logged: !!backendStatus
              };
            });
            setHealthData(restoredData);
          }

          // Restore AI Response and Card
          if (log.aiResponse) {
            setAiResponse(log.aiResponse);
            setBioMetrics(log.aiResponse.metrics || (stats as any).metrics);
            setTodayCheckedIn(true);

            // Calculate next cycle time (midnight)
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            const msToMidnight = midnight.getTime() - now.getTime();
            const hours = Math.floor(msToMidnight / (60 * 60 * 1000));
            const minutes = Math.floor((msToMidnight % (60 * 60 * 1000)) / (60 * 1000));
            const seconds = Math.floor((msToMidnight % (60 * 1000)) / 1000);
            setNextCycleTime(`${hours}h ${minutes}m ${seconds}s`);

            if (log.aiResponse.recoveryRequired) {
              setIsRecoveryMode(true);
            }
          }
        } else {
          // Not checked in today.
          setTodayCheckedIn(false);
          // Ensure we are in "Passive Mode" (Dashboard).
          setCurrentTaskIndex(categories.length);
        }

      } catch (error: any) {
        console.error("Failed to fetch stats:", error);
        if (error.message.includes('authenticated')) {
          navigate('/login');
        }
      }
    };
    fetchStats();

    // Fetch engagement data
    const fetchEngagement = async () => {
      try {
        const data = await api.getEngagement();
        setEngagement(data);
      } catch (e) {
        console.error('Failed to fetch engagement:', e);
      }
    };
    fetchEngagement();
  }, [navigate]);

  // Live countdown timer for next cycle
  useEffect(() => {
    if (!todayCheckedIn) return;

    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const msToMidnight = midnight.getTime() - now.getTime();
      const hours = Math.floor(msToMidnight / (60 * 60 * 1000));
      const minutes = Math.floor((msToMidnight % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((msToMidnight % (60 * 1000)) / 1000);
      setNextCycleTime(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown(); // Initial update
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [todayCheckedIn]);

  // Enforcement: Trigger RecoveryLock when capacity < 45% (SURVIVAL mode)
  useEffect(() => {
    if (bioMetrics?.capacity !== undefined && bioMetrics.capacity < 45) {
      // Only trigger once per session unless capacity recovers
      const lastAcknowledged = localStorage.getItem('recovery_lock_acknowledged');
      const today = new Date().toISOString().split('T')[0];
      if (lastAcknowledged !== today) {
        setShowRecoveryLock(true);
      }
    }
  }, [bioMetrics]);

  // Enforcement: 6-hour cooldown after SURVIVAL mode warning acknowledged
  useEffect(() => {
    const checkCooldown = () => {
      const lastSurvivalTime = localStorage.getItem('survival_mode_time');
      if (!lastSurvivalTime) {
        setCooldownActive(false);
        return;
      }

      const survivalTime = new Date(lastSurvivalTime).getTime();
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      const elapsed = now - survivalTime;

      if (elapsed < sixHours) {
        setCooldownActive(true);
        const remaining = sixHours - elapsed;
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        setCooldownRemaining(`${hours}h ${minutes}m`);
      } else {
        setCooldownActive(false);
        localStorage.removeItem('survival_mode_time');
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [warningsIgnored]); // Re-check when warning is acknowledged

  // Log a health category
  const handleLogCategory = useCallback((category: CategoryKey, value: string, status: string) => {
    setHealthData(prev => ({
      ...prev,
      [category]: { category, value, status: status as StatusValue, logged: true }
    }));

    // Move to next unlogged category
    const nextUnlogged = categories.findIndex((cat, idx) =>
      idx > currentTaskIndex && !healthData[cat].logged
    );
    if (nextUnlogged !== -1) {
      setCurrentTaskIndex(nextUnlogged);
    } else {
      const anyUnlogged = categories.findIndex(cat => !healthData[cat].logged && cat !== category);
      if (anyUnlogged !== -1) {
        setCurrentTaskIndex(anyUnlogged);
      }
    }

    // Check for recovery mode trigger
    if (category === "mental" && (value === "high" || value === "critical")) {
      setIsRecoveryMode(true);
      if (permission === "granted") {
        notifyRecoveryMode();
      }
    }
  }, [currentTaskIndex, healthData, categories, permission, notifyRecoveryMode]);

  // Call AI with collected data
  const callAI = useCallback(async () => {
    setIsLoading(true);
    try {
      const health = {
        water: healthData.water.status === "LOW" ? "LOW" as const : "OK" as const,
        food: healthData.food.status === "LOW" ? "LOW" as const : "OK" as const,
        sleep: healthData.sleep.status === "LOW" ? "LOW" as const : "OK" as const,
        exercise: healthData.exercise.status === "DONE" ? "DONE" as const : "PENDING" as const,
        mentalLoad: healthData.mental.status === "HIGH" ? "HIGH" as const : healthData.mental.status === "LOW" ? "LOW" as const : "OK" as const,
      };
      const response = await api.checkIn(health);
      setAiResponse(response);

      // Trigger Recovery Mode if Backend enforces it (e.g. 3-day sleep pattern)
      if (response.recoveryRequired) {
        setIsRecoveryMode(true);
        if (permission === "granted") {
          notifyRecoveryMode();
        }
      }

      const stats = await api.getUserStats();
      setDayCount(stats.dayCount);
      setStreak(stats.streak);
      if (stats.metrics) setBioMetrics(stats.metrics);

      // Reset to dashboard view (hide input section after update)
      setCurrentTaskIndex(categories.length);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [healthData, toast]);

  const handleLogout = useCallback(() => {
    api.logout();
    navigate("/login");
  }, [navigate]);

  const handleDismissPresence = useCallback(() => {
    setShowPresence(false);
  }, []);

  const [recoveryTasks, setRecoveryTasks] = useState([
    { label: "Light movement completed", completed: false },
    { label: "Proper intake completed", completed: false },
    { label: "Rest completed", completed: false },
  ]);

  const handleToggleRecoveryTask = useCallback((index: number) => {
    setRecoveryTasks((prev) =>
      prev.map((task, i) =>
        i === index ? { ...task, completed: !task.completed } : task
      )
    );
  }, []);

  const getStatusColor = (status: StatusValue) => {
    switch (status) {
      case "OK":
      case "DONE":
        return "text-primary";
      case "LOW":
      case "HIGH":
        return "text-destructive";
      case "PENDING":
        return "text-yellow-500";
      default:
        return "text-muted-foreground";
    }
  };

  const calculateIntegrity = () => {
    let score = 100;
    if (healthData.water.status === 'LOW') score -= 15;
    if (healthData.food.status === 'LOW') score -= 15;
    if (healthData.sleep.status === 'LOW') score -= 20;
    if (healthData.mental.status === 'HIGH') score -= 20;
    if (healthData.exercise.status === 'PENDING') score -= 10;
    return Math.max(0, score);
  };

  return (
    <div className="min-h-screen bg-background">
      <PresenceNotification show={showPresence} onDismiss={handleDismissPresence} />

      {/* Cooldown Banner */}
      {cooldownActive && (
        <div className="bg-destructive/10 border-b border-destructive/30 py-3 px-6">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <p className="text-sm font-mono text-destructive">
              🔒 Check-in locked for recovery: {cooldownRemaining} remaining
            </p>
            <p className="text-[10px] text-muted-foreground">
              You dismissed a SURVIVAL warning
            </p>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-6 pt-8">
        {/* Header Row */}
        <div className="flex justify-between items-start mb-6">
          <SystemHeader
            dayCount={dayCount}
            isRecoveryMode={isRecoveryMode}
            streak={streak}
            userName={userName}
            integrity={calculateIntegrity()}
            onSettingsClick={() => setShowSettings(true)}
          />
          <button
            onClick={handleLogout}
            className="text-xs font-mono text-muted-foreground hover:text-destructive transition-colors px-3 py-1 border border-transparent hover:border-destructive/50 rounded"
          >
            [LOGOUT]
          </button>
        </div>

        {/* Biological Status - Full Width */}
        <BiologicalStatus metrics={bioMetrics} />

        {/* TODAY'S FOCUS CARD (Prominent) */}
        {engagement?.focus && (
          <div className={`mb-6 p-5 rounded-lg border-2 transition-all duration-300 ${engagement.focus.priority === 'critical'
            ? 'border-destructive bg-destructive/10 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
            : engagement.focus.priority === 'high'
              ? 'border-yellow-500 bg-yellow-500/10'
              : engagement.focus.priority === 'medium'
                ? 'border-primary/50 bg-primary/5'
                : 'border-muted/30 bg-black/20'
            }`}>
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                📌 Today's Focus
              </p>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${engagement.focus.priority === 'critical' ? 'bg-destructive text-white' :
                engagement.focus.priority === 'high' ? 'bg-yellow-500 text-black' :
                  'bg-primary/20 text-primary'
                }`}>
                {engagement.focus.priority.toUpperCase()}
              </span>
            </div>
            <h3 className={`text-xl font-bold font-mono mb-1 ${engagement.focus.priority === 'critical' ? 'text-destructive' :
              engagement.focus.priority === 'high' ? 'text-yellow-500' : 'text-primary'
              }`}>
              {engagement.focus.title}
            </h3>
            <p className="text-xs text-muted-foreground mb-2 font-mono">{engagement.focus.reason}</p>
            <p className="text-sm font-mono">{engagement.focus.action}</p>
          </div>
        )}

        {/* PATTERN ALERTS (Only on transitions) */}
        {engagement?.patterns && engagement.patterns.length > 0 && (
          <div className="mb-6 space-y-2">
            {engagement.patterns.map((pattern, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 border border-yellow-500/50 bg-yellow-500/10 rounded-lg">
                <span className="text-lg">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-mono font-bold text-yellow-500">
                    {pattern.type === 'chronicSleep' && `${pattern.days} days of poor sleep in a row`}
                    {pattern.type === 'chronicStress' && `${pattern.days} days of high stress in a row`}
                    {pattern.type === 'lowSleep' && `Pattern: ${pattern.day}s often have poor sleep (${pattern.frequency}%)`}
                    {pattern.type === 'highStress' && `Pattern: ${pattern.day}s often have high stress (${pattern.frequency}%)`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RECOVERY SCORE (Replaces Streak Guilt) */}
        {engagement?.recoveryScore && (
          <div className="mb-6 p-4 border border-muted/30 bg-black/20 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                🧠 Recovery Score
              </span>
              <span className={`text-2xl font-mono font-bold ${engagement.recoveryScore.score >= 70 ? 'text-primary' :
                engagement.recoveryScore.score >= 40 ? 'text-yellow-500' : 'text-destructive'
                }`}>
                {engagement.recoveryScore.score}
              </span>
            </div>
            <div className="w-full h-2 bg-background/50 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full transition-all duration-1000 ${engagement.recoveryScore.score >= 70 ? 'bg-primary' :
                  engagement.recoveryScore.score >= 40 ? 'bg-yellow-500' : 'bg-destructive'
                  }`}
                style={{ width: `${engagement.recoveryScore.score}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className={`${engagement.recoveryScore.trend === 'improving' ? 'text-primary' :
                engagement.recoveryScore.trend === 'declining' ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                {engagement.recoveryScore.trend === 'improving' && '↑ '}
                {engagement.recoveryScore.trend === 'declining' && '↓ '}
                {engagement.recoveryScore.message}
              </span>
            </div>
          </div>
        )}

        {/* TIME-AWARE ADVICE (Phase 3) */}
        {engagement?.timeAdvice && (
          <div className="mb-6 p-4 border border-cyan-500/30 bg-cyan-500/5 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{engagement.timeAdvice.icon}</span>
              <div className="flex-1">
                <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">
                  ⏰ {engagement.timeAdvice.timeOfDay.toUpperCase()} Advice
                </p>
                <p className="text-sm font-mono text-cyan-300">
                  {engagement.timeAdvice.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* WHAT CHANGED DIFF (Phase 3) */}
        {engagement?.whatChanged && (
          <div className="mb-6 p-4 border border-purple-500/30 bg-purple-500/5 rounded-lg">
            <p className="text-[10px] font-mono text-purple-400 uppercase tracking-widest mb-2">
              📊 What Changed Since Yesterday
            </p>

            {/* Changes */}
            {engagement.whatChanged.changes.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {engagement.whatChanged.changes.map((change, idx) => (
                  <span
                    key={idx}
                    className={`text-xs font-mono px-2 py-1 rounded ${change.improved
                      ? 'bg-primary/20 text-primary'
                      : 'bg-destructive/20 text-destructive'
                      }`}
                  >
                    {change.metric}: {change.from} → {change.to} {change.improved ? '↑' : '↓'}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-muted-foreground mb-3">No changes detected</p>
            )}

            {/* Insights */}
            {engagement.whatChanged.insights.map((insight, idx) => (
              <p key={idx} className="text-sm font-mono text-purple-300 mb-1">
                💡 {insight}
              </p>
            ))}
          </div>
        )}

        {!healthData.water.logged && (
          <button
            onClick={() => setCurrentTaskIndex(0)}
            className="w-full text-xs font-mono bg-primary/10 text-primary border border-primary/50 p-3 mb-6 hover:bg-primary/20 transition-colors tracking-widest uppercase flex justify-between items-center"
          >
            <span>Report Status</span>
            <span>[UPDATE]</span>
          </button>
        )}

        <NotificationControl />

        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full text-xs font-mono text-muted-foreground border border-dashed border-border p-2 mb-6 hover:text-primary hover:border-primary transition-colors flex justify-between"
        >
          <span>:: TACTICAL ARCHIVES ::</span>
          <span>{showHistory ? "CLOSE [-]" : "ACCESS [+]"}</span>
        </button>

        {showHistory && <div className="mb-6"><TacticalHistory /></div>}

        {/* AI Response with Severity Levels */}
        {aiResponse && (() => {
          // Determine severity level
          const mode = aiResponse.metrics?.systemMode || aiResponse.systemStatus;
          const capacity = aiResponse.metrics?.capacity || 100;

          let severity: 'SUGGESTION' | 'WARNING' | 'CRITICAL' = 'SUGGESTION';
          let severityColor = 'border-primary/30 bg-primary/5';
          let badgeColor = 'bg-primary/20 text-primary';
          let icon = '💡';

          if (mode === 'SURVIVAL' || capacity < 20) {
            severity = 'CRITICAL';
            severityColor = 'border-destructive bg-destructive/10';
            badgeColor = 'bg-destructive text-white';
            icon = '🚨';
          } else if (mode === 'LOCKED_RECOVERY' || capacity < 45) {
            severity = 'WARNING';
            severityColor = 'border-yellow-500/50 bg-yellow-500/10';
            badgeColor = 'bg-yellow-500 text-black';
            icon = '⚠️';
          }

          return (
            <div className={`system-card mb-6 ${severityColor} transition-all duration-300`}>
              {/* Severity Badge */}
              <div className="flex justify-between items-start mb-3">
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${badgeColor}`}>
                  {icon} {severity}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  CAPACITY: {capacity}%
                </span>
              </div>

              {/* Action */}
              {aiResponse.action && aiResponse.action !== "None" && (
                <p className={`text-lg font-bold font-mono mb-2 ${severity === 'CRITICAL' ? 'text-destructive' :
                  severity === 'WARNING' ? 'text-yellow-500' : 'text-primary'
                  }`}>
                  {aiResponse.action}
                </p>
              )}

              {/* Explanation */}
              <p className="text-sm font-mono text-muted-foreground leading-relaxed">
                {aiResponse.explanation}
              </p>

              {/* Memory Callback - "Last time you felt like this..." */}
              {aiResponse.memoryCallback?.message && (
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-1">
                    💭 Memory
                  </p>
                  <p className="text-sm font-mono text-blue-300">
                    {aiResponse.memoryCallback.message}
                  </p>
                </div>
              )}

              {/* Severity Legend (only for non-suggestion) */}
              {severity !== 'SUGGESTION' && (
                <div className="mt-4 pt-3 border-t border-muted/20 text-[10px] font-mono text-muted-foreground/70">
                  {severity === 'CRITICAL' ? (
                    <span>🚨 CRITICAL = Immediate action required. Ignoring will worsen state.</span>
                  ) : (
                    <span>⚠️ WARNING = Recommended action. System detecting decline pattern.</span>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {isLoading && (
          <div className="system-card mb-6 text-center">
            <p className="system-text text-primary animate-pulse">PROCESSING...</p>
          </div>
        )}

        {isRecoveryMode ? (
          <>
            <RecoveryMode
              tasks={recoveryTasks}
              onToggleTask={handleToggleRecoveryTask}
            />
            <button
              onClick={() => setIsRecoveryMode(false)}
              className="system-button w-full mb-6"
            >
              EXIT RECOVERY MODE
            </button>
          </>
        ) : (
          <>
            {/* Status Overview */}
            <div className="system-card mb-6">
              <p className="system-text text-muted-foreground mb-4">STATUS CHECK [{loggedCount}/{categories.length}]</p>

              {/* Progress bar */}
              <div className="flex gap-1.5 mb-6">
                {categories.map((cat) => (
                  <div
                    key={cat}
                    className={`flex-1 h-2 rounded-full transition-all duration-300 ${healthData[cat].logged ? 'bg-primary shadow-[0_0_8px_#4ade8080]' : 'bg-muted/50'}`}
                  />
                ))}
              </div>

              {/* Status grid */}
              <div className="grid grid-cols-5 gap-3">
                {categories.map((cat, idx) => (
                  <button
                    key={cat}
                    onClick={() => setCurrentTaskIndex(idx)}
                    className={`p-3 text-center border rounded-lg transition-all duration-200 ${idx === currentTaskIndex
                      ? 'border-primary bg-primary/10 shadow-[0_0_12px_#4ade8040]'
                      : healthData[cat].logged
                        ? 'border-muted/50 bg-black/20 hover:border-primary/50 hover:bg-black/40'
                        : 'border-muted/30 hover:border-primary/70 hover:bg-primary/5'
                      }`}
                  >
                    <div className="text-[10px] font-mono text-muted-foreground mb-1.5 tracking-wider">
                      {TASK_CATEGORIES[cat].label}
                    </div>
                    <div className={`text-sm font-bold font-mono ${getStatusColor(healthData[cat].status)}`}>
                      {healthData[cat].logged ? healthData[cat].status : '---'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Current Task Input */}
            {currentCategory && (
              <div className="system-card mb-6">
                <p className="system-text text-muted-foreground mb-2">
                  INPUT [{currentTaskIndex + 1}/{categories.length}]
                </p>
                <p className="text-lg font-medium mb-4">{TASK_CATEGORIES[currentCategory].question}</p>

                <div className="space-y-2">
                  {TASK_CATEGORIES[currentCategory].options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleLogCategory(currentCategory, option.value, option.status)}
                      className="w-full p-3 text-left border border-muted hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono">{option.label}</span>
                        <span className={`text - xs font - mono ${getStatusColor(option.status as StatusValue)} `}>
                          {option.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button - Disabled after first daily check-in */}
            {todayCheckedIn ? (
              <div className="text-center mb-6 p-4 border border-muted bg-muted/10 rounded-lg">
                <p className="text-sm font-mono text-muted-foreground mb-2">✅ Today's check-in recorded</p>
                <p className="text-xs font-mono text-primary">🕐 Next cycle: {nextCycleTime || 'Tomorrow'}</p>
              </div>
            ) : (
              <button
                onClick={callAI}
                disabled={isLoading || (!allLogged && !currentCategory)}
                className={`system-button w-full mb-6 ${(!allLogged && categories.length - loggedCount > 0) ? '' : ''}`}
              >
                {isLoading ? "PROCESSING..." : aiResponse ? "UPDATE STATUS" : !allLogged ? `COMPLETE ${categories.length - loggedCount} MORE` : "SUBMIT CHECK-IN"}
              </button>
            )}
          </>
        )}

        <ConsistencyState messageIndex={dayCount} />

        <footer className="text-center">
          <p className="text-xs text-muted-foreground">
            v1.0.0 | Caretaker AI
          </p>
        </footer>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border p-6 rounded-lg w-full max-w-sm space-y-4 scanline">
            <h2 className="text-xl font-medium tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              SYSTEM CONFIGURATION
            </h2>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground font-mono">SELECT OPERATING MODE:</p>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => toggleMode('CARETAKER')}
                  className={`p-4 border rounded-sm text-sm font-mono transition-all flex justify-between items-center group ${bioMetrics?.systemMode !== 'OBSERVER' ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground hover:bg-muted/10'}`}
                >
                  <span>CARETAKER</span>
                  {bioMetrics?.systemMode !== 'OBSERVER' && <span className="text-[10px] bg-primary text-black px-1 rounded">ACTIVE</span>}
                </button>
                <button
                  onClick={() => toggleMode('OBSERVER')}
                  className={`p-4 border rounded-sm text-sm font-mono transition-all flex justify-between items-center group ${bioMetrics?.systemMode === 'OBSERVER' ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground hover:bg-muted/10'}`}
                >
                  <span>OBSERVER</span>
                  {bioMetrics?.systemMode === 'OBSERVER' && <span className="text-[10px] bg-primary text-black px-1 rounded">ACTIVE</span>}
                </button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground/60 border-t border-border/50 pt-3 space-y-1 font-mono">
              <p>• OBSERVER: Disables Lockouts. Monitors patterns.</p>
              <p>• CARETAKER: Enforces biological limits strictly.</p>
            </div>

            <button onClick={() => setShowSettings(false)} className="w-full py-2 bg-secondary/80 hover:bg-secondary text-secondary-foreground rounded-sm text-sm mt-2 transition-colors">
              CLOSE INTERFACE
            </button>
          </div>
        </div>
      )}

      {/* Fixed Action Buttons */}
      <div className="fixed bottom-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => setShowAnalytics(true)}
          className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50 px-3 py-2 rounded-lg text-xs font-mono transition-all"
        >
          📊 Analytics
        </button>
        <button
          onClick={() => setShowWeeklyReview(!showWeeklyReview)}
          className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 px-3 py-2 rounded-lg text-xs font-mono transition-all"
        >
          📅 Review
        </button>
      </div>

      {/* Analytics Dashboard Modal */}
      {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}

      {/* Weekly Review Modal */}
      {showWeeklyReview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-primary/30 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-mono font-bold text-primary">📅 Weekly Reflection</h2>
              <button onClick={() => setShowWeeklyReview(false)} className="text-muted-foreground hover:text-white">✕</button>
            </div>

            <p className="text-xs text-muted-foreground mb-4">2-minute ritual to build self-awareness</p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">✓ What went well?</label>
                <textarea
                  className="w-full mt-1 p-2 bg-black/50 border border-muted/30 rounded text-sm font-mono text-white focus:border-primary focus:outline-none"
                  rows={2}
                  value={reflection.wentWell}
                  onChange={e => setReflection(prev => ({ ...prev, wentWell: e.target.value }))}
                  placeholder="Moments of good recovery, healthy choices..."
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">⚡ What drained you?</label>
                <textarea
                  className="w-full mt-1 p-2 bg-black/50 border border-muted/30 rounded text-sm font-mono text-white focus:border-primary focus:outline-none"
                  rows={2}
                  value={reflection.drained}
                  onChange={e => setReflection(prev => ({ ...prev, drained: e.target.value }))}
                  placeholder="Stressors, sleep issues, overcommitments..."
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">🧪 Experiment for next week</label>
                <textarea
                  className="w-full mt-1 p-2 bg-black/50 border border-muted/30 rounded text-sm font-mono text-white focus:border-primary focus:outline-none"
                  rows={2}
                  value={reflection.experiment}
                  onChange={e => setReflection(prev => ({ ...prev, experiment: e.target.value }))}
                  placeholder="One small thing to try..."
                />
              </div>
            </div>

            <button
              onClick={async () => {
                try {
                  await api.submitReflection(reflection);
                  toast({ title: "Reflection Saved", description: "Your thoughts are stored in memory." });
                  setShowWeeklyReview(false);
                  setReflection({ wentWell: '', drained: '', experiment: '' });
                } catch (e) {
                  toast({ title: "Error", description: "Failed to save reflection", variant: "destructive" });
                }
              }}
              className="w-full mt-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 rounded font-mono text-sm transition-all"
            >
              Save Reflection
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-primary/30 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-mono font-bold text-primary">⚙️ Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-white">✕</button>
            </div>

            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
              Operating Mode
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  toggleMode('CARETAKER');
                  setShowSettings(false);
                }}
                className="w-full p-4 border border-primary/30 rounded-lg text-left hover:bg-primary/10 transition-all"
              >
                <p className="font-mono font-bold text-primary mb-1">🛡️ CARETAKER Mode</p>
                <p className="text-xs text-muted-foreground">
                  Full guidance with recovery enforcement. AI recommends actions when capacity is low.
                </p>
              </button>

              <button
                onClick={() => {
                  toggleMode('OBSERVER');
                  setShowSettings(false);
                }}
                className="w-full p-4 border border-muted/30 rounded-lg text-left hover:bg-muted/10 transition-all"
              >
                <p className="font-mono font-bold text-muted-foreground mb-1">👁️ OBSERVER Mode</p>
                <p className="text-xs text-muted-foreground">
                  Tracking only, no recommendations. You decide what to do with the data.
                </p>
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground mt-4 text-center">
              Current mode affects AI suggestions and recovery recommendations
            </p>
          </div>
        </div>
      )}

      {/* Recovery Lock Enforcement */}
      <RecoveryLock
        isVisible={showRecoveryLock}
        capacity={bioMetrics?.capacity || 0}
        onAcknowledge={() => {
          setShowRecoveryLock(false);
          setWarningsIgnored(prev => prev + 1);
          localStorage.setItem('recovery_lock_acknowledged', new Date().toISOString().split('T')[0]);
          localStorage.setItem('survival_mode_time', new Date().toISOString());
          setCooldownActive(true);
          setCooldownRemaining('6h 0m');
          toast({
            title: "Warning Acknowledged",
            description: `Recovery Score penalty applied. Check-in locked for 6 hours.`,
            variant: "destructive"
          });
        }}
      />
    </div>
  );
};

export default Index;
