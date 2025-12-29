import { Shield, AlertTriangle, LogIn, Check } from "lucide-react";

interface RecoveryTask {
  label: string;
  completed: boolean;
}

interface RecoveryModeProps {
  tasks: RecoveryTask[];
  onToggleTask: (index: number) => void;
}

const RecoveryMode = ({ tasks, onToggleTask }: RecoveryModeProps) => {
  const completedCount = tasks.filter(t => t.completed).length;
  const progress = (completedCount / tasks.length) * 100;

  return (
    <section className="system-card border-destructive/50 mb-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-destructive/20 border border-destructive/30 flex items-center justify-center shrink-0">
          <Shield className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <p className="text-sm font-mono font-bold text-destructive">RECOVERY MODE</p>
          <p className="text-[10px] text-muted-foreground">System enforcing protective measures</p>
        </div>
      </div>

      {/* Status message */}
      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-4">
        <p className="text-sm text-foreground font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" /> Load exceeded. Recovery enforced.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground mb-2">
          <span>RECOVERY PROGRESS</span>
          <span>{completedCount}/{tasks.length}</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <button
            key={task.label}
            onClick={() => onToggleTask(index)}
            className={`w-full text-left p-4 border rounded-xl transition-all active:scale-[0.98] ${task.completed
              ? "border-primary/30 bg-primary/5"
              : "border-muted/30 hover:border-muted/50 bg-card/50"
              }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${task.completed
                ? "border-primary bg-primary/20 text-primary"
                : "border-muted/50"
                }`}>
                {task.completed && <Check className="w-3 h-3" />}
              </div>
              <span className={`text-sm flex-1 ${task.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {task.label}
              </span>
              <span className={`text-[10px] font-mono font-bold ${task.completed ? "text-primary" : "text-yellow-500"}`}>
                {task.completed ? "DONE" : "TODO"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default RecoveryMode;
