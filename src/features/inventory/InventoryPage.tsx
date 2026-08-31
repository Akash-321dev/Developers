import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils";
import { toast } from "sonner";
import { Package, AlertTriangle, Plus, History, Truck } from "lucide-react";

export function InventoryPage() {
  const { restaurantId, currentUser } = useOutletContext<{ restaurantId: string; currentUser: any }>();
  const [tab, setTab] = useState("stock");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);

  const inventory = useQuery(api.inventory.getInventory, { restaurantId });
  const lowStock = useQuery(api.inventory.getLowStockItems, { restaurantId });
  const history = useQuery(api.inventory.getInventoryHistory, { restaurantId });
  const suppliers = useQuery(api.inventory.getSuppliers, { restaurantId });
  const products = useQuery(api.products.getProducts, { restaurantId });
  const adjustInventory = useMutation(api.inventory.adjustInventory);
  const createSupplier = useMutation(api.inventory.createSupplier);

  const [adjustForm, setAdjustForm] = useState({ productId: "", type: "STOCK_IN" as const, quantity: 0, reason: "" });
  const [supplierForm, setSupplierForm] = useState({ name: "", contactPerson: "", phone: "", email: "" });

  const handleAdjust = async () => {
    if (!adjustForm.productId || adjustForm.quantity <= 0) { toast.error("Select product and valid quantity"); return; }
    try {
      await adjustInventory({ restaurantId, userId: currentUser._id, ...adjustForm });
      toast.success("Inventory adjusted");
      setAdjustOpen(false);
      setAdjustForm({ productId: "", type: "STOCK_IN", quantity: 0, reason: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddSupplier = async () => {
    if (!supplierForm.name) { toast.error("Name required"); return; }
    try {
      await createSupplier({ restaurantId, ...supplierForm });
      toast.success("Supplier added");
      setSupplierOpen(false);
      setSupplierForm({ name: "", contactPerson: "", phone: "", email: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  const totalValue = inventory?.reduce((sum, i) => sum + (i.currentStock * i.purchaseCost), 0) || 0;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Package className="h-5 w-5" /> Inventory Management</h2>
        <div className="flex gap-2">
          <Button onClick={() => setAdjustOpen(true)}><Plus className="h-4 w-4 mr-1" /> Adjust Stock</Button>
          <Button variant="outline" onClick={() => setSupplierOpen(true)}><Truck className="h-4 w-4 mr-1" /> Suppliers</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Items</p><p className="text-xl font-bold">{inventory?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Stock Value</p><p className="text-xl font-bold">{formatCurrency(totalValue)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Low Stock</p><p className="text-xl font-bold text-red-600">{lowStock?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Suppliers</p><p className="text-xl font-bold">{suppliers?.length || 0}</p></CardContent></Card>
      </div>

      {lowStock && lowStock.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="p-3"><CardTitle className="text-sm text-red-800 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Low Stock Alert</CardTitle></CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex flex-wrap gap-2">
              {lowStock.map((item) => (
                <Badge key={item._id} variant="destructive">{item.product?.name}: {item.currentStock} {item.unit}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>
        <TabsContent value="stock">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Min Stock</TableHead>
                    <TableHead>Max Stock</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory?.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">{item.product?.name || "Unknown"}</TableCell>
                      <TableCell>{item.currentStock}</TableCell>
                      <TableCell>{item.minStock}</TableCell>
                      <TableCell>{item.maxStock}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{formatCurrency(item.currentStock * item.purchaseCost)}</TableCell>
                      <TableCell>
                        <Badge variant={item.currentStock <= item.minStock ? "destructive" : item.currentStock > item.maxStock * 0.8 ? "default" : "secondary"}>
                          {item.currentStock <= item.minStock ? "Low" : "OK"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Previous</TableHead>
                    <TableHead>New Stock</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history?.slice(0, 50).map((t) => (
                    <TableRow key={t._id}>
                      <TableCell className="text-xs">{formatDateTime(t.createdAt)}</TableCell>
                      <TableCell>{t.product?.name}</TableCell>
                      <TableCell><Badge className={getStatusColor(t.type)}>{t.type}</Badge></TableCell>
                      <TableCell>{t.quantity}</TableCell>
                      <TableCell>{t.previousStock}</TableCell>
                      <TableCell>{t.newStock}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.reason || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Adjust Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Adjust Inventory</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={adjustForm.productId} onValueChange={(v) => setAdjustForm({ ...adjustForm, productId: v })}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products?.filter((p) => p.trackStock && p.isActive).map((p) => (
                    <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={adjustForm.type} onValueChange={(v: any) => setAdjustForm({ ...adjustForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STOCK_IN">Stock In</SelectItem>
                  <SelectItem value="STOCK_OUT">Stock Out</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Quantity *</Label><Input type="number" value={adjustForm.quantity || ""} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Reason</Label><Textarea value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} placeholder="Optional reason" /></div>
            <Button onClick={handleAdjust} className="w-full">Apply Adjustment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier Dialog */}
      <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Contact Person</Label><Input value={supplierForm.contactPerson} onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
            <Button onClick={handleAddSupplier} className="w-full">Add Supplier</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
