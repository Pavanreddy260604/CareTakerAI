import { useEffect, useState } from "react";
import { Hand, X } from "lucide-react";

interface PresenceNotificationProps {
  show: boolean;
  onDismiss: () => void;
}

const PresenceNotification = ({ show, onDismiss }: PresenceNotificationProps) => {
  const [visible, setVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      setIsLeaving(false);
      const timer = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(() => {
          setVisible(false);
          onDismiss();
        }, 300);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50">
      <div
        className={`system-card system-glow border-primary/30 transition-all duration-300 ${isLeaving ? "opacity-0 translate-y-[-10px]" : "opacity-100 translate-y-0"
          }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <Hand className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-primary text-sm font-mono font-bold">Presence recorded</p>
            <p className="text-[10px] text-muted-foreground">Welcome back</p>
          </div>
          <button
            onClick={() => {
              setIsLeaving(true);
              setTimeout(() => {
                setVisible(false);
                onDismiss();
              }, 300);
            }}
            className="text-muted-foreground hover:text-foreground p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PresenceNotification;
