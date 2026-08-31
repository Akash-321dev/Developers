import { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Users, X,
  CreditCard, Banknote, Smartphone, ArrowRight, Printer,
} from "lucide-react";

interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  taxRate: number;
  notes: string;
}

export function POSPage() {
  const { restaurantId, currentUser } = useOutletContext<{ restaurantId: string; currentUser: any }>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY" | "DELIVERY">("DINE_IN");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");

  const products = useQuery(api.products.getActiveProducts, { restaurantId });
  const categories = useQuery(api.products.getCategories, { restaurantId });
  const tables = useQuery(api.tables.getTablesWithStatus, { restaurantId });
  const customers = useQuery(api.customers.getCustomers, { restaurantId });
  const restaurant = useQuery(api.restaurants.getRestaurant, { restaurantId });

  const createOrder = useMutation(api.orders.createOrder);
  const completeBilling = useMutation(api.billing.completeBilling);
  const searchByBarcode = useQuery(
    api.products.getProductByBarcode,
    barcodeInput.length >= 3 ? { restaurantId, barcode: barcodeInput } : "skip"
  );

  // Barcode scanner support
  useEffect(() => {
    if (searchByBarcode) {
      addToCart({
        _id: searchByBarcode._id,
        name: searchByBarcode.name,
        price: searchByBarcode.price,
        taxRate: searchByBarcode.taxRate,
      });
      setBarcodeInput("");
      toast.success(`${searchByBarcode.name} added`);
    }
  }, [searchByBarcode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F6") { e.preventDefault(); setPaymentOpen(true); }
      if (e.key === "Escape") { setPaymentOpen(false); }
      if (e.key === "F8") { e.preventDefault(); /* Hold order */ }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = products;
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.categoryId === selectedCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [products, selectedCategory, searchQuery]);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!customerSearch) return customers.slice(0, 10);
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q)
    );
  }, [customers, customerSearch]);

  const availableTables = useMemo(() => {
    if (!tables) return [];
    return tables.filter((t) => t.status === "AVAILABLE" && t.isActive);
  }, [tables]);

  const addToCart = useCallback((product: { _id: string; name: string; price: number; taxRate: number }) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product._id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          productName: product.name,
          price: product.price,
          quantity: 1,
          taxRate: product.taxRate,
          notes: "",
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountAmount(0);
    setTipAmount(0);
    setNotes("");
    setSelectedCustomer(null);
  }, []);

  const cartSummary = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    cart.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      totalTax += itemTotal * (item.taxRate / 100);
    });
    const total = subtotal + totalTax - discountAmount + tipAmount;
    return { subtotal, totalTax, total };
  }, [cart, discountAmount, tipAmount]);

  const handleCheckout = async (paymentMethod: "CASH" | "UPI" | "CARD") => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    try {
      const orderId = await createOrder({
        restaurantId,
        userId: currentUser._id,
        tableId: selectedTable || undefined,
        customerId: selectedCustomer || undefined,
        orderType,
        items: cart.map((item) => ({
          productId: item.productId as any,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.price,
          taxRate: item.taxRate,
          discountAmount: 0,
          notes: item.notes || undefined,
        })),
        discountAmount,
        tipAmount,
        notes: notes || undefined,
      });

      await completeBilling({
        orderId,
        userId: currentUser._id,
        customerId: selectedCustomer || undefined,
        discountAmount,
        tipAmount,
        paymentMethod,
        paidAmount: cartSummary.total,
        reference: undefined,
      });

      toast.success("Order completed successfully!");
      clearCart();
      setPaymentOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to complete order");
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Products Panel */}
      <div className="flex-1 flex flex-col overflow-hidden border-r">
        {/* Search & Filters */}
        <div className="border-b p-3 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products... (F2)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Input
              placeholder="Scan barcode..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                !selectedCategory
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              )}
            >
              All
            </button>
            {categories?.map((cat) => (
              <button
                key={cat._id}
                onClick={() => setSelectedCategory(selectedCategory === cat._id ? null : cat._id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  selectedCategory === cat._id
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {filteredProducts.map((product) => (
              <button
                key={product._id}
                onClick={() => addToCart(product)}
                className="pos-product-enter flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all hover:border-primary hover:bg-primary/5 hover:shadow-md active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                  {product.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-medium leading-tight line-clamp-2">{product.name}</p>
                  <p className="mt-1 text-sm font-bold text-primary">{formatCurrency(product.price)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-80 lg:w-96 flex flex-col bg-background">
        {/* Cart Header */}
        <div className="border-b p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="font-semibold">Order ({cart.length} items)</span>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive h-7">
                <Trash2 className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={orderType} onValueChange={(v: any) => setOrderType(v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DINE_IN">🍽️ Dine In</SelectItem>
                <SelectItem value="TAKEAWAY">📦 Takeaway</SelectItem>
                <SelectItem value="DELIVERY">🛵 Delivery</SelectItem>
              </SelectContent>
            </Select>
            {orderType === "DINE_IN" && (
              <Select value={selectedTable || ""} onValueChange={(v) => setSelectedTable(v || null)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Table" />
                </SelectTrigger>
                <SelectContent>
                  {availableTables.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      Table {t.number} ({t.capacity} seats)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm">Add products to begin</p>
              <p className="text-xs">Click products or scan barcode</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="flex items-center gap-2 rounded-lg border p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.productId, -1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.productId, 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm font-medium w-16 text-right">
                  {formatCurrency(item.price * item.quantity)}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeItem(item.productId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout */}
        <div className="border-t p-3 space-y-2">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(cartSummary.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(cartSummary.totalTax)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tip</span>
                <span>{formatCurrency(tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 font-bold text-base">
              <span>Total</span>
              <span>{formatCurrency(cartSummary.total)}</span>
            </div>
          </div>

          {/* Customer */}
          <div className="flex gap-2">
            <Input
              placeholder="Customer phone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          {customerSearch && filteredCustomers.length > 0 && (
            <div className="max-h-24 overflow-y-auto rounded border">
              {filteredCustomers.slice(0, 3).map((c) => (
                <button
                  key={c._id}
                  onClick={() => { setSelectedCustomer(c._id); setCustomerSearch(c.name); }}
                  className="flex w-full items-center gap-2 px-2 py-1 text-xs hover:bg-muted"
                >
                  <Users className="h-3 w-3" />
                  {c.name} {c.phone && `• ${c.phone}`}
                </button>
              ))}
            </div>
          )}

          <Button
            className="w-full h-12 text-base font-bold"
            onClick={() => setPaymentOpen(true)}
            disabled={cart.length === 0}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Pay {formatCurrency(cartSummary.total)}
          </Button>
          <p className="text-center text-[10px] text-muted-foreground">F6 = Quick Pay | F2 = Search | Esc = Close</p>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">Amount Due</p>
              <p className="text-3xl font-bold">{formatCurrency(cartSummary.total)}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleCheckout("CASH")}
              >
                <Banknote className="h-6 w-6 text-green-600" />
                <span className="text-xs">Cash</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleCheckout("UPI")}
              >
                <Smartphone className="h-6 w-6 text-blue-600" />
                <span className="text-xs">UPI</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleCheckout("CARD")}
              >
                <CreditCard className="h-6 w-6 text-purple-600" />
                <span className="text-xs">Card</span>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Discount (₹)</Label>
                <Input
                  type="number"
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tip (₹)</Label>
                <Input
                  type="number"
                  value={tipAmount || ""}
                  onChange={(e) => setTipAmount(Number(e.target.value) || 0)}
                  className="h-8"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
