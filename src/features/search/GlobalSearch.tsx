import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Search, X, Package, Users, ClipboardList, LayoutGrid, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GlobalSearchProps {
  restaurantId: string;
  onClose: () => void;
}

type SearchResult = {
  type: "product" | "customer" | "order" | "table";
  id: string;
  title: string;
  subtitle: string;
  extra?: string;
};

export function GlobalSearch({ restaurantId, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const products = useQuery(api.products.getProducts, { restaurantId });
  const customers = useQuery(api.customers.getCustomers, { restaurantId });
  const orders = useQuery(api.orders.getOrders, { restaurantId });
  const tables = useQuery(api.tables.getTables, { restaurantId });

  const results: SearchResult[] = [];

  if (query.length >= 2) {
    const q = query.toLowerCase();

    products?.filter((p) => p.isActive && (
      p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q)
    )).forEach((p) => {
      results.push({
        type: "product",
        id: p._id,
        title: p.name,
        subtitle: `SKU: ${p.sku || "N/A"}`,
        extra: formatCurrency(p.price),
      });
    });

    customers?.filter((c) =>
      c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q)
    ).forEach((c) => {
      results.push({
        type: "customer",
        id: c._id,
        title: c.name,
        subtitle: c.phone || c.email || "",
        extra: `${c.totalOrders} orders`,
      });
    });

    orders?.filter((o) =>
      o.orderNumber.toLowerCase().includes(q)
    ).forEach((o) => {
      results.push({
        type: "order",
        id: o._id,
        title: o.orderNumber,
        subtitle: o.orderType,
        extra: formatCurrency(o.totalAmount),
      });
    });

    tables?.filter((t) =>
      t.number.toLowerCase().includes(q) || t.name?.toLowerCase().includes(q)
    ).forEach((t) => {
      results.push({
        type: "table",
        id: t._id,
        title: `Table ${t.number}`,
        subtitle: t.name || `${t.capacity} seats`,
        extra: t.status,
      });
    });
  }

  const typeIcons = {
    product: Package,
    customer: Users,
    order: ClipboardList,
    table: LayoutGrid,
  };

  const typeLabels = {
    product: "Products",
    customer: "Customers",
    order: "Orders",
    table: "Tables",
  };

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  const handleSelect = (result: SearchResult) => {
    onClose();
    if (result.type === "product") navigate("/menu");
    else if (result.type === "customer") navigate("/customers");
    else if (result.type === "order") navigate("/orders");
    else if (result.type === "table") navigate("/tables");
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg p-0">
        <div className="flex items-center border-b px-4">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search products, customers, orders, tables..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 shadow-none"
            autoFocus
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {query.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
              <Search className="h-8 w-8 mb-2 opacity-20" />
              Type at least 2 characters to search
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
              No results found for "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <div key={type} className="mb-3">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  {typeLabels[type as keyof typeof typeLabels]}
                </p>
                {items.map((item) => {
                  const Icon = typeIcons[item.type];
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                      </div>
                      {item.extra && (
                        <span className="text-xs text-muted-foreground shrink-0">{item.extra}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="border-t px-4 py-2 text-[10px] text-muted-foreground text-center">
          Press F3 to open search • Esc to close
        </div>
      </DialogContent>
    </Dialog>
  );
}
