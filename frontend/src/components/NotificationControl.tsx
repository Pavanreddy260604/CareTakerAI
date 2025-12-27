import { useNotifications } from "@/hooks/use-notifications";

const NotificationControl = () => {
  const { supported, permission, requestPermission } = useNotifications();

  // If notifications are not supported
  if (!supported) {
    return (
      <div className="border-2 border-destructive bg-destructive/10 p-4 mb-5 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
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

  // Notifications are granted - show success
  if (permission === "granted") {
    return (
      <div className="border border-primary/30 bg-primary/5 p-4 mb-5 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-primary font-mono font-bold">
              NOTIFICATIONS ACTIVE
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You'll receive critical health alerts
            </p>
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
            <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm text-destructive font-mono font-bold">
              ⚠ NOTIFICATIONS BLOCKED
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Notifications are <strong>required</strong> for critical health alerts. You must enable them to use this app properly.
            </p>
            <div className="bg-black/30 rounded-lg p-3 text-xs text-muted-foreground">
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
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
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
