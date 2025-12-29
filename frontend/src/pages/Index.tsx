import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import SystemHeader from "@/components/SystemHeader";
import { RecoveryLock } from "@/components/RecoveryLock";
import { useNotifications } from "@/hooks/use-notifications";
import { useToast } from "@/hooks/use-toast";

// All Feature Components

import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { FocusTimer } from "@/components/FocusTimer";
import TacticalHistory from "@/components/TacticalHistory";
import Achievements from "@/components/Achievements";
import GoalSettings from "@/components/GoalSettings";
import DataExport from "@/components/DataExport";
import RecoveryMode from "@/components/RecoveryMode";
import { VoiceLogger } from "@/components/VoiceLogger";

// Integrated Feature Components
import { BiologicalStatus } from "@/components/BiologicalStatus";
import CurrentAction from "@/components/CurrentAction";
import NotificationControl from "@/components/NotificationControl";
import ConsistencyState from "@/components/ConsistencyState";

// Task categories mapped to new design
const TASK_CATEGORIES = {
  water: { label: "Hydration", icon: "💧", question: "Water intake?", unit: "Liters" },
  food: { label: "Nutrition", icon: "🍏", question: "Meals today?", unit: "Meals" },
  exercise: { label: "Movement", icon: "🏃", question: "Activity?", unit: "Minutes" },
  sleep: { label: "Rest", icon: "😴", question: "Sleep last night?", unit: "Hours" },
  mental: { label: "Mind", icon: "🧠", question: "Stress level?", unit: "Level" },
};

type CategoryKey = keyof typeof TASK_CATEGORIES;
type StatusValue = "OK" | "LOW" | "DONE" | "PENDING" | "HIGH" | "NOT_SET";

interface HealthData {
  category: CategoryKey;
  value: string;
  status: StatusValue;
  logged: boolean;
}

interface RecoveryTask {
  label: string;
  completed: boolean;
}

const Index = () => {
  // Core State
  const [dayCount, setDayCount] = useState(1);
  const [streak, setStreak] = useState(0);
  const [userName, setUserName] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [operatingMode, setOperatingMode] = useState<'CARETAKER' | 'OBSERVER'>('CARETAKER');
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [bioMetrics, setBioMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecoveryLock, setShowRecoveryLock] = useState(false);
  const [todayCheckedIn, setTodayCheckedIn] = useState(false);
  const [nextCheckInTime, setNextCheckInTime] = useState<string>("");

  // Modal States for ALL features
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showFocusTimer, setShowFocusTimer] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);

  // Recovery Tasks
  const [recoveryTasks, setRecoveryTasks] = useState<RecoveryTask[]>([
    { label: "Drink a glass of water", completed: false },
    { label: "Take a 5-min break from screen", completed: false },
    { label: "Do 10 deep breaths", completed: false },
  ]);

  // Health Data State
  const [healthData, setHealthData] = useState<Record<CategoryKey, HealthData>>({
    water: { category: "water", value: "", status: "NOT_SET", logged: false },
    food: { category: "food", value: "", status: "NOT_SET", logged: false },
    exercise: { category: "exercise", value: "", status: "NOT_SET", logged: false },
    sleep: { category: "sleep", value: "", status: "NOT_SET", logged: false },
    mental: { category: "mental", value: "", status: "NOT_SET", logged: false },
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const { notifyRecoveryMode, notifyCriticalCapacity, permission } = useNotifications();

  // Fetch User Data
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats: any = await api.getUserStats();
        if (stats.metrics) setBioMetrics(stats.metrics);
        setDayCount(stats.dayCount || 1);
        setStreak(stats.streak || 0);
        setUserName(stats.name || "Traveler");
        if (stats.mode) setOperatingMode(stats.mode);

        // Restore check-ins from latest log
        if (stats.latestLog?.health) {
          const h = stats.latestLog.health;
          const restored: Record<CategoryKey, HealthData> = {
            water: { category: 'water', value: 'Logged', status: h.water ? 'OK' : 'NOT_SET', logged: !!h.water },
            food: { category: 'food', value: 'Logged', status: h.food ? 'OK' : 'NOT_SET', logged: !!h.food },
            exercise: { category: 'exercise', value: 'Logged', status: h.exercise ? 'OK' : 'NOT_SET', logged: !!h.exercise },
            sleep: { category: 'sleep', value: 'Logged', status: h.sleep ? 'OK' : 'NOT_SET', logged: !!h.sleep },
            mental: { category: 'mental', value: 'Logged', status: h.mentalLoad ? 'OK' : 'NOT_SET', logged: !!h.mentalLoad },
          };
          setHealthData(restored);

          // If already checked in today, restore AI response and lock check-in
          if (stats.todayCheckedIn && stats.latestLog?.aiResponse) {
            setAiResponse(stats.latestLog.aiResponse);
            setTodayCheckedIn(true);
          }
        }

        // Check for recovery mode from API
        if (stats.metrics?.capacity < 45 && operatingMode === 'CARETAKER') {
          setIsRecoveryMode(true);
        }

        // Set todayCheckedIn flag
        if (stats.todayCheckedIn) {
          setTodayCheckedIn(true);
        }
      } catch (e) {
        console.error("Fetch stats failed", e);
      }
    };
    fetchStats();
  }, []);

  // Countdown timer to next check-in (midnight)
  useEffect(() => {
    if (!todayCheckedIn) return;

    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setNextCheckInTime(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000); // Update every second
    return () => clearInterval(interval);
  }, [todayCheckedIn]);

  // Recovery Lock Logic
  useEffect(() => {
    if (operatingMode !== 'CARETAKER') return;
    if (bioMetrics?.capacity !== undefined && bioMetrics.capacity < 45) {
      setShowRecoveryLock(true);
      notifyCriticalCapacity?.(bioMetrics.capacity);
    }
  }, [bioMetrics, operatingMode]);

  // Logging Handler
  const handleLog = (category: CategoryKey, status: StatusValue) => {
    setHealthData(prev => ({
      ...prev,
      [category]: { ...prev[category], status, logged: true, value: "Logged" }
    }));
    toast({ title: "✓ Logged", description: `${TASK_CATEGORIES[category].label} recorded.` });
  };

  // Voice Logger Handler
  const handleVoiceUpdate = (data: any) => {
    if (data.water) handleLog('water', data.water);
    if (data.food) handleLog('food', data.food);
    if (data.sleep) handleLog('sleep', data.sleep);
    if (data.exercise) handleLog('exercise', data.exercise);
    if (data.mental) handleLog('mental', data.mental);
  };

  // Recovery Task Toggle
  const handleToggleRecoveryTask = (index: number) => {
    setRecoveryTasks(prev => prev.map((task, i) =>
      i === index ? { ...task, completed: !task.completed } : task
    ));
  };

  // AI Check-in (once per day)
  const performCheckIn = async () => {
    if (todayCheckedIn) {
      toast({ title: "Already Checked In", description: `Next check-in available in ${nextCheckInTime}` });
      return;
    }

    // Validation: Ensure at least one metric is logged
    const hasData = Object.values(healthData).some(d => d.status !== 'NOT_SET');
    if (!hasData) {
      toast({
        title: "No Data Logged",
        description: "Please record at least one health metric (e.g., Sleep, Water) before checking in.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        water: healthData.water.status !== 'NOT_SET' ? healthData.water.status : undefined,
        food: healthData.food.status !== 'NOT_SET' ? healthData.food.status : undefined,
        sleep: healthData.sleep.status !== 'NOT_SET' ? healthData.sleep.status : undefined,
        exercise: healthData.exercise.status !== 'NOT_SET' ? healthData.exercise.status : undefined,
        mentalLoad: healthData.mental.status !== 'NOT_SET' ? healthData.mental.status : undefined,
      };

      const response = await api.checkIn(payload as any);
      setAiResponse(response);
      setTodayCheckedIn(true);

      if (response.metrics) setBioMetrics(response.metrics);
      if (response.recoveryRequired) {
        setIsRecoveryMode(true);
        notifyRecoveryMode?.();
      }

      toast({ title: "✓ Check-in Complete", description: "Your wellness data has been synced. See you tomorrow!" });
    } catch (e) {
      toast({ title: "Check-in Failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Automatic Check-in for High Stress
  useEffect(() => {
    if (healthData.mental.status === 'HIGH' && !todayCheckedIn && !isLoading) {
      toast({
        title: "⚠️ High Stress Detected",
        description: "Initiating immediate wellness check-in for support...",
        variant: "destructive",
        duration: 5000
      });

      const timer = setTimeout(() => {
        performCheckIn();
      }, 1500); // 1.5s delay to let user see the toast

      return () => clearTimeout(timer);
    }
  }, [healthData.mental.status, todayCheckedIn, isLoading]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-1000">
      {/* Recovery Lock Overlay */}
      <RecoveryLock
        isVisible={showRecoveryLock}
        capacity={bioMetrics?.capacity || 40}
        onAcknowledge={() => setShowRecoveryLock(false)}
      />

      {/* Full-Screen Modals */}
      {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}
      {showFocusTimer && <FocusTimer onClose={() => setShowFocusTimer(false)} />}
      {showAchievements && <Achievements onClose={() => setShowAchievements(false)} />}
      {showGoals && <GoalSettings onClose={() => setShowGoals(false)} />}
      {showDataExport && <DataExport onClose={() => setShowDataExport(false)} />}

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">

        {/* System Header */}
        <SystemHeader
          dayCount={dayCount}
          isRecoveryMode={isRecoveryMode}
          streak={streak}
          userName={userName}
          operatingMode={operatingMode}
          onSettingsClick={() => setShowGoals(true)}
        />

        {/* BiologicalStatus moved to Settings */}

        {/* Recovery Mode Tasks (shows only in recovery) */}
        {isRecoveryMode && (
          <RecoveryMode tasks={recoveryTasks} onToggleTask={handleToggleRecoveryTask} />
        )}

        {/* BENTO GRID LAYOUT */}
        <div className="bento-grid">

          {/* Notification Permission Control (Auto-hides if granted) */}
          <div className="col-span-2 md:col-span-4">
            <NotificationControl />
          </div>

          {/* 1. MAIN FOCUS CARD (Large) */}
          <div className="col-span-2 md:col-span-2 row-span-2 bento-card p-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <div className="flex flex-col h-full justify-between">
              <div>
                <span className="pill pill-ok mb-4">{aiResponse ? "AI Insight" : "Check-in"}</span>

                {aiResponse ? (
                  <>
                    <h2 className="text-3xl md:text-4xl font-display font-medium leading-tight mb-2">
                      {aiResponse.action || "Continue"} <br />
                      <span className="text-gradient-teal">{aiResponse.focus || "your flow."}</span>
                    </h2>
                    <p className="text-muted-foreground font-sans">
                      {aiResponse.explanation}
                    </p>
                    {aiResponse.metrics?.capacity && (
                      <p className="text-xs text-primary mt-2 font-mono">
                        Capacity: {aiResponse.metrics.capacity}% | Confidence: {Math.round((aiResponse.metrics?.confidence || 0) * 100)}%
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl md:text-4xl font-display font-medium leading-tight mb-2">
                      Log your <br />
                      <span className="text-gradient-teal">wellness data</span>
                    </h2>
                    <p className="text-muted-foreground font-sans">
                      Tap the categories below to record your daily inputs, then complete check-in for AI-powered insights.
                    </p>
                  </>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                {todayCheckedIn ? (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-xl">✅</span>
                    <div>
                      <p className="text-sm font-medium text-white">Checked in for today</p>
                      <p className="text-xs">Next check-in in <span className="text-primary font-bold">{nextCheckInTime}</span></p>
                    </div>
                  </div>
                ) : (
                  <button onClick={performCheckIn} disabled={isLoading} className="btn-primary w-full md:w-auto">
                    {isLoading ? "Analyzing..." : "Complete Check-in"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Biological Status */}
          {bioMetrics && (
            <div className="col-span-2 md:col-span-4">
              <BiologicalStatus metrics={bioMetrics} />
              {/* Current Required Action */}
              <CurrentAction
                action={bioMetrics.requiredAction}
                status={bioMetrics.requiredAction === "Continue Observation" ? "COMPLETED" : "PENDING"}
                onConfirm={() => { }}
              />
            </div>
          )}

          {/* 2. FEATURE ACCESS CARDS */}
          {/* Analytics */}
          <div className="bento-card p-4 hover:border-primary/30 cursor-pointer group flex flex-col justify-between"
            onClick={() => setShowAnalytics(true)}>
            <div className="flex justify-between items-start">
              <span className="text-2xl">📊</span>
              <span className="text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">VIEW</span>
            </div>
            <div className="mt-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Analytics</h3>
              <p className="text-lg font-display font-medium text-white">Trends & Insights</p>
            </div>
          </div>

          {/* Focus Timer */}
          <div className="bento-card p-4 hover:border-cyan-500/30 cursor-pointer group flex flex-col justify-between"
            onClick={() => setShowFocusTimer(true)}>
            <div className="flex justify-between items-start">
              <span className="text-2xl">🧘</span>
              <span className="text-xs font-bold text-muted-foreground group-hover:text-cyan-500 transition-colors">START</span>
            </div>
            <div className="mt-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Deep Work</h3>
              <p className="text-lg font-display font-medium text-white">Focus Timer</p>
            </div>
          </div>

          {/* Achievements */}
          <div className="bento-card p-4 hover:border-amber-500/30 cursor-pointer group flex flex-col justify-between"
            onClick={() => setShowAchievements(true)}>
            <div className="flex justify-between items-start">
              <span className="text-2xl">🏆</span>
              <span className="text-xs font-bold text-muted-foreground group-hover:text-amber-500 transition-colors">VIEW</span>
            </div>
            <div className="mt-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Trophies</h3>
              <p className="text-lg font-display font-medium text-white">Achievements</p>
            </div>
          </div>

          {/* Goals */}
          <div className="bento-card p-4 hover:border-emerald-500/30 cursor-pointer group flex flex-col justify-between"
            onClick={() => setShowGoals(true)}>
            <div className="flex justify-between items-start">
              <span className="text-2xl">🎯</span>
              <span className="text-xs font-bold text-muted-foreground group-hover:text-emerald-500 transition-colors">EDIT</span>
            </div>
            <div className="mt-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Targets</h3>
              <p className="text-lg font-display font-medium text-white">My Goals</p>
            </div>
          </div>

          {/* Data Export */}
          <div className="bento-card p-4 hover:border-violet-500/30 cursor-pointer group flex flex-col justify-between"
            onClick={() => setShowDataExport(true)}>
            <div className="flex justify-between items-start">
              <span className="text-2xl">📤</span>
              <span className="text-xs font-bold text-muted-foreground group-hover:text-violet-500 transition-colors">EXPORT</span>
            </div>
            <div className="mt-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Backup</h3>
              <p className="text-lg font-display font-medium text-white">Export Data</p>
            </div>
          </div>

          {/* Voice Logger */}
          <VoiceLogger onUpdate={handleVoiceUpdate} />

          {/* 3. QUICK LOGGING CARDS */}
          {Object.entries(TASK_CATEGORIES).map(([key, info]) => {
            const k = key as CategoryKey;
            const data = healthData[k];

            // Define cycle order for each category
            const getNextStatus = (current: StatusValue, category: CategoryKey): StatusValue => {
              if (category === 'exercise') {
                return current === 'NOT_SET' ? 'DONE' : current === 'DONE' ? 'PENDING' : 'NOT_SET';
              }
              if (category === 'mental') {
                return current === 'NOT_SET' ? 'OK' : current === 'OK' ? 'HIGH' : current === 'HIGH' ? 'LOW' : 'NOT_SET';
              }
              // Default (Water, Food, Sleep)
              return current === 'NOT_SET' ? 'OK' : current === 'OK' ? 'LOW' : 'NOT_SET';
            };

            const handleCardClick = () => {
              if (todayCheckedIn) return; // Lock after check-in

              const next = getNextStatus(data.status, k);
              if (next === 'NOT_SET') {
                // Reset
                setHealthData(prev => ({
                  ...prev,
                  [k]: { ...prev[k], status: 'NOT_SET', logged: false, value: "" }
                }));
              } else {
                handleLog(k, next);
              }
            };

            // Dynamic styling based on status
            const getStatusColor = () => {
              if (!data.logged) return 'hover:border-primary/30';
              if (data.status === 'HIGH' || data.status === 'LOW' || data.status === 'PENDING') return 'bg-red-500/10 border-red-500/50';
              return 'bg-primary/5 border-primary/20';
            };

            return (
              <div key={key}
                className={`bento-card p-4 group cursor-pointer transition-all duration-300 ${getStatusColor()}`}
                onClick={handleCardClick}>
                <div className="flex justify-between items-start">
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{info.icon}</span>
                  {data.logged && <span className={`text-xs font-bold ${data.status === 'HIGH' || data.status === 'LOW' ? 'text-red-400' : 'text-primary'}`}>
                    {data.status}
                  </span>}
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{info.label}</h3>
                  <p className={`text-lg font-display font-semibold transition-colors ${data.logged ? 'text-foreground' : 'group-hover:text-primary'}`}>
                    {data.logged ? (data.status === 'HIGH' ? 'High Stress' : data.status === 'LOW' ? 'Deficit' : data.status === 'PENDING' ? 'Skipped' : 'Good') : "Log Now"}
                  </p>
                </div>
              </div>
            );
          })}

          {/* 4. TACTICAL HISTORY (Wide) */}
          <div className="col-span-2 md:col-span-4 bento-card p-0 overflow-hidden">
            <TacticalHistory />
          </div>



          {/* 6. AI INSIGHT CARD (Wide) - Shows after check-in */}
          {aiResponse && aiResponse.explanation && (
            <div className="col-span-2 md:col-span-4 bento-card p-6 border-white/10 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  ✨
                </div>
                <div>
                  <h3 className="text-lg font-display font-medium text-white/90 mb-1">Wellness Insight</h3>
                  <p className="text-muted-foreground font-sans leading-relaxed">
                    {aiResponse.explanation}
                  </p>
                  {aiResponse.prediction && (
                    <div className="mt-3 inline-block px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-400">
                      ⚠ {aiResponse.prediction}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer Status */}
          <div className="col-span-2 md:col-span-4 mt-8">
            <ConsistencyState />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
