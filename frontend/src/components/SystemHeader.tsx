

import { Flame, Leaf, Settings } from 'lucide-react';


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
          <h1 className="text-2xl font-display font-medium tracking-tight text-foreground/90">
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
            <Flame className="w-4 h-4 text-primary" />
            <span className="font-display font-medium text-sm text-primary">{streak}</span>
          </div>
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="w-10 h-10 rounded-xl glass border border-border/20 hover:border-primary/50 hover:bg-primary/10 flex items-center justify-center transition-all"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* Wellness Context Alert */}
      {isRecoveryMode && (
        <div className="glass border-destructive/30 bg-destructive/10 px-4 py-3 rounded-2xl flex items-center gap-3 animate-float">
          <Leaf className="w-5 h-5 text-destructive" />
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
