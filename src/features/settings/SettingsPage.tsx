import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Settings, Save } from "lucide-react";

export function SettingsPage() {
  const { restaurantId } = useOutletContext<{ restaurantId: string }>();
  const restaurant = useQuery(api.restaurants.getRestaurant, { restaurantId });
  const updateRestaurant = useMutation(api.restaurants.updateRestaurant);

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    gstin: "",
    taxRate: 5,
    taxName: "GST",
    invoicePrefix: "INV-",
  });
  const [loaded, setLoaded] = useState(false);

  // Load restaurant data once
  if (restaurant && !loaded) {
    setForm({
      name: restaurant.name,
      address: restaurant.address || "",
      phone: restaurant.phone || "",
      email: restaurant.email || "",
      gstin: restaurant.gstin || "",
      taxRate: restaurant.taxRate,
      taxName: restaurant.taxName,
      invoicePrefix: restaurant.invoicePrefix,
    });
    setLoaded(true);
  }

  const handleSave = async () => {
    try {
      await updateRestaurant({ restaurantId, ...form });
      toast.success("Settings updated");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!restaurant) {
    return <div className="p-6"><div className="h-8 bg-muted rounded w-48 animate-pulse" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Settings className="h-5 w-5" /> Restaurant Settings
      </h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Restaurant Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tax & Billing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Tax Name</Label>
              <Input value={form.taxName} onChange={(e) => setForm({ ...form, taxName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Invoice Prefix</Label>
              <Input value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Currency</p>
              <p className="font-medium">{restaurant.currency} ({restaurant.currencySymbol})</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Invoice Counter</p>
              <p className="font-medium">{restaurant.invoiceCounter}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-medium text-green-600">{restaurant.isActive ? "Active" : "Inactive"}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-medium">{new Date(restaurant.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" /> Save Settings
        </Button>
      </div>
    </div>
  );
}
