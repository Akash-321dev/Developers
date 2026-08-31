import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils";
import { toast } from "sonner";
import { Eye, CheckCircle, XCircle, Clock } from "lucide-react";

const STATUS_OPTIONS = ["NEW", "CONFIRMED", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"];

export function OrdersPage() {
  const { restaurantId, currentUser } = useOutletContext<{ restaurantId: string; currentUser: any }>();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const orders = useQuery(api.orders.getOrders, {
    restaurantId,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });
  const orderDetails = useQuery(
    api.orders.getOrderWithItems,
    selectedOrder ? { orderId: selectedOrder } : "skip"
  );
  const updateStatus = useMutation(api.orders.updateOrderStatus);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      await updateStatus({ orderId: orderId as any, userId: currentUser._id, status: status as any });
      toast.success(`Order status updated to ${status}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Orders</h2>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Orders</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order) => (
                <TableRow key={order._id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.orderType}</TableCell>
                  <TableCell>{order.tableId ? "Table" : "-"}</TableCell>
                  <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedOrder(order._id)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {order.status === "NEW" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleStatusUpdate(order._id, "CONFIRMED")}>
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {order.status === "CONFIRMED" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-600" onClick={() => handleStatusUpdate(order._id, "PREPARING")}>
                          <Clock className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {["NEW", "CONFIRMED"].includes(order.status) && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleStatusUpdate(order._id, "CANCELLED")}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!orders || orders.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {orderDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Order Number</p>
                  <p className="font-medium">{orderDetails.orderNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(orderDetails.status)}>{orderDetails.status}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{orderDetails.orderType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDateTime(orderDetails.createdAt)}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderDetails.items.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell>{formatCurrency(item.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right space-y-1">
                <div className="text-sm"><span className="text-muted-foreground">Subtotal:</span> {formatCurrency(orderDetails.subtotal)}</div>
                <div className="text-sm"><span className="text-muted-foreground">Tax:</span> {formatCurrency(orderDetails.taxAmount)}</div>
                <div className="text-sm"><span className="text-muted-foreground">Discount:</span> -{formatCurrency(orderDetails.discountAmount)}</div>
                <div className="font-bold text-lg">Total: {formatCurrency(orderDetails.totalAmount)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
