import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import SystemHeader from "@/components/SystemHeader";
import { RecoveryLock } from "@/components/RecoveryLock";
import { useNotifications } from "@/hooks/use-notifications";
import { useToast } from "@/hooks/use-toast";
import { WeatherWidget } from "@/components/WeatherWidget";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { FocusTimer } from "@/components/FocusTimer";

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

const Index = () => {
  // State
  const [dayCount, setDayCount] = useState(1);
  const [streak, setStreak] = useState(0);
  const [userName, setUserName] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [operatingMode, setOperatingMode] = useState<'CARETAKER' | 'OBSERVER'>('CARETAKER');
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [bioMetrics, setBioMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecoveryLock, setShowRecoveryLock] = useState(false);

  // Modal States
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showFocusTimer, setShowFocusTimer] = useState(false);

  // New States
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

  // Fetch logic (Simulated/Real)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats: any = await api.getUserStats();
        if (stats.metrics) setBioMetrics(stats.metrics);
        setDayCount(stats.dayCount || 1);
        setStreak(stats.streak || 0);
        setUserName(stats.name || "Traveler");
        if (stats.mode) setOperatingMode(stats.mode);

        // Restore check-ins
        if (stats.latestLog?.health) {
          const restored: any = { ...healthData };
          Object.keys(TASK_CATEGORIES).forEach((key) => {
            const k = key as CategoryKey;
            // Simple restoration logic
            if (stats.latestLog.health[k]) {
              restored[k] = { ...restored[k], status: 'OK', logged: true, value: 'Logged' };
            }
          });
          setHealthData(restored);
        }
      } catch (e) {
        console.error("Fetch stats failed", e);
      }
    };
    fetchStats();
  }, []);

  // Recovery Logic
  useEffect(() => {
    if (operatingMode !== 'CARETAKER') return;
    if (bioMetrics?.capacity !== undefined && bioMetrics.capacity < 45) {
      setShowRecoveryLock(true);
    }
  }, [bioMetrics, operatingMode]);

  // Logging Handler
  const handleLog = (category: CategoryKey, status: StatusValue) => {
    setHealthData(prev => ({
      ...prev,
      [category]: { ...prev[category], status, logged: true, value: "Logged" }
    }));
    toast({ title: "Logged", description: `${TASK_CATEGORIES[category].label} recorded.` });
  };

  // AI Check-in
  const performCheckIn = async () => {
    setIsLoading(true);
    try {
      const response = await api.checkIn({
        water: healthData.water.status,
        sleep: healthData.sleep.status
      }); // Simplified payload
      setAiResponse(response);
      if (response.recoveryRequired) setIsRecoveryMode(true);
    } catch (e) {
      toast({ title: "Check-in Failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-1000">
      <RecoveryLock
        isVisible={showRecoveryLock}
        capacity={bioMetrics?.capacity || 40}
        onAcknowledge={() => setShowRecoveryLock(false)}
      />

      {/* Modals */}
      {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}
      {showFocusTimer && <FocusTimer onClose={() => setShowFocusTimer(false)} />}

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">

        <SystemHeader
          dayCount={dayCount}
          isRecoveryMode={isRecoveryMode}
          streak={streak}
          userName={userName}
          operatingMode={operatingMode}
          onSettingsClick={() => toast({ title: "Settings", description: "Configuration panel coming soon." })}
        />

        {/* BENTO GRID LAYOUT */}
        <div className="bento-grid">

          {/* 1. MAIN FOCUS CARD (Large) */}
          <div className="col-span-2 md:col-span-2 row-span-2 bento-card p-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <div className="flex flex-col h-full justify-between">
              <div>
                <span className="pill pill-ok mb-4">Today's Focus</span>
                <h2 className="text-3xl md:text-4xl font-display font-medium leading-tight mb-2">
                  hydrate & <br /> <span className="text-gradient-teal">Recharge.</span>
                </h2>
                <p className="text-muted-foreground font-sans">
                  Your energy is stable. Drinking water now will boost your evening clarity.
                </p>
              </div>

              {/* Progress Ring or Visual */}
              <div className="mt-6 flex justify-end">
                <button onClick={performCheckIn} disabled={isLoading} className="btn-primary w-full md:w-auto">
                  {isLoading ? "Syncing..." : "Complete Check-in"}
                </button>
              </div>
            </div>
          </div>

          {/* 2. ANALYTICS & FOCUS CARDS (New) */}
          <div className="bento-card p-4 hover:border-primary/30 cursor-pointer group flex flex-col justify-between"
            onClick={() => setShowAnalytics(true)}
          >
            <div className="flex justify-between items-start">
              <span className="text-2xl">📊</span>
              <span className="text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">VIEW</span>
            </div>
            <div className="mt-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Analytics</h3>
              <p className="text-lg font-display font-medium text-white">Trends & Insights</p>
            </div>
          </div>

          <div className="bento-card p-4 hover:border-cyan-500/30 cursor-pointer group flex flex-col justify-between"
            onClick={() => setShowFocusTimer(true)}
          >
            <div className="flex justify-between items-start">
              <span className="text-2xl">🧘</span>
              <span className="text-xs font-bold text-muted-foreground group-hover:text-cyan-500 transition-colors">START</span>
            </div>
            <div className="mt-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Deep Work</h3>
              <p className="text-lg font-display font-medium text-white">Focus Timer</p>
            </div>
          </div>


          {/* 3. QUICK LOGGING CARDS (Small) */}
          {Object.entries(TASK_CATEGORIES).map(([key, info]) => {
            const k = key as CategoryKey;
            const data = healthData[k];
            return (
              <div key={key} className={`bento-card p-4 hover:border-primary/30 group cursor-pointer ${data.logged ? 'bg-primary/5 border-primary/20' : ''}`}
                onClick={() => handleLog(k, 'OK')}
              >
                <div className="flex justify-between items-start">
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{info.icon}</span>
                  {data.logged && <span className="text-primary text-xs font-bold">✓</span>}
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{info.label}</h3>
                  <p className="text-lg font-display font-semibold group-hover:text-primary transition-colors">
                    {data.logged ? "Recorded" : "Log Now"}
                  </p>
                </div>
              </div>
            );
          })}

          {/* 4. WEATHER / ENVIRONMENT (Wide) */}
          <div className="col-span-2 bento-card p-0 overflow-hidden">
            <WeatherWidget compact={false} onWeatherUpdate={() => { }} />
          </div>

          {/* 5. AI INSIGHT (Wide) */}
          {aiResponse && (
            <div className="col-span-2 md:col-span-4 bento-card p-6 border-white/10 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  ✨
                </div>
                <div>
                  <h3 className="text-lg font-display font-medium text-white/90 mb-1">Wellness Insight</h3>
                  <p className="text-muted-foreground font-sans leading-relaxed">
                    {aiResponse.explanation || "Your patterns suggest a strong recovery. Keep maintaining this sleep schedule."}
                  </p>
                  {aiResponse.action && (
                    <div className="mt-3 inline-block px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono">
                      Suggested: {aiResponse.action}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Index;
