

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

  return (
    <header className="flex flex-col gap-4 mb-8 animate-fade-in">
      {/* Top Row: Brand & Stats */}
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

        {/* Quick Stats - Always Visible */}
        <div className="flex items-center gap-3">
          <div className="glass px-3 py-1.5 rounded-xl flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Day</span>
            <span className="font-display font-medium text-sm">{dayCount}</span>
          </div>
          <div className="glass px-3 py-1.5 rounded-xl flex items-center gap-2">
            <span className="text-xs">🔥</span>
            <span className="font-display font-medium text-sm text-primary">{streak}</span>
          </div>
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="w-10 h-10 rounded-xl glass border border-white/20 hover:border-primary/50 hover:bg-primary/10 flex items-center justify-center transition-all"
              title="Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/70 hover:text-primary">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Wellness Context Alert */}
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
