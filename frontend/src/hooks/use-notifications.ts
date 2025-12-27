import { useCallback, useEffect, useState, useRef } from "react";

type NotificationPermission = "default" | "granted" | "denied";

interface NotificationOptions {
  title: string;
  body: string;
  tag?: string;
  requireInteraction?: boolean;
  icon?: string;
}

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);
  const lastNotificationRef = useRef<{ tag: string; time: number } | null>(null);

  useEffect(() => {
    if ("Notification" in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) return false;

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  }, [supported]);

  const sendNotification = useCallback(
    (options: NotificationOptions) => {
      if (!supported || permission !== "granted") return null;

      // Debounce: prevent same tag within 30 seconds
      const now = Date.now();
      if (
        lastNotificationRef.current &&
        lastNotificationRef.current.tag === options.tag &&
        now - lastNotificationRef.current.time < 30000
      ) {
        return null;
      }

      lastNotificationRef.current = { tag: options.tag || "default", time: now };

      const notification = new Notification(options.title, {
        body: options.body,
        tag: options.tag,
        requireInteraction: options.requireInteraction ?? false,
        icon: options.icon || "/favicon.ico",
      });

      // Auto-close non-interactive after 5 seconds
      if (!options.requireInteraction) {
        setTimeout(() => notification.close(), 5000);
      }

      return notification;
    },
    [supported, permission]
  );

  // Critical capacity alert
  const notifyCriticalCapacity = useCallback(
    (capacity: number) => {
      return sendNotification({
        title: "⚠️ CRITICAL CAPACITY",
        body: `Your cognitive capacity is at ${capacity}%. Rest required immediately.`,
        tag: "critical-capacity",
        requireInteraction: true,
      });
    },
    [sendNotification]
  );

  // Low capacity warning
  const notifyLowCapacity = useCallback(
    (capacity: number) => {
      return sendNotification({
        title: "⚡ Low Capacity Warning",
        body: `Capacity at ${capacity}%. Consider taking a break.`,
        tag: "low-capacity",
      });
    },
    [sendNotification]
  );

  // Recovery mode notification
  const notifyRecoveryMode = useCallback(() => {
    return sendNotification({
      title: "🛡️ RECOVERY MODE ACTIVE",
      body: "Load exceeded. Recovery protocols engaged. Rest is mandatory.",
      tag: "recovery-mode",
      requireInteraction: true,
    });
  }, [sendNotification]);

  // Check-in reminder
  const notifyCheckInReminder = useCallback(() => {
    return sendNotification({
      title: "📋 Daily Check-in Reminder",
      body: "You haven't checked in today. Log your status to track your health.",
      tag: "checkin-reminder",
    });
  }, [sendNotification]);

  // Status update notification
  const notifyStatusUpdate = useCallback(
    (status: string, message: string) => {
      return sendNotification({
        title: `Status: ${status}`,
        body: message,
        tag: `status-${status.toLowerCase()}`,
      });
    },
    [sendNotification]
  );

  // Survival mode warning
  const notifySurvivalMode = useCallback(() => {
    return sendNotification({
      title: "🚨 SURVIVAL MODE",
      body: "CRITICAL: Biological debt exceeds safety limits. Immediate action required.",
      tag: "survival-mode",
      requireInteraction: true,
    });
  }, [sendNotification]);

  return {
    supported,
    permission,
    requestPermission,
    sendNotification,
    notifyCriticalCapacity,
    notifyLowCapacity,
    notifyRecoveryMode,
    notifyCheckInReminder,
    notifyStatusUpdate,
    notifySurvivalMode,
  };
};
