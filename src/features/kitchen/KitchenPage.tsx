import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, getElapsedMinutes, cn } from "@/lib/utils";
import { toast } from "sonner";
import { Clock, ChefHat, CheckCircle, AlertTriangle } from "lucide-react";

export function KitchenPage() {
  const { restaurantId } = useOutletContext<{ restaurantId: string }>();
  const kots = useQuery(api.kot.getKitchenOrders, { restaurantId });
  const updateKotStatus = useMutation(api.kot.updateKotStatus);

  const handleStatusUpdate = async (kotId: string, status: string) => {
    try {
      await updateKotStatus({ kotId: kotId as any, status: status as any });
      toast.success(`KOT status updated to ${status}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const pendingKots = kots?.filter((k) => k.status === "PENDING") || [];
  const preparingKots = kots?.filter((k) => ["ACCEPTED", "PREPARING"].includes(k.status)) || [];
  const readyKots = kots?.filter((k) => k.status === "READY") || [];

  const renderKotColumn = (title: string, items: typeof kots, color: string, actions: (kot: any) => React.ReactNode) => (
    <div className="flex-1 min-w-[300px]">
      <div className={cn("rounded-lg border-t-2 p-3 mb-3", color)}>
        <h3 className="font-semibold text-sm">{title} ({items.length})</h3>
      </div>
      <div className="space-y-3">
        {items.map((kot) => {
          const elapsed = getElapsedMinutes(kot.createdAt);
          const isUrgent = elapsed > 15;
          return (
            <Card key={kot._id} className={cn(isUrgent && "border-red-300 bg-red-50")}>
              <CardHeader className="p-3 pb-1">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{kot.kotNumber}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {kot.tableNumber && <Badge variant="outline" className="text-xs">Table {kot.tableNumber}</Badge>}
                      <Badge variant="secondary" className="text-xs">{kot.orderType}</Badge>
                    </div>
                  </div>
                  <div className={cn("flex items-center gap-1 text-xs", isUrgent ? "text-red-600 font-bold" : "text-muted-foreground")}>
                    {isUrgent && <AlertTriangle className="h-3 w-3" />}
                    <Clock className="h-3 w-3" />
                    {elapsed}m
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-1">
                  {kot.items.map((item: any) => (
                    <div key={item._id} className="flex items-center justify-between text-sm">
                      <span>{item.quantity}x {item.productName}</span>
                      {item.notes && <span className="text-xs text-muted-foreground italic">{item.notes}</span>}
                    </div>
                  ))}
                </div>
                {kot.notes && <p className="mt-2 text-xs text-muted-foreground italic">Note: {kot.notes}</p>}
                <div className="mt-3 flex gap-2">
                  {actions(kot)}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
            No orders
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center gap-3 mb-4">
        <ChefHat className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Kitchen Display System</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {renderKotColumn("⏳ Pending", pendingKots, "border-yellow-400 bg-yellow-50", (kot) => (
          <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(kot._id, "ACCEPTED")}>
            Accept
          </Button>
        ))}
        {renderKotColumn("🔥 Preparing", preparingKots, "border-orange-400 bg-orange-50", (kot) => (
          <>
            {kot.status === "ACCEPTED" && (
              <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(kot._id, "PREPARING")}>
                Start
              </Button>
            )}
            <Button size="sm" onClick={() => handleStatusUpdate(kot._id, "READY")} className="bg-green-600 hover:bg-green-700">
              Ready
            </Button>
          </>
        ))}
        {renderKotColumn("✅ Ready", readyKots, "border-green-400 bg-green-50", (kot) => (
          <Button size="sm" onClick={() => handleStatusUpdate(kot._id, "COMPLETED")} className="bg-blue-600 hover:bg-blue-700">
            <CheckCircle className="h-3 w-3 mr-1" /> Complete
          </Button>
        ))}
      </div>
    </div>
  );
}
