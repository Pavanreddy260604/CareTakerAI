import { useNotifications } from "@/hooks/use-notifications";

const NotificationControl = () => {
  const { supported, permission, requestPermission } = useNotifications();

  if (!supported) {
    return (
      <div className="border border-muted/30 bg-muted/5 p-4 mb-5 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-xl">🔕</span>
          <p className="text-xs text-muted-foreground font-mono">
            NOTIFICATIONS UNAVAILABLE
          </p>
        </div>
      </div>
    );
  }

  if (permission === "granted") {
    return (
      <div className="border border-primary/30 bg-primary/5 p-4 mb-5 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-xl">🔔</span>
          <div>
            <p className="text-xs text-primary font-mono font-bold">
              NOTIFICATIONS ENABLED
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              You'll receive recovery alerts
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="border border-destructive/30 bg-destructive/5 p-4 mb-5 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-xl">🚫</span>
          <div>
            <p className="text-xs text-destructive font-mono font-bold">
              NOTIFICATIONS BLOCKED
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Enable in browser settings
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-muted/50 bg-black/20 p-4 mb-5 rounded-xl">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xl">🔔</span>
        <p className="text-xs text-muted-foreground font-mono">
          ENABLE SYSTEM NOTIFICATIONS
        </p>
      </div>
      <button
        onClick={requestPermission}
        className="system-button w-full text-xs"
      >
        AUTHORIZE NOTIFICATIONS
      </button>
    </div>
  );
};

export default NotificationControl;
