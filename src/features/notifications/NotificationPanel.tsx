import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { Bell, Check, CheckCheck, X } from "lucide-react";

interface NotificationPanelProps {
  restaurantId: string;
  userId: string;
  onClose: () => void;
}

const NOTIF_ICONS: Record<string, string> = {
  LOW_STOCK: "📦",
  PENDING_KOT: "🍳",
  LARGE_DISCOUNT: "💰",
  REFUND: "↩️",
  NEW_ORDER: "🛒",
  SYSTEM_ALERT: "⚙️",
  ORDER_READY: "✅",
  RESERVATION: "📅",
};

export function NotificationPanel({ restaurantId, userId, onClose }: NotificationPanelProps) {
  const notifications = useQuery(api.notifications.getNotifications, { restaurantId, userId });
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  return (
    <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border bg-background shadow-xl">
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Bell className="h-4 w-4" /> Notifications
        </h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => markAllAsRead({ restaurantId, userId })}
          >
            <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {!notifications || notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
            <Bell className="h-8 w-8 mb-2 opacity-20" />
            No notifications
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif._id}
              className={`flex items-start gap-3 p-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 ${
                !notif.isRead ? "bg-primary/5" : ""
              }`}
              onClick={() => {
                if (!notif.isRead) {
                  markAsRead({ notificationId: notif._id });
                }
              }}
            >
              <span className="text-lg shrink-0">{NOTIF_ICONS[notif.type] || "🔔"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{notif.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDateTime(notif.createdAt)}
                </p>
              </div>
              {!notif.isRead && (
                <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
