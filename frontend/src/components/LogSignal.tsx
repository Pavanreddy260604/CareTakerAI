import { useState } from "react";

interface SignalOption {
  value: string;
  label: string;
}

interface LogSignalProps {
  signal: string;
  options: SignalOption[];
  onLog: (value: string) => void;
  onBack: () => void;
}

const LogSignal = ({ signal, options, onLog, onBack }: LogSignalProps) => {
  const [selected, setSelected] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selected) {
      onLog(selected);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <button 
        onClick={onBack}
        className="system-button mb-8"
      >
        ← BACK
      </button>
      
      <p className="system-text text-muted-foreground mb-6">{signal}</p>
      
      <div className="space-y-3 mb-8">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelected(option.value)}
            className={`w-full text-left p-6 border transition-all ${
              selected === option.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border/80"
            }`}
          >
            <span className="text-lg">{option.label}</span>
          </button>
        ))}
      </div>
      
      {selected && (
        <button 
          onClick={handleConfirm}
          className="system-button system-button-primary w-full"
        >
          CONFIRM
        </button>
      )}
    </div>
  );
};

export default LogSignal;
