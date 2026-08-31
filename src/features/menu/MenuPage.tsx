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
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Utensils } from "lucide-react";

export function MenuPage() {
  const { restaurantId } = useOutletContext<{ restaurantId: string }>();
  const [tab, setTab] = useState<"categories" | "products">("categories");
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [prodDialogOpen, setProdDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const categories = useQuery(api.products.getCategories, { restaurantId });
  const products = useQuery(api.products.getProducts, { restaurantId });
  const createCategory = useMutation(api.products.createCategory);
  const updateCategory = useMutation(api.products.updateCategory);
  const deleteCategory = useMutation(api.products.deleteCategory);
  const createProduct = useMutation(api.products.createProduct);
  const updateProduct = useMutation(api.products.updateProduct);
  const deleteProduct = useMutation(api.products.deleteProduct);

  // Category form
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  // Product form
  const [prodForm, setProdForm] = useState({
    name: "", categoryId: "", description: "", sku: "", barcode: "",
    price: 0, costPrice: 0, taxRate: 5, preparationTime: 10,
    isAvailable: true, trackStock: false, stock: 0, minStock: 10, unit: "pcs",
  });

  const resetProdForm = () => {
    setProdForm({
      name: "", categoryId: "", description: "", sku: "", barcode: "",
      price: 0, costPrice: 0, taxRate: 5, preparationTime: 10,
      isAvailable: true, trackStock: false, stock: 0, minStock: 10, unit: "pcs",
    });
    setEditingProduct(null);
  };

  const handleCreateCategory = async () => {
    if (!catName.trim()) { toast.error("Category name required"); return; }
    try {
      await createCategory({
        restaurantId, name: catName, description: catDesc || undefined,
        displayOrder: (categories?.length || 0) + 1,
      });
      toast.success("Category created");
      setCatDialogOpen(false);
      setCatName(""); setCatDesc("");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSaveProduct = async () => {
    if (!prodForm.name || !prodForm.categoryId) { toast.error("Name and category required"); return; }
    try {
      if (editingProduct) {
        await updateProduct({ productId: editingProduct._id, ...prodForm });
        toast.success("Product updated");
      } else {
        await createProduct({ restaurantId, ...prodForm });
        toast.success("Product created");
      }
      setProdDialogOpen(false);
      resetProdForm();
    } catch (e: any) { toast.error(e.message); }
  };

  const openEditProduct = (product: any) => {
    setEditingProduct(product);
    setProdForm({
      name: product.name, categoryId: product.categoryId, description: product.description || "",
      sku: product.sku || "", barcode: product.barcode || "",
      price: product.price, costPrice: product.costPrice, taxRate: product.taxRate,
      preparationTime: product.preparationTime || 10, isAvailable: product.isAvailable,
      trackStock: product.trackStock, stock: product.stock, minStock: product.minStock,
      unit: product.unit,
    });
    setProdDialogOpen(true);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Utensils className="h-5 w-5" /> Menu Management
        </h2>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <Button variant={tab === "categories" ? "default" : "ghost"} size="sm" onClick={() => setTab("categories")}>
          Categories ({categories?.length || 0})
        </Button>
        <Button variant={tab === "products" ? "default" : "ghost"} size="sm" onClick={() => setTab("products")}>
          Products ({products?.length || 0})
        </Button>
      </div>

      {tab === "categories" && (
        <div className="space-y-4">
          <Button onClick={() => setCatDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Category</Button>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories?.filter((c) => c.isActive).map((cat) => {
              const count = products?.filter((p) => p.categoryId === cat._id).length || 0;
              return (
                <Card key={cat._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">{count} products</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setCatName(cat.name); setCatDesc(cat.description || ""); setCatDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => { await deleteCategory({ categoryId: cat._id }); toast.success("Deleted"); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {tab === "products" && (
        <div className="space-y-4">
          <Button onClick={() => { resetProdForm(); setProdDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Product
          </Button>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products?.filter((p) => p.isActive).map((product) => {
              const cat = categories?.find((c) => c._id === product.categoryId);
              return (
                <Card key={product._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                        {product.name.charAt(0)}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditProduct(product)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => { await deleteProduct({ productId: product._id }); toast.success("Deleted"); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{cat?.name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-primary">{formatCurrency(product.price)}</span>
                      <Badge variant={product.isAvailable ? "default" : "secondary"}>
                        {product.isAvailable ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Category name" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={catDesc} onChange={(e) => setCatDesc(e.target.value)} placeholder="Optional description" /></div>
            <Button onClick={handleCreateCategory} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={prodDialogOpen} onOpenChange={() => { setProdDialogOpen(false); resetProdForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingProduct ? "Edit Product" : "New Product"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name *</Label><Input value={prodForm.name} onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={prodForm.categoryId} onValueChange={(v) => setProdForm({ ...prodForm, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {categories?.filter((c) => c.isActive).map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={prodForm.description} onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Price (₹) *</Label><Input type="number" value={prodForm.price || ""} onChange={(e) => setProdForm({ ...prodForm, price: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Cost Price (₹)</Label><Input type="number" value={prodForm.costPrice || ""} onChange={(e) => setProdForm({ ...prodForm, costPrice: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Tax %</Label><Input type="number" value={prodForm.taxRate || ""} onChange={(e) => setProdForm({ ...prodForm, taxRate: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>SKU</Label><Input value={prodForm.sku} onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })} /></div>
              <div className="space-y-2"><Label>Barcode</Label><Input value={prodForm.barcode} onChange={(e) => setProdForm({ ...prodForm, barcode: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Prep Time (min)</Label><Input type="number" value={prodForm.preparationTime || ""} onChange={(e) => setProdForm({ ...prodForm, preparationTime: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Unit</Label><Input value={prodForm.unit} onChange={(e) => setProdForm({ ...prodForm, unit: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><Switch checked={prodForm.isAvailable} onCheckedChange={(v) => setProdForm({ ...prodForm, isAvailable: v })} /><Label>Available</Label></div>
              <div className="flex items-center gap-2"><Switch checked={prodForm.trackStock} onCheckedChange={(v) => setProdForm({ ...prodForm, trackStock: v })} /><Label>Track Stock</Label></div>
            </div>
            {prodForm.trackStock && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Stock</Label><Input type="number" value={prodForm.stock || ""} onChange={(e) => setProdForm({ ...prodForm, stock: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Min Stock</Label><Input type="number" value={prodForm.minStock || ""} onChange={(e) => setProdForm({ ...prodForm, minStock: Number(e.target.value) })} /></div>
              </div>
            )}
            <Button onClick={handleSaveProduct} className="w-full">{editingProduct ? "Update" : "Create"} Product</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
