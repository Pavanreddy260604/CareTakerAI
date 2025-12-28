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
// New Features
import { WeatherWidget } from "@/components/WeatherWidget";
import { FocusTimer } from "@/components/FocusTimer";
import { DataExport } from "@/components/DataExport";
import { Achievements } from "@/components/Achievements";
import { GoalSettings } from "@/components/GoalSettings";

// Task categories that map to health status
const TASK_CATEGORIES = {
  water: {
    label: "WATER", icon: "💧", question: "Water intake today?", options: [
      { value: "none", label: "None", status: "LOW" },
      { value: "low", label: "< 1L", status: "LOW" },
      { value: "moderate", label: "1-2L", status: "OK" },
      { value: "adequate", label: "> 2L", status: "OK" },
    ]
  },
  food: {
    label: "FOOD", icon: "🍽️", question: "Meal intake today?", options: [
      { value: "none", label: "No meals", status: "LOW" },
      { value: "light", label: "Light intake", status: "LOW" },
      { value: "moderate", label: "1-2 meals", status: "OK" },
      { value: "adequate", label: "3+ meals", status: "OK" },
    ]
  },
  exercise: {
    label: "EXERCISE", icon: "🏃", question: "Physical activity?", options: [
      { value: "none", label: "None", status: "PENDING" },
      { value: "light", label: "< 15 min", status: "PENDING" },
      { value: "moderate", label: "15-45 min", status: "DONE" },
      { value: "heavy", label: "> 45 min", status: "DONE" },
    ]
  },
  sleep: {
    label: "SLEEP", icon: "😴", question: "Hours slept last night?", options: [
      { value: "poor", label: "< 5 hours", status: "LOW" },
      { value: "low", label: "5-6 hours", status: "LOW" },
      { value: "adequate", label: "7-8 hours", status: "OK" },
      { value: "optimal", label: "> 8 hours", status: "OK" },
    ]
  },
  mental: {
    label: "MENTAL", icon: "🧠", question: "Current stress level?", options: [
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
  const [operatingMode, setOperatingMode] = useState<'CARETAKER' | 'OBSERVER'>('CARETAKER');
  const [aiResponse, setAiResponse] = useState<{
    systemStatus: string;
    action: string;
    explanation: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    confidence?: number;
    timeframe?: string;
    category?: string;
    metrics?: any;
    memoryCallback?: { message?: string };
    trendSummary?: string;
  } | null>(null);
  const [bioMetrics, setBioMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(Object.keys(TASK_CATEGORIES).length);
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
  // New feature states
  const [showFocusTimer, setShowFocusTimer] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);
  const [weatherData, setWeatherData] = useState<any>(null);
  // Feedback state
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'not_helpful' | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  // Phase 5: Achievements
  const [showAchievements, setShowAchievements] = useState(false);
  const [showGoalSettings, setShowGoalSettings] = useState(false);

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
      setOperatingMode(mode); // Optimistic update
      await api.updateSettings(mode);
      const stats: any = await api.getUserStats();
      if (stats.metrics) setBioMetrics(stats.metrics);
      if (stats.mode) setOperatingMode(stats.mode); // Verify with backend source of truth
      toast({ title: "System Reconfigured", description: `Operating Mode: ${mode}` });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
      // Revert if failed (optional, but good practice would be to re-fetch stats or revert state)
    }
  };

  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    permission,
    notifyRecoveryMode,
    notifyCriticalCapacity,
    notifyLowCapacity,
    notifySurvivalMode,
    notifyCheckInReminder
  } = useNotifications();

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

        if (stats.metrics) {
          setBioMetrics(stats.metrics);
        }

        const regDate = new Date(stats.registrationDate);
        regDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const localDayCount = Math.floor((today.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        setDayCount(localDayCount);
        setStreak(stats.streak);
        setUserName(stats.name);
        if (stats.mode) setOperatingMode(stats.mode);

        if (stats.todayCheckedIn && stats.latestLog) {
          const log = stats.latestLog;

          if (log.health) {
            const restoredData: any = { ...healthData };
            const keyMap: Record<string, string> = { mental: 'mentalLoad' };

            Object.keys(TASK_CATEGORIES).forEach((key) => {
              const catKey = key as CategoryKey;
              const backendKey = keyMap[catKey] || catKey;
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

          if (log.aiResponse) {
            setAiResponse(log.aiResponse);
            setBioMetrics(log.aiResponse.metrics || (stats as any).metrics);
            setTodayCheckedIn(true);

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
          setTodayCheckedIn(false);
          setCurrentTaskIndex(categories.length);
        }

      } catch (error: any) {
        console.error("Failed to fetch stats:", error);
        const errorMsg = error?.message || 'Unknown error';
        if (typeof errorMsg === 'string' && errorMsg.includes('authenticated')) {
          navigate('/login');
        }
      }
    };
    fetchStats();

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

  // Handle URL parameters for PWA shortcuts
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('focus') === 'true') {
      setShowFocusTimer(true);
      // Clean URL without reloading
      window.history.replaceState({}, '', '/');
    }
    if (urlParams.get('analytics') === 'true') {
      setShowAnalytics(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

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

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [todayCheckedIn]);

  // Enforcement: Trigger RecoveryLock when capacity < 45% (CARETAKER ONLY)
  useEffect(() => {
    if (operatingMode !== 'CARETAKER') return;
    if (bioMetrics?.capacity !== undefined && bioMetrics.capacity < 45) {
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
      // In Observer mode, we might still show the timer but not enforce? 
      // Or just disable entirely. Let's disable enforcement.
      if (operatingMode !== 'CARETAKER') {
        setCooldownActive(false);
        return;
      }

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
    const interval = setInterval(checkCooldown, 60000);
    return () => clearInterval(interval);
  }, [warningsIgnored, operatingMode]);

  // NOTIFICATION TRIGGERS

  // Trigger notification when capacity drops critically
  // Trigger notification when capacity drops critically (CARETAKER ONLY)
  useEffect(() => {
    if (permission !== 'granted' || !bioMetrics?.capacity || operatingMode !== 'CARETAKER') return;

    const capacity = bioMetrics.capacity;
    if (capacity < 30) {
      notifyCriticalCapacity(capacity);
    } else if (capacity < 60) {
      notifyLowCapacity(capacity);
    }
  }, [bioMetrics?.capacity, permission, notifyCriticalCapacity, notifyLowCapacity, operatingMode]);

  // Trigger notification when recovery lock triggers
  useEffect(() => {
    if (permission !== 'granted') return;
    if (showRecoveryLock) {
      notifyRecoveryMode();
    }
  }, [showRecoveryLock, permission, notifyRecoveryMode]);

  // Trigger notification for survival mode
  useEffect(() => {
    if (permission !== 'granted' || !bioMetrics?.systemMode) return;

    if (bioMetrics.systemMode === 'SURVIVAL' || bioMetrics.systemMode === 'LOCKED_RECOVERY') {
      notifySurvivalMode();
    }
  }, [bioMetrics?.systemMode, permission, notifySurvivalMode]);

  // Check-in reminder (only on page load if not checked in)
  useEffect(() => {
    if (permission !== 'granted' || operatingMode === 'OBSERVER') return;

    // Only remind once per session
    const reminded = sessionStorage.getItem('checkin_reminded');
    if (!todayCheckedIn && !reminded && dayCount > 1) {
      // Delay reminder by 2 seconds to not be immediate
      const timeout = setTimeout(() => {
        notifyCheckInReminder();
        sessionStorage.setItem('checkin_reminded', 'true');
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [todayCheckedIn, permission, dayCount, notifyCheckInReminder, operatingMode]);

  // Log a health category
  const handleLogCategory = useCallback((category: CategoryKey, value: string, status: string) => {
    setHealthData(prev => ({
      ...prev,
      [category]: { category, value, status: status as StatusValue, logged: true }
    }));

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

    if (category === "mental" && (value === "high" || value === "critical")) {
      setIsRecoveryMode(true);
      if (permission === "granted") {
        notifyRecoveryMode();
      }
      if (permission === "granted") {
        notifyRecoveryMode();
      }
    }
  }, [currentTaskIndex, healthData, categories, permission, notifyRecoveryMode, operatingMode]);

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

      if (response.recoveryRequired) {
        setIsRecoveryMode(true);
        if (permission === "granted" && operatingMode === 'CARETAKER') {
          notifyRecoveryMode();
        }
      }

      const stats = await api.getUserStats();
      setDayCount(stats.dayCount);
      setStreak(stats.streak);
      if (stats.metrics) setBioMetrics(stats.metrics);

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

  const getStatusBg = (status: StatusValue) => {
    switch (status) {
      case "OK":
      case "DONE":
        return "bg-primary/20";
      case "LOW":
      case "HIGH":
        return "bg-destructive/20";
      case "PENDING":
        return "bg-yellow-500/20";
      default:
        return "bg-muted/20";
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
    <div className="min-h-screen bg-background safe-area-bottom">
      <PresenceNotification show={showPresence} onDismiss={handleDismissPresence} />

      {/* Cooldown Banner */}
      {cooldownActive && (
        <div className="bg-destructive/10 border-b border-destructive/30 py-3 px-4">
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm font-mono text-destructive flex items-center gap-2">
              <span>🔒</span>
              <span>Check-in locked: {cooldownRemaining} remaining</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              SURVIVAL warning dismissed
            </p>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        {/* Header Row */}
        <div className="flex justify-between items-start gap-4 mb-4">
          <SystemHeader
            dayCount={dayCount}
            isRecoveryMode={isRecoveryMode}
            streak={streak}
            userName={userName}
            integrity={calculateIntegrity()}
            operatingMode={operatingMode}
            onSettingsClick={() => setShowSettings(true)}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="text-xs font-mono text-muted-foreground hover:text-destructive transition-colors px-3 py-2 border border-transparent hover:border-destructive/50 rounded-lg shrink-0"
            >
              [LOGOUT]
            </button>
          </div>
        </div>

        {/* Quick Actions Row */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <WeatherWidget compact onWeatherUpdate={(w) => setWeatherData(w)} />
          <div className="flex items-center gap-2">
            {/* Focus Timer Button */}
            <button
              onClick={() => setShowFocusTimer(true)}
              className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 hover:bg-cyan-500/20 transition-all text-xs font-mono"
            >
              <span>🧘</span>
              <span className="hidden sm:inline">Focus</span>
            </button>
            {/* Data Export Button */}
            <button
              onClick={() => setShowDataExport(true)}
              className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-xl text-primary hover:bg-primary/20 transition-all text-xs font-mono"
            >
              <span>📤</span>
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Biological Status - Full Width */}
        <BiologicalStatus metrics={bioMetrics} />

        {/* TODAY'S FOCUS CARD (Prominent) - Only in Caretaker Mode */}
        {engagement?.focus && operatingMode === 'CARETAKER' && (
          <div className={`mb-5 p-4 sm:p-5 rounded-xl border-2 transition-all duration-300 animate-fade-in ${engagement.focus.priority === 'critical'
            ? 'border-destructive bg-destructive/10 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
            : engagement.focus.priority === 'high'
              ? 'border-yellow-500 bg-yellow-500/10'
              : engagement.focus.priority === 'medium'
                ? 'border-primary/50 bg-primary/5'
                : 'border-muted/30 bg-black/20'
            }`}>
            <div className="flex justify-between items-start gap-3 mb-3">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                📌 Today's Focus
              </p>
              <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${engagement.focus.priority === 'critical' ? 'bg-destructive text-white' :
                engagement.focus.priority === 'high' ? 'bg-yellow-500 text-black' :
                  'bg-primary/20 text-primary'
                }`}>
                {engagement.focus.priority.toUpperCase()}
              </span>
            </div>
            <h3 className={`text-lg sm:text-xl font-bold font-mono mb-2 ${engagement.focus.priority === 'critical' ? 'text-destructive' :
              engagement.focus.priority === 'high' ? 'text-yellow-500' : 'text-primary'
              }`}>
              {engagement.focus.title}
            </h3>
            <p className="text-xs text-muted-foreground mb-2 font-mono">{engagement.focus.reason}</p>
            <p className="text-sm font-mono leading-relaxed">{engagement.focus.action}</p>
          </div>
        )}

        {/* PATTERN ALERTS */}
        {engagement?.patterns && engagement.patterns.length > 0 && (
          <div className="mb-5 space-y-2">
            {engagement.patterns.map((pattern, idx) => (
              <div key={idx} className="flex items-center gap-3 p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-xl">
                <span className="text-xl shrink-0">⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono font-bold text-yellow-500">
                    {pattern.type === 'chronicSleep' && `${pattern.days} days of poor sleep`}
                    {pattern.type === 'chronicStress' && `${pattern.days} days of high stress`}
                    {pattern.type === 'lowSleep' && `${pattern.day}s often have poor sleep`}
                    {pattern.type === 'highStress' && `${pattern.day}s often have high stress`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RECOVERY SCORE */}
        {engagement?.recoveryScore && (
          <div className="mb-5 p-4 border border-muted/30 bg-black/20 rounded-xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                🧠 Recovery Score
              </span>
              <span className={`text-2xl font-mono font-bold ${engagement.recoveryScore.score >= 70 ? 'text-primary' :
                engagement.recoveryScore.score >= 40 ? 'text-yellow-500' : 'text-destructive'
                }`}>
                {engagement.recoveryScore.score}
              </span>
            </div>
            <div className="progress-bar mb-3">
              <div
                className={`progress-bar-fill ${engagement.recoveryScore.score >= 70 ? 'bg-primary' :
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

        {/* TIME-AWARE ADVICE */}
        {engagement?.timeAdvice && (
          <div className="mb-5 p-4 border border-cyan-500/30 bg-cyan-500/5 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">{engagement.timeAdvice.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">
                  ⏰ {engagement.timeAdvice.timeOfDay.toUpperCase()} Advice
                </p>
                <p className="text-sm font-mono text-cyan-300 leading-relaxed">
                  {engagement.timeAdvice.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* WHAT CHANGED DIFF */}
        {engagement?.whatChanged && (
          <div className="mb-5 p-4 border border-purple-500/30 bg-purple-500/5 rounded-xl">
            <p className="text-[10px] font-mono text-purple-400 uppercase tracking-widest mb-3">
              📊 What Changed Since Yesterday
            </p>

            {engagement.whatChanged.changes.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {engagement.whatChanged.changes.map((change, idx) => (
                  <span
                    key={idx}
                    className={`text-xs font-mono px-2.5 py-1.5 rounded-lg ${change.improved
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

            {engagement.whatChanged.insights.map((insight, idx) => (
              <p key={idx} className="text-sm font-mono text-purple-300 mb-1 leading-relaxed">
                💡 {insight}
              </p>
            ))}
          </div>
        )}

        {/* Report Status Button */}
        {!healthData.water.logged && (
          <button
            onClick={() => setCurrentTaskIndex(0)}
            className="w-full text-sm font-mono bg-primary/10 text-primary border border-primary/50 p-4 mb-5 hover:bg-primary/20 active:scale-[0.98] transition-all tracking-widest uppercase flex justify-between items-center rounded-xl"
          >
            <span>Report Status</span>
            <span className="text-xs">[UPDATE]</span>
          </button>
        )}

        <NotificationControl />

        {/* Tactical Archives Toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full text-xs font-mono text-muted-foreground border border-dashed border-border p-3 mb-5 hover:text-primary hover:border-primary transition-colors flex justify-between items-center rounded-xl"
        >
          <span>:: TACTICAL ARCHIVES ::</span>
          <span>{showHistory ? "CLOSE [-]" : "ACCESS [+]"}</span>
        </button>

        {showHistory && <div className="mb-5 animate-slide-up"><TacticalHistory /></div>}

        {aiResponse && (() => {
          const mode = aiResponse.metrics?.systemMode || aiResponse.systemStatus;
          const capacity = aiResponse.metrics?.capacity || 100;
          const confidence = aiResponse.confidence || 75;
          const urgency = aiResponse.urgency || 'medium';
          const timeframe = aiResponse.timeframe || 'today';
          const category = aiResponse.category || 'general';

          let severity: 'SUGGESTION' | 'WARNING' | 'CRITICAL' = 'SUGGESTION';
          let severityColor = 'border-primary/30 bg-primary/5';
          let badgeColor = 'bg-primary/20 text-primary';
          let icon = '💡';

          if (mode === 'SURVIVAL' || capacity < 20 || urgency === 'critical') {
            severity = 'CRITICAL';
            severityColor = 'border-destructive bg-destructive/10';
            badgeColor = 'bg-destructive text-white';
            icon = '🚨';
          } else if (mode === 'LOCKED_RECOVERY' || capacity < 45 || urgency === 'high') {
            severity = 'WARNING';
            severityColor = 'border-yellow-500/50 bg-yellow-500/10';
            badgeColor = 'bg-yellow-500 text-black';
            icon = '⚠️';
          }

          // Confidence color
          const confidenceColor = confidence >= 80 ? 'text-primary'
            : confidence >= 60 ? 'text-yellow-500'
              : 'text-orange-500';

          return (
            <div className={`system-card mb-5 ${severityColor} transition-all duration-300 animate-slide-up`}>
              {/* Header with badges */}
              <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full ${badgeColor}`}>
                    {icon} {severity}
                  </span>
                  {/* Category Badge */}
                  <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-muted/30 text-muted-foreground uppercase">
                    {category}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Confidence Indicator */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-mono">CONF:</span>
                    <span className={`text-sm font-mono font-bold ${confidenceColor}`}>
                      {confidence}%
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    CAP: {capacity}%
                  </span>
                </div>
              </div>

              {/* Action */}
              {aiResponse.action && aiResponse.action !== "None" && (
                <p className={`text-base sm:text-lg font-bold font-mono mb-2 ${severity === 'CRITICAL' ? 'text-destructive' :
                  severity === 'WARNING' ? 'text-yellow-500' : 'text-primary'
                  }`}>
                  {aiResponse.action}
                </p>
              )}

              {/* Timeframe */}
              {timeframe && (
                <p className="text-xs font-mono text-primary/70 mb-3">
                  ⏰ {timeframe}
                </p>
              )}

              {/* Explanation */}
              <p className="text-sm font-mono text-muted-foreground leading-relaxed">
                {aiResponse.explanation}
              </p>

              {/* Trend Summary */}
              {aiResponse.trendSummary && aiResponse.trendSummary !== 'Using rules-based analysis.' && (
                <div className="mt-3 p-2 bg-muted/10 rounded-lg">
                  <p className="text-[10px] font-mono text-muted-foreground">
                    📈 {aiResponse.trendSummary}
                  </p>
                </div>
              )}

              {/* Memory Callback */}
              {aiResponse.memoryCallback?.message && (
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-1">
                    💭 Memory
                  </p>
                  <p className="text-sm font-mono text-blue-300 leading-relaxed">
                    {aiResponse.memoryCallback.message}
                  </p>
                </div>
              )}

              {/* Confidence Legend */}
              <div className="mt-4 pt-3 border-t border-muted/20 flex flex-wrap justify-between items-center gap-2">
                <div className="text-[10px] font-mono text-muted-foreground/70">
                  {severity === 'CRITICAL' ? (
                    <span>🚨 CRITICAL = Immediate action required</span>
                  ) : severity === 'WARNING' ? (
                    <span>⚠️ WARNING = Recommended action</span>
                  ) : (
                    <span>💡 SUGGESTION = Optional improvement</span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground/50">
                  {confidence >= 80 ? '✅ High confidence' : confidence >= 60 ? '🟡 Moderate confidence' : '🟠 Learning...'}
                </div>
              </div>

              {/* Feedback Buttons */}
              <div className="mt-4 pt-3 border-t border-muted/20">
                {feedbackGiven ? (
                  <div className="flex items-center justify-center gap-2 text-sm font-mono">
                    <span className="text-primary">✅ Thanks for your feedback!</span>
                    <span className="text-muted-foreground">({feedbackGiven === 'helpful' ? '👍' : '👎'})</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-[10px] font-mono text-muted-foreground">Was this helpful?</span>
                    <button
                      onClick={async () => {
                        setFeedbackLoading(true);
                        try {
                          await api.submitFeedback({
                            rating: 'helpful',
                            aiResponse: {
                              action: aiResponse.action,
                              explanation: aiResponse.explanation,
                              urgency: aiResponse.urgency,
                              confidence: aiResponse.confidence,
                              category: aiResponse.category
                            },
                            healthContext: {
                              ...Object.values(healthData).reduce((acc, h) => ({ ...acc, [h.category]: h.status }), {}),
                              capacity
                            }
                          });
                          setFeedbackGiven('helpful');
                          toast({ title: '👍 Thanks!', description: 'Your feedback helps us improve.' });
                        } catch (e) {
                          console.error('Feedback error:', e);
                        }
                        setFeedbackLoading(false);
                      }}
                      disabled={feedbackLoading}
                      className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-mono font-bold hover:bg-primary/30 transition-all disabled:opacity-50"
                    >
                      👍 Yes
                    </button>
                    <button
                      onClick={async () => {
                        setFeedbackLoading(true);
                        try {
                          await api.submitFeedback({
                            rating: 'not_helpful',
                            aiResponse: {
                              action: aiResponse.action,
                              explanation: aiResponse.explanation,
                              urgency: aiResponse.urgency,
                              confidence: aiResponse.confidence,
                              category: aiResponse.category
                            },
                            healthContext: {
                              ...Object.values(healthData).reduce((acc, h) => ({ ...acc, [h.category]: h.status }), {}),
                              capacity
                            }
                          });
                          setFeedbackGiven('not_helpful');
                          toast({ title: '👎 Got it', description: 'We\'ll work on better recommendations.' });
                        } catch (e) {
                          console.error('Feedback error:', e);
                        }
                        setFeedbackLoading(false);
                      }}
                      disabled={feedbackLoading}
                      className="px-3 py-1.5 bg-muted/20 text-muted-foreground border border-muted/30 rounded-lg text-xs font-mono font-bold hover:bg-muted/30 transition-all disabled:opacity-50"
                    >
                      👎 No
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {isLoading && (
          <div className="system-card mb-5 text-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="system-text text-primary">PROCESSING...</p>
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
              className="system-button w-full mb-5"
            >
              EXIT RECOVERY MODE
            </button>
          </>
        ) : (
          <>
            {/* Status Overview */}
            <div className="system-card mb-5">
              <p className="system-text text-muted-foreground mb-4">
                STATUS CHECK [{loggedCount}/{categories.length}]
              </p>

              {/* Progress bar */}
              <div className="flex gap-1.5 mb-5">
                {categories.map((cat) => (
                  <div
                    key={cat}
                    className={`flex-1 h-2 rounded-full transition-all duration-300 ${healthData[cat].logged ? 'bg-primary shadow-[0_0_8px_#4ade8080]' : 'bg-muted/50'
                      }`}
                  />
                ))}
              </div>

              {/* Status grid - responsive */}
              <div className="status-grid">
                {categories.map((cat, idx) => (
                  <button
                    key={cat}
                    onClick={() => setCurrentTaskIndex(idx)}
                    className={`status-item ${idx === currentTaskIndex
                      ? 'status-item-active'
                      : healthData[cat].logged
                        ? 'status-item-logged hover:border-primary/50 hover:bg-black/40'
                        : 'status-item-pending hover:border-primary/70 hover:bg-primary/5'
                      }`}
                  >
                    <div className="text-lg mb-1">{TASK_CATEGORIES[cat].icon}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mb-1 tracking-wider">
                      {TASK_CATEGORIES[cat].label}
                    </div>
                    <div className={`text-xs sm:text-sm font-bold font-mono ${getStatusColor(healthData[cat].status)}`}>
                      {healthData[cat].logged ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${getStatusBg(healthData[cat].status)}`}>
                          ✓
                        </span>
                      ) : '---'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Current Task Input */}
            {currentCategory && (
              <div className="system-card mb-5 animate-slide-up">
                <p className="system-text text-muted-foreground mb-2">
                  INPUT [{currentTaskIndex + 1}/{categories.length}]
                </p>
                <p className="text-base sm:text-lg font-medium mb-4 flex items-center gap-3">
                  <span className="text-2xl">{TASK_CATEGORIES[currentCategory].icon}</span>
                  {TASK_CATEGORIES[currentCategory].question}
                </p>

                <div className="space-y-2">
                  {TASK_CATEGORIES[currentCategory].options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleLogCategory(currentCategory, option.value, option.status)}
                      className="option-button"
                    >
                      <span className="font-mono text-sm">{option.label}</span>
                      <span className={`text-xs font-mono ${getStatusColor(option.status as StatusValue)} ${getStatusBg(option.status as StatusValue)} px-2 py-1 rounded-full`}>
                        {option.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            {todayCheckedIn ? (
              <div className="text-center mb-5 p-5 border border-muted bg-muted/10 rounded-xl">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">✅</span>
                </div>
                <p className="text-sm font-mono text-muted-foreground mb-2">Today's check-in recorded</p>
                <p className="text-xs font-mono text-primary flex items-center justify-center gap-2">
                  <span>🕐</span>
                  <span>Next cycle: {nextCycleTime || 'Tomorrow'}</span>
                </p>
              </div>
            ) : (
              <button
                onClick={callAI}
                disabled={isLoading || (!allLogged && !currentCategory)}
                className="system-button w-full mb-5"
              >
                {isLoading ? "PROCESSING..." : aiResponse ? "UPDATE STATUS" : !allLogged ? `COMPLETE ${categories.length - loggedCount} MORE` : "SUBMIT CHECK-IN"}
              </button>
            )}
          </>
        )}

        <ConsistencyState messageIndex={dayCount} />

        <footer className="text-center py-6">
          <p className="text-xs text-muted-foreground">
            v1.0.0 | Caretaker AI
          </p>
        </footer>
      </div>

      {/* Bottom Navigation Bar - Mobile only */}
      <nav className="bottom-nav sm:hidden">
        <div className="bottom-nav-inner">
          <button
            onClick={() => setShowAnalytics(true)}
            className="bottom-nav-item"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="bottom-nav-label">Stats</span>
          </button>
          <button
            onClick={() => setShowAchievements(true)}
            className="bottom-nav-item"
          >
            <span className="text-lg">🏅</span>
            <span className="bottom-nav-label">Badges</span>
          </button>
          <button
            onClick={() => setShowGoalSettings(true)}
            className="bottom-nav-item"
          >
            <span className="text-lg">🎯</span>
            <span className="bottom-nav-label">Goals</span>
          </button>
          <button
            onClick={() => setShowWeeklyReview(!showWeeklyReview)}
            className="bottom-nav-item"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="bottom-nav-label">Review</span>
          </button>
          <button
            onClick={() => setShowFocusTimer(true)}
            className="bottom-nav-item"
          >
            <span className="text-lg">🧘</span>
            <span className="bottom-nav-label">Focus</span>
          </button>
        </div>
      </nav>

      {/* Desktop Floating Action Buttons */}
      <div className="fab-container">
        <button
          onClick={() => setShowAnalytics(true)}
          className="fab-button bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border-cyan-500/50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Analytics</span>
        </button>
        <button
          onClick={() => setShowWeeklyReview(!showWeeklyReview)}
          className="fab-button bg-primary/20 hover:bg-primary/30 text-primary border-primary/50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Review</span>
        </button>
        <button
          onClick={() => setShowAchievements(true)}
          className="fab-button bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/50"
        >
          <span className="text-lg">🏅</span>
          <span>Badges</span>
        </button>
        <button
          onClick={() => setShowGoalSettings(true)}
          className="fab-button bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/50"
        >
          <span className="text-lg">🎯</span>
          <span>Goals</span>
        </button>
        <button
          onClick={() => setShowFocusTimer(true)}
          className="fab-button bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border-purple-500/50"
        >
          <span className="text-lg">🧘</span>
          <span>Focus</span>
        </button>
      </div>

      {/* Analytics Dashboard Modal */}
      {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}

      {/* Weekly Review Modal */}
      {showWeeklyReview && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowWeeklyReview(false)}>
          <div className="modal-content">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-mono font-bold text-primary flex items-center gap-2">
                <span>📅</span>
                <span>Weekly Reflection</span>
              </h2>
              <button onClick={() => setShowWeeklyReview(false)} className="text-muted-foreground hover:text-white p-2 -mr-2 transition-colors">
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground mb-5">2-minute ritual to build self-awareness</p>

            <div className="space-y-4">
              <div>
                <label className="form-label">✓ What went well?</label>
                <textarea
                  className="form-input resize-none"
                  rows={3}
                  value={reflection.wentWell}
                  onChange={e => setReflection(prev => ({ ...prev, wentWell: e.target.value }))}
                  placeholder="Moments of good recovery, healthy choices..."
                />
              </div>

              <div>
                <label className="form-label">⚡ What drained you?</label>
                <textarea
                  className="form-input resize-none"
                  rows={3}
                  value={reflection.drained}
                  onChange={e => setReflection(prev => ({ ...prev, drained: e.target.value }))}
                  placeholder="Stressors, sleep issues, overcommitments..."
                />
              </div>

              <div>
                <label className="form-label">🧪 Experiment for next week</label>
                <textarea
                  className="form-input resize-none"
                  rows={3}
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
              className="system-button system-button-primary w-full mt-5"
            >
              Save Reflection
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}>
          <div className="modal-content">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-mono font-bold text-primary flex items-center gap-2">
                <span>⚙️</span>
                <span>Settings</span>
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-white p-2 -mr-2 transition-colors">
                ✕
              </button>
            </div>

            <p className="form-label mb-4">Operating Mode</p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  toggleMode('CARETAKER');
                  setShowSettings(false);
                }}
                className={`w-full p-4 border rounded-xl text-left transition-all active:scale-[0.98] ${operatingMode === 'CARETAKER'
                  ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                  : 'border-primary/30 hover:bg-primary/10'
                  }`}
              >
                <p className="font-mono font-bold text-primary mb-1 flex items-center gap-2">
                  <span>🛡️</span>
                  <span>CARETAKER Mode</span>
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Full guidance with recovery enforcement. AI recommends actions when capacity is low.
                </p>
              </button>

              <button
                onClick={() => {
                  toggleMode('OBSERVER');
                  setShowSettings(false);
                }}
                className={`w-full p-4 border rounded-xl text-left transition-all active:scale-[0.98] ${operatingMode === 'OBSERVER'
                  ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                  : 'border-muted/30 hover:bg-muted/10'
                  }`}
              >
                <p className="font-mono font-bold text-muted-foreground mb-1 flex items-center gap-2">
                  <span>👁️</span>
                  <span>OBSERVER Mode</span>
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tracking only, no recommendations. You decide what to do with the data.
                </p>
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground mt-5 text-center">
              Current mode affects AI suggestions and recovery recommendations
            </p>
          </div>
        </div>
      )}

      {/* Recovery Lock Enforcement (Only in Caretaker Mode) */}
      <RecoveryLock
        isVisible={showRecoveryLock && operatingMode === 'CARETAKER'}
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

      {/* Focus Timer Modal */}
      {showFocusTimer && (
        <FocusTimer
          onClose={() => setShowFocusTimer(false)}
          onSessionComplete={(duration) => {
            // Could update mental load or trigger check-in
            toast({
              title: '🧘 Focus Session Complete',
              description: `Great work! ${Math.round(duration / 60)} minutes of deep focus.`
            });
          }}
        />
      )}

      {/* Data Export Modal */}
      {showDataExport && (
        <DataExport onClose={() => setShowDataExport(false)} />
      )}

      {/* Achievements Modal */}
      {showAchievements && (
        <Achievements onClose={() => setShowAchievements(false)} />
      )}

      {/* Goal Settings Modal */}
      {showGoalSettings && (
        <GoalSettings onClose={() => setShowGoalSettings(false)} />
      )}
    </div>
  );
};

export default Index;
