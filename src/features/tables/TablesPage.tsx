import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, cn, getElapsedMinutes } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Users, Clock, ArrowRightLeft } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-100 border-green-300 text-green-800",
  OCCUPIED: "bg-red-100 border-red-300 text-red-800",
  RESERVED: "bg-yellow-100 border-yellow-300 text-yellow-800",
  CLEANING: "bg-blue-100 border-blue-300 text-blue-800",
};

export function TablesPage() {
  const { restaurantId } = useOutletContext<{ restaurantId: string }>();
  const navigate = useNavigate();
  const tables = useQuery(api.tables.getTablesWithStatus, { restaurantId });
  const updateTable = useMutation(api.tables.updateTable);
  const createTable = useMutation(api.tables.createTable);

  const [newTableOpen, setNewTableOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [tableName, setTableName] = useState("");
  const [tableCapacity, setTableCapacity] = useState(4);
  const [transferFrom, setTransferFrom] = useState<string | null>(null);

  const handleMarkAvailable = async (tableId: string) => {
    try {
      await updateTable({ tableId, status: "AVAILABLE", currentOrderId: undefined });
      toast.success("Table marked as available");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCreateTable = async () => {
    if (!tableNumber.trim()) { toast.error("Table number required"); return; }
    try {
      await createTable({ restaurantId, number: tableNumber, name: tableName || undefined, capacity: tableCapacity });
      toast.success("Table created");
      setNewTableOpen(false);
      setTableNumber("");
      setTableName("");
      setTableCapacity(4);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const stats = tables ? {
    total: tables.length,
    available: tables.filter((t) => t.status === "AVAILABLE").length,
    occupied: tables.filter((t) => t.status === "OCCUPIED").length,
    reserved: tables.filter((t) => t.status === "RESERVED").length,
    cleaning: tables.filter((t) => t.status === "CLEANING").length,
  } : null;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Table Management</h2>
        <Button onClick={() => setNewTableOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Table
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-green-500" /> {stats.available} Available</div>
          <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-red-500" /> {stats.occupied} Occupied</div>
          <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-yellow-500" /> {stats.reserved} Reserved</div>
          <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-blue-500" /> {stats.cleaning} Cleaning</div>
        </div>
      )}

      {/* Table Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {tables?.filter((t) => t.isActive).map((table) => (
          <Card
            key={table._id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              STATUS_COLORS[table.status]
            )}
            onClick={() => {
              if (table.status === "AVAILABLE") {
                navigate("/pos");
              }
            }}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{table.number}</p>
              {table.name && <p className="text-xs opacity-75">{table.name}</p>}
              <div className="flex items-center justify-center gap-1 mt-2 text-xs">
                <Users className="h-3 w-3" />
                {table.capacity}
              </div>
              <Badge className={cn("mt-2 text-xs", STATUS_COLORS[table.status])}>
                {table.status}
              </Badge>
              {table.status === "OCCUPIED" && table.currentOrder && (
                <div className="mt-2 text-xs">
                  <p className="font-medium">{formatCurrency(table.currentOrder.totalAmount)}</p>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {getElapsedMinutes(table.currentOrder.createdAt)}m
                  </div>
                </div>
              )}
              {table.status === "CLEANING" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-6 text-xs"
                  onClick={(e) => { e.stopPropagation(); handleMarkAvailable(table._id); }}
                >
                  Mark Ready
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* New Table Dialog */}
      <Dialog open={newTableOpen} onOpenChange={setNewTableOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Table Number *</Label>
              <Input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="1" />
            </div>
            <div className="space-y-2">
              <Label>Name (optional)</Label>
              <Input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="VIP 1" />
            </div>
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input type="number" value={tableCapacity} onChange={(e) => setTableCapacity(Number(e.target.value))} />
            </div>
            <Button onClick={handleCreateTable} className="w-full">Create Table</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
