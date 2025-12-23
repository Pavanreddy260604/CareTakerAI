interface Signal {
  id: string;
  label: string;
}

interface LogStatusPanelProps {
  onSelectSignal: (signalId: string) => void;
}

const signals: Signal[] = [
  { id: "water", label: "Water Intake" },
  { id: "food", label: "Food Intake" },
  { id: "exercise", label: "Exercise Duration" },
  { id: "sleep", label: "Sleep Hours" },
  { id: "mental", label: "Mental Load" },
];

const LogStatusPanel = ({ onSelectSignal }: LogStatusPanelProps) => {
  return (
    <section className="system-card mb-6">
      <p className="system-text text-muted-foreground mb-4">LOG STATUS</p>
      
      <div className="grid grid-cols-2 gap-3">
        {signals.map((signal) => (
          <button
            key={signal.id}
            onClick={() => onSelectSignal(signal.id)}
            className="system-button text-left"
          >
            {signal.label}
          </button>
        ))}
      </div>
    </section>
  );
};

export default LogStatusPanel;
