import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function OnboardingPage() {
  const navigate = useNavigate();
  const createRestaurant = useMutation(api.restaurants.createRestaurant);
  const seedData = useMutation(api.seed.seedDemoData);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    email: "",
    gstin: "",
    taxRate: 5,
    taxName: "GST",
    invoicePrefix: "INV-",
    currency: "INR",
    currencySymbol: "₹",
  });

  const update = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Restaurant name is required");
      return;
    }
    setLoading(true);
    try {
      const restaurantId = await createRestaurant(form);
      await seedData({ restaurantId });
      toast.success("Restaurant created! Demo data loaded.");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to create restaurant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl mb-4">
            R
          </div>
          <h1 className="text-2xl font-bold">Set Up Your Restaurant</h1>
          <p className="text-muted-foreground text-sm">Get started in just a few steps</p>
        </div>

        {/* Progress */}
        <div className="mb-6 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 ? "Restaurant Details" : step === 2 ? "Business Setup" : "Ready to Go"}
            </CardTitle>
            <CardDescription>
              {step === 1
                ? "Tell us about your restaurant"
                : step === 2
                ? "Configure tax and billing"
                : "Launch your restaurant"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Restaurant Name *</Label>
                  <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="SpiceHub Restaurant" />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Main Street" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Mumbai" />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="Maharashtra" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="info@spicehub.com" type="email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>GSTIN</Label>
                  <Input value={form.gstin} onChange={(e) => update("gstin", e.target.value)} placeholder="22AAAAA0000A1Z5" />
                </div>
                <Button onClick={() => setStep(2)} className="w-full">Continue</Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tax Rate (%)</Label>
                    <Input type="number" value={form.taxRate} onChange={(e) => update("taxRate", Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Name</Label>
                    <Input value={form.taxName} onChange={(e) => update("taxName", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input value={form.currency} onChange={(e) => update("currency", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency Symbol</Label>
                    <Input value={form.currencySymbol} onChange={(e) => update("currencySymbol", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Invoice Prefix</Label>
                  <Input value={form.invoicePrefix} onChange={(e) => update("invoicePrefix", e.target.value)} placeholder="INV-" />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button onClick={() => setStep(3)} className="flex-1">Continue</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl">
                  ✓
                </div>
                <h3 className="font-semibold text-lg">All Set!</h3>
                <p className="text-sm text-muted-foreground">
                  We'll create your restaurant with demo data including 15 products, 12 tables, 5 customers, and 3 suppliers.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                  <Button onClick={handleSubmit} className="flex-1" disabled={loading}>
                    {loading ? "Creating..." : "Launch Restaurant"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
