interface SystemHeaderProps {
  dayCount: number;
  isRecoveryMode: boolean;
  streak?: number;
  userName?: string;
  integrity?: number;
  onSettingsClick?: () => void;
}

const SystemHeader = ({ dayCount, isRecoveryMode, streak = 0, userName = "", integrity, onSettingsClick }: SystemHeaderProps) => {
  return (
    <header className="border-b border-border pb-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="system-indicator system-indicator-active" />
          <h1 className="text-xl font-medium tracking-tight">
            CARETAKER AI
          </h1>
        </div>
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full transition-colors"
            title="System Configuration"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-1">
        {userName && (
          <p className="text-primary text-sm font-medium">
            Welcome, {userName}
          </p>
        )}
        <p className="text-muted-foreground text-sm">
          System monitoring active.
        </p>
        <div className="flex gap-4 text-sm">
          <p className="text-muted-foreground">
            Day <span className="text-foreground font-medium">{dayCount}</span>
          </p>
          {streak > 0 && (
            <p className="text-muted-foreground">
              Continuity <span className="text-foreground font-mono">{streak}d</span>
            </p>
          )}
        </div>
        {isRecoveryMode && (
          <p className="text-destructive text-sm mt-2">
            RECOVERY MODE ACTIVE
          </p>
        )}
      </div>
    </header>
  );
};

export default SystemHeader;
