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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { Users, Plus, Phone, Mail, Star } from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  BRONZE: "bg-orange-100 text-orange-800",
  SILVER: "bg-gray-100 text-gray-800",
  GOLD: "bg-yellow-100 text-yellow-800",
  PLATINUM: "bg-purple-100 text-purple-800",
};

export function CustomersPage() {
  const { restaurantId } = useOutletContext<{ restaurantId: string }>();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  const customers = useQuery(api.customers.getCustomers, { restaurantId });
  const customerDetails = useQuery(
    api.customers.getCustomerWithHistory,
    selectedCustomer ? { customerId: selectedCustomer } : "skip"
  );
  const createCustomer = useMutation(api.customers.createCustomer);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });

  const filtered = customers?.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q);
  });

  const handleCreate = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    try {
      await createCustomer({ restaurantId, ...form });
      toast.success("Customer created");
      setCreateOpen(false);
      setForm({ name: "", phone: "", email: "", address: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> Customers</h2>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Customer</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Customers</p><p className="text-xl font-bold">{customers?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-xl font-bold">{formatCurrency(customers?.reduce((s, c) => s + c.totalSpending, 0) || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Avg Spending</p><p className="text-xl font-bold">{formatCurrency(customers && customers.length > 0 ? customers.reduce((s, c) => s + c.totalSpending, 0) / customers.length : 0)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Orders</p><p className="text-xl font-bold">{customers?.reduce((s, c) => s + c.totalOrders, 0) || 0}</p></CardContent></Card>
      </div>
      <Input placeholder="Search by name, phone, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Spending</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Last Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map((c) => (
                <TableRow key={c._id} className="cursor-pointer" onClick={() => setSelectedCustomer(c._id)}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.phone || "-"}</TableCell>
                  <TableCell>{c.email || "-"}</TableCell>
                  <TableCell>{c.totalOrders}</TableCell>
                  <TableCell>{formatCurrency(c.totalSpending)}</TableCell>
                  <TableCell>{c.loyaltyPoints}</TableCell>
                  <TableCell><Badge className={TIER_COLORS[c.tier]}>{c.tier}</Badge></TableCell>
                  <TableCell className="text-xs">{c.lastOrderAt ? formatDateTime(c.lastOrderAt) : "Never"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Customer Details</DialogTitle></DialogHeader>
          {customerDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Name</p><p className="font-medium">{customerDetails.name}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{customerDetails.phone || "-"}</p></div>
                <div><p className="text-muted-foreground">Email</p><p className="font-medium">{customerDetails.email || "-"}</p></div>
                <div><p className="text-muted-foreground">Total Spending</p><p className="font-bold">{formatCurrency(customerDetails.totalSpending)}</p></div>
                <div><p className="text-muted-foreground">Loyalty Points</p><p className="font-medium">{customerDetails.loyaltyPoints}</p></div>
                <div><p className="text-muted-foreground">Tier</p><Badge className={TIER_COLORS[customerDetails.tier]}>{customerDetails.tier}</Badge></div>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">Order History ({customerDetails.orders.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customerDetails.orders.slice(0, 10).map((o) => (
                    <div key={o._id} className="flex items-center justify-between text-sm border-b pb-1">
                      <div><p className="font-medium">{o.orderNumber}</p><p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p></div>
                      <p className="font-medium">{formatCurrency(o.totalAmount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Customer Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <Button onClick={handleCreate} className="w-full">Create Customer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
