/* Hook that requests browser push-notification permission once. */

import { useEffect, useState } from "react";

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().then(setPermission);
    }
  }, []);

  return permission;
}
