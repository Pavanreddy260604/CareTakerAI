import { useCallback, useEffect, useState } from "react";

type NotificationPermission = "default" | "granted" | "denied";

interface NotificationOptions {
  title: string;
  body: string;
  tag?: string;
  requireInteraction?: boolean;
}

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);

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

      const notification = new Notification(options.title, {
        body: options.body,
        tag: options.tag,
        requireInteraction: options.requireInteraction ?? false,
        icon: "/favicon.ico",
      });

      return notification;
    },
    [supported, permission]
  );

  const notifyPendingAction = useCallback(
    (action: string) => {
      return sendNotification({
        title: "CARETAKER AI",
        body: `Action required: ${action}`,
        tag: "pending-action",
        requireInteraction: true,
      });
    },
    [sendNotification]
  );

  const notifyStatusAlert = useCallback(
    (label: string, status: string) => {
      return sendNotification({
        title: "CARETAKER AI",
        body: `${label}: ${status}`,
        tag: `status-${label.toLowerCase()}`,
      });
    },
    [sendNotification]
  );

  const notifyRecoveryMode = useCallback(() => {
    return sendNotification({
      title: "CARETAKER AI",
      body: "Load exceeded. Recovery enforced.",
      tag: "recovery-mode",
      requireInteraction: true,
    });
  }, [sendNotification]);

  return {
    supported,
    permission,
    requestPermission,
    sendNotification,
    notifyPendingAction,
    notifyStatusAlert,
    notifyRecoveryMode,
  };
};
