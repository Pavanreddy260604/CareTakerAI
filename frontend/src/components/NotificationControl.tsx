import { useNotifications } from "@/hooks/use-notifications";

const NotificationControl = () => {
  const { supported, permission, requestPermission } = useNotifications();

  if (!supported) {
    return (
      <div className="border border-border/30 p-4 mb-6">
        <p className="text-xs text-muted-foreground font-mono">
          NOTIFICATIONS UNAVAILABLE
        </p>
      </div>
    );
  }

  if (permission === "granted") {
    return (
      <div className="border border-status-ok/30 p-4 mb-6">
        <p className="text-xs text-status-ok font-mono">
          NOTIFICATIONS ENABLED
        </p>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="border border-status-alert/30 p-4 mb-6">
        <p className="text-xs text-status-alert font-mono">
          NOTIFICATIONS BLOCKED
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border/50 p-4 mb-6">
      <p className="text-xs text-muted-foreground font-mono mb-3">
        ENABLE SYSTEM NOTIFICATIONS
      </p>
      <button onClick={requestPermission} className="system-button w-full text-sm">
        AUTHORIZE
      </button>
    </div>
  );
};

export default NotificationControl;
