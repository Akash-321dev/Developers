import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils";
import { toast } from "sonner";
import { Receipt, Search, RotateCcw, Filter } from "lucide-react";

export function SalesPage() {
  const { restaurantId, userRole, currentUser } = useOutletContext<{ restaurantId: string; userRole: string; currentUser: any }>();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundForm, setRefundForm] = useState({ type: "FULL" as "FULL" | "PARTIAL", amount: 0, reason: "" });

  const bills = useQuery(api.billing.getBills, {
    restaurantId,
    startDate: new Date(startDate).getTime(),
    endDate: new Date(endDate + "T23:59:59").getTime(),
  });
  const billDetails = useQuery(
    api.billing.getBillWithDetails,
    selectedBill ? { billId: selectedBill } : "skip"
  );
  const processRefund = useMutation(api.billing.processRefund);

  const filteredBills = bills?.filter((b) => {
    if (paymentFilter !== "ALL" && b.status !== paymentFilter) return false;
    return true;
  }) || [];

  const totalRevenue = filteredBills.filter((b) => b.status === "PAID").reduce((s, b) => s + b.totalAmount, 0);
  const totalRefunded = filteredBills.filter((b) => b.status === "REFUNDED").reduce((s, b) => s + b.totalAmount, 0);

  const handleRefund = async () => {
    if (!refundForm.reason) { toast.error("Refund reason required"); return; }
    if (!billDetails) return;
    try {
      await processRefund({
        orderId: billDetails.orderId,
        billId: billDetails._id,
        userId: currentUser._id,
        type: refundForm.type,
        amount: refundForm.type === "FULL" ? billDetails.totalAmount : refundForm.amount,
        reason: refundForm.reason,
      });
      toast.success("Refund processed");
      setRefundOpen(false);
      setSelectedBill(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Receipt className="h-5 w-5" /> Sales & Transactions
        </h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="PARTIALLY_PAID">Partial</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Bills</p><p className="text-xl font-bold">{filteredBills.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Refunded</p><p className="text-xl font-bold text-red-600">{formatCurrency(totalRefunded)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Avg Bill</p><p className="text-xl font-bold">{formatCurrency(filteredBills.length > 0 ? totalRevenue / filteredBills.length : 0)}</p></CardContent></Card>
      </div>

      {/* Bills Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.map((bill) => (
                <TableRow key={bill._id}>
                  <TableCell className="font-medium text-sm">{bill.billNumber}</TableCell>
                  <TableCell className="text-xs">{formatDateTime(bill.createdAt)}</TableCell>
                  <TableCell>{formatCurrency(bill.totalAmount)}</TableCell>
                  <TableCell>{formatCurrency(bill.paidAmount)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(bill.status)}>{bill.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedBill(bill._id)}>
                      View
                    </Button>
                    {bill.status === "PAID" && (userRole === "RESTAURANT_OWNER" || userRole === "MANAGER") && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => {
                        setSelectedBill(bill._id);
                        setRefundOpen(true);
                      }}>
                        Refund
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredBills.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No bills found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bill Detail Dialog */}
      <Dialog open={!!selectedBill && !refundOpen} onOpenChange={() => setSelectedBill(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Bill Details</DialogTitle></DialogHeader>
          {billDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Bill #</p><p className="font-medium">{billDetails.billNumber}</p></div>
                <div><p className="text-muted-foreground">Status</p><Badge className={getStatusColor(billDetails.status)}>{billDetails.status}</Badge></div>
                <div><p className="text-muted-foreground">Date</p><p className="font-medium">{formatDateTime(billDetails.createdAt)}</p></div>
                <div><p className="text-muted-foreground">Payment</p><p className="font-medium">{billDetails.payments?.[0]?.method || "N/A"}</p></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {billDetails.items?.map((item: any) => (
                    <TableRow key={item._id}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right space-y-1 text-sm">
                <div>Subtotal: {formatCurrency(billDetails.subtotal)}</div>
                <div>Tax: {formatCurrency(billDetails.taxAmount)}</div>
                <div>Discount: -{formatCurrency(billDetails.discountAmount)}</div>
                <div className="font-bold text-lg">Total: {formatCurrency(billDetails.totalAmount)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Process Refund</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Refund Type</Label>
              <Select value={refundForm.type} onValueChange={(v: "FULL" | "PARTIAL") => setRefundForm({ ...refundForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL">Full Refund</SelectItem>
                  <SelectItem value="PARTIAL">Partial Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {refundForm.type === "PARTIAL" && (
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input type="number" value={refundForm.amount || ""} onChange={(e) => setRefundForm({ ...refundForm, amount: Number(e.target.value) })} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Input value={refundForm.reason} onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })} placeholder="Reason for refund" />
            </div>
            <Button onClick={handleRefund} variant="destructive" className="w-full">Process Refund</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
