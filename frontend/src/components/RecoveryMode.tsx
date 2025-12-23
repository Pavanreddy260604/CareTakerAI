interface RecoveryTask {
  label: string;
  completed: boolean;
}

interface RecoveryModeProps {
  tasks: RecoveryTask[];
  onToggleTask: (index: number) => void;
}

const RecoveryMode = ({ tasks, onToggleTask }: RecoveryModeProps) => {
  return (
    <section className="system-card border-destructive/50 mb-6">
      <p className="system-text text-destructive mb-4">RECOVERY MODE</p>
      
      <p className="text-foreground mb-2">Load exceeded.</p>
      <p className="text-foreground mb-6">Recovery enforced.</p>
      
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <button
            key={task.label}
            onClick={() => onToggleTask(index)}
            className={`w-full text-left p-4 border transition-all ${
              task.completed 
                ? "border-primary/30 bg-primary/5" 
                : "border-border hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">{task.label}</span>
              <span className={`system-text ${task.completed ? "status-ok" : "status-pending"}`}>
                {task.completed ? "COMPLETED" : "PENDING"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default RecoveryMode;
