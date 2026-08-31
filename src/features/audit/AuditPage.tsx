import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime, getStatusColor, getInitials } from "@/lib/utils";
import { Shield, Filter } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  CREATE_ORDER: "bg-blue-100 text-blue-800",
  CREATE_BILL: "bg-green-100 text-green-800",
  REFUND: "bg-red-100 text-red-800",
  STOCK_ADJUSTMENT: "bg-yellow-100 text-yellow-800",
  CREATE_EXPENSE: "bg-orange-100 text-orange-800",
  UPDATE_ORDER: "bg-indigo-100 text-indigo-800",
  CREATE_PRODUCT: "bg-purple-100 text-purple-800",
  UPDATE_PRODUCT: "bg-purple-100 text-purple-800",
  DELETE_PRODUCT: "bg-red-100 text-red-800",
};

export function AuditPage() {
  const { restaurantId } = useOutletContext<{ restaurantId: string }>();
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const logs = useQuery(api.audit.getAuditLogs, {
    restaurantId,
    entity: entityFilter === "ALL" ? undefined : entityFilter,
    startDate: new Date(startDate).getTime(),
    endDate: new Date(endDate + "T23:59:59").getTime(),
  });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="h-5 w-5" /> Audit Log
      </h2>

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
          <Label className="text-xs">Entity</Label>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Entities</SelectItem>
              <SelectItem value="ORDER">Orders</SelectItem>
              <SelectItem value="BILL">Bills</SelectItem>
              <SelectItem value="REFUND">Refunds</SelectItem>
              <SelectItem value="PRODUCT">Products</SelectItem>
              <SelectItem value="INVENTORY">Inventory</SelectItem>
              <SelectItem value="EXPENSE">Expenses</SelectItem>
              <SelectItem value="USER">Users</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Logs</p><p className="text-xl font-bold">{logs?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Orders</p><p className="text-xl font-bold">{logs?.filter((l) => l.entity === "ORDER").length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Bills</p><p className="text-xl font-bold">{logs?.filter((l) => l.entity === "BILL").length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Refunds</p><p className="text-xl font-bold text-red-600">{logs?.filter((l) => l.entity === "REFUND").length || 0}</p></CardContent></Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map((log) => {
                let metadata: any = {};
                try { metadata = log.metadata ? JSON.parse(log.metadata) : {}; } catch {}
                return (
                  <TableRow key={log._id}>
                    <TableCell className="text-xs whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                          {log.user ? getInitials(log.user.name) : "?"}
                        </div>
                        <span className="text-sm">{log.user?.name || "System"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800"}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.entity}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {metadata.orderNumber || metadata.billNumber || metadata.refundNumber || log.entityId || "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!logs || logs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit logs found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
