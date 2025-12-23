import { useEffect, useState } from "react";

interface PresenceNotificationProps {
  show: boolean;
  onDismiss: () => void;
}

const PresenceNotification = ({ show, onDismiss }: PresenceNotificationProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed top-6 left-6 right-6 z-50">
      <div className="system-card system-glow border-primary/30 text-center">
        <p className="text-primary text-sm">Presence recorded.</p>
      </div>
    </div>
  );
};

export default PresenceNotification;
