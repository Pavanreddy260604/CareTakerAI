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
    <header className="flex-1 min-w-0">
      {/* Title Row */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`system-indicator ${operatingMode === 'CARETAKER' ? 'system-indicator-active' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'} shrink-0`} />
        <div className="flex flex-col">
          <h1 className="text-lg sm:text-xl font-medium tracking-tight truncate leading-none">
            CARETAKER AI
          </h1>
          <span className="text-[10px] sm:text-xs font-mono text-muted-foreground tracking-widest opacity-70">
            MODE: {operatingMode}
          </span>
        </div>
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors shrink-0 ml-auto"
            title="System Configuration"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        )}
      </div>

      {/* User greeting and status */}
      <div className="space-y-2">
        {userName && (
          <p className="text-primary text-sm font-medium truncate">
            Welcome, {userName}
          </p>
        )}
        <p className="text-muted-foreground text-xs sm:text-sm">
          {operatingMode === 'CARETAKER' ? 'System monitoring & guidance active.' : 'Passive observation mode.'}
        </p>

        {/* Stats Row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm">
          <p className="text-muted-foreground">
            Day <span className="text-foreground font-medium">{dayCount}</span>
          </p>
          {streak > 0 && (
            <p className="text-muted-foreground flex items-center gap-1">
              <span className="text-yellow-500">🔥</span>
              <span className="text-foreground font-mono">{streak}d</span>
              <span className="hidden sm:inline">streak</span>
            </p>
          )}
        </div>

        {/* Recovery Mode Alert */}
        {isRecoveryMode && operatingMode === 'CARETAKER' && (
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-destructive/10 border border-destructive/30 rounded-lg">
            <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
            <span className="text-destructive text-xs sm:text-sm font-medium">
              RECOVERY MODE
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default SystemHeader;
