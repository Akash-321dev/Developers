import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, TrendingUp } from "lucide-react";

export function ExpensesPage() {
  const { restaurantId, currentUser } = useOutletContext<{ restaurantId: string; currentUser: any }>();
  const [createOpen, setCreateOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const expenses = useQuery(api.expenses.getExpenses, {
    restaurantId,
    startDate: new Date(startDate).getTime(),
    endDate: new Date(endDate + "T23:59:59").getTime(),
  });
  const categories = useQuery(api.expenses.getExpenseCategories, { restaurantId });
  const createExpense = useMutation(api.expenses.createExpense);

  const [form, setForm] = useState({ categoryId: "", description: "", amount: 0, date: new Date().toISOString().split("T")[0], isRecurring: false, notes: "" });

  const totalExpenses = expenses?.reduce((s, e) => s + e.amount, 0) || 0;

  const handleCreate = async () => {
    if (!form.categoryId || !form.description || form.amount <= 0) { toast.error("Fill all required fields"); return; }
    try {
      await createExpense({
        restaurantId,
        userId: currentUser._id,
        categoryId: form.categoryId as any,
        description: form.description,
        amount: form.amount,
        date: new Date(form.date).getTime(),
        isRecurring: form.isRecurring,
        notes: form.notes || undefined,
      });
      toast.success("Expense recorded");
      setCreateOpen(false);
      setForm({ categoryId: "", description: "", amount: 0, date: new Date().toISOString().split("T")[0], isRecurring: false, notes: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  // Group by category
  const byCategory: Record<string, number> = {};
  expenses?.forEach((e) => {
    const cat = e.category?.name || "Other";
    byCategory[cat] = (byCategory[cat] || 0) + e.amount;
  });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Expenses</h2>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Record Expense</Button>
      </div>

      <div className="flex items-end gap-4">
        <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8" /></div>
        <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8" /></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Transactions</p><p className="text-xl font-bold">{expenses?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Avg per Transaction</p><p className="text-xl font-bold">{formatCurrency(expenses && expenses.length > 0 ? totalExpenses / expenses.length : 0)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Categories Used</p><p className="text-xl font-bold">{Object.keys(byCategory).length}</p></CardContent></Card>
      </div>

      {/* Category breakdown */}
      {Object.keys(byCategory).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">By Category</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                <div key={cat} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
                  <span className="font-medium">{cat}</span>
                  <span className="text-muted-foreground">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Recorded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses?.map((e) => (
                <TableRow key={e._id}>
                  <TableCell className="text-xs">{formatDateTime(e.date)}</TableCell>
                  <TableCell><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{e.category?.name}</span></TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell className="font-medium text-red-600">{formatCurrency(e.amount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.notes || "-"}</TableCell>
                  <TableCell className="text-xs">{e.creator?.name}</TableCell>
                </TableRow>
              ))}
              {(!expenses || expenses.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No expenses in this period</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {categories?.filter((c) => c.isActive).map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Description *</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount (₹) *</Label><Input type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.isRecurring} onCheckedChange={(v) => setForm({ ...form, isRecurring: v })} /><Label>Recurring</Label></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={handleCreate} className="w-full">Record Expense</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
