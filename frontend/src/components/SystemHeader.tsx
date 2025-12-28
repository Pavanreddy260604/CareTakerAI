import { useState } from "react";

interface SystemHeaderProps {
  dayCount: number;
  isRecoveryMode: boolean;
  streak?: number;
  userName?: string;
  integrity?: number;
  operatingMode?: 'CARETAKER' | 'OBSERVER';
  onSettingsClick?: () => void;
}

const SystemHeader = ({ dayCount, isRecoveryMode, streak = 0, userName = "", operatingMode = 'CARETAKER', onSettingsClick }: SystemHeaderProps) => {
  const [showStats, setShowStats] = useState(false);

  // Status Halo Color Logic
  const getHaloColor = () => {
    if (isRecoveryMode) return "ring-destructive shadow-[0_0_20px_theme(colors.destructive.DEFAULT)]";
    if (operatingMode === 'OBSERVER') return "ring-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.5)]";
    return "ring-primary shadow-[0_0_20px_theme(colors.primary.DEFAULT)]";
  };

  return (
    <header className="flex flex-col gap-6 mb-8 animate-fade-in">
      {/* Top Row: Brand & Halo */}
      <div className="flex items-center justify-between">

        {/* Brand Identity */}
        <div className="flex flex-col">
          <h1 className="text-2xl font-display font-medium tracking-tight text-white/90">
            CareTaker
          </h1>
          <p className="text-sm text-muted-foreground font-sans">
            {userName ? `Hi, ${userName}` : "Personal Wellness Pod"}
          </p>
        </div>

        {/* Interactive Halo Avatar */}
        <button
          onClick={() => setShowStats(!showStats)}
          className="relative group transition-all duration-500 ease-out"
        >
          <div className={`w-12 h-12 rounded-full border-2 border-transparent ${getHaloColor()} transition-all duration-500 flex items-center justify-center bg-black/20 backdrop-blur-md overflow-hidden relative z-10`}>
            <span className="text-xl">
              {isRecoveryMode ? "🌿" : "✨"}
            </span>
          </div>
          {/* Breathing Ripple Effect */}
          <div className={`absolute inset-0 rounded-full ${getHaloColor()} opacity-20 animate-breathe -z-0`} />
        </button>

        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="absolute top-6 right-20 text-muted-foreground/50 hover:text-white transition-colors"
          >
            <span className="sr-only">Settings</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </button>
        )}
      </div>

      {/* Expanded Stats (Progressive Disclosure) */}
      <div className={`grid grid-cols-2 gap-3 transition-all duration-500 ease-spring ${showStats ? 'h-auto opacity-100 scale-100' : 'h-0 opacity-0 scale-95 overflow-hidden'}`}>
        <div className="glass px-4 py-3 rounded-2xl flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Journey</span>
          <span className="font-display font-medium text-lg">Day {dayCount}</span>
        </div>
        <div className="glass px-4 py-3 rounded-2xl flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Balance</span>
          <span className="font-display font-medium text-lg text-gradient-teal">{streak} days</span>
        </div>
      </div>

      {/* Wellness Context Alert (Replacing "Alerts") */}
      {isRecoveryMode && (
        <div className="glass border-destructive/30 bg-destructive/10 px-4 py-3 rounded-2xl flex items-center gap-3 animate-float">
          <span className="text-xl">🌿</span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-destructive-foreground">Deep Rest Needed</span>
            <span className="text-xs text-muted-foreground">Focus on recovery today. No pressure.</span>
          </div>
        </div>
      )}
    </header>
  );
};

export default SystemHeader;
