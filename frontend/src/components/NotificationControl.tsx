import { useNotifications } from "@/hooks/use-notifications";
import { Bell, BellOff, AlertTriangle, AlertCircle, Info } from "lucide-react";

const NotificationControl = () => {
  const { supported, permission, requestPermission } = useNotifications();

  // If notifications are not supported
  if (!supported) {
    return (
      <div className="border-2 border-destructive bg-destructive/10 p-4 mb-5 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center shrink-0">
            <BellOff className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-destructive font-mono font-bold">
              NOTIFICATIONS REQUIRED
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your browser doesn't support notifications. Please use Chrome, Firefox, or Safari for full functionality.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Notifications are granted - show toggle style
  if (permission === 'granted') {
    return (
      <div className="border border-primary/20 bg-primary/5 p-4 mb-5 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-primary font-mono font-bold">
              ALERTS ACTIVE
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Receiving critical updates
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary">ON</span>
          <div className="w-10 h-6 bg-primary rounded-full relative cursor-default opacity-100">
            <div className="absolute right-1 top-1 w-4 h-4 bg-primary-foreground rounded-full shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  // Notifications are blocked - show critical warning
  if (permission === "denied") {
    return (
      <div className="border-2 border-destructive bg-destructive/10 p-4 mb-5 rounded-xl animate-pulse">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-destructive font-mono font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> NOTIFICATIONS BLOCKED
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Notifications are <strong>required</strong> for critical health alerts. You must enable them to use this app properly.
            </p>
            <div className="bg-card/50 rounded-lg p-3 text-xs text-muted-foreground border border-border">
              <p className="font-bold text-foreground mb-2">To enable notifications:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the lock/info icon in your browser's address bar</li>
                <li>Find "Notifications" in the permissions</li>
                <li>Change from "Block" to "Allow"</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Notifications permission not yet requested - show mandatory prompt
  return (
    <div className="border-2 border-yellow-500 bg-yellow-500/10 p-4 mb-5 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
          <Info className="w-5 h-5 text-yellow-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-yellow-500 font-mono font-bold">
            NOTIFICATIONS REQUIRED
          </p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            This app requires notifications to alert you about critical health conditions. You <strong>must</strong> enable notifications to continue.
          </p>
          <button
            onClick={requestPermission}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-4 rounded-xl text-sm transition-all active:scale-[0.98]"
          >
            ENABLE NOTIFICATIONS NOW
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationControl;
