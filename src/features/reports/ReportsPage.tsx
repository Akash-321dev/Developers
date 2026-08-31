import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, BarChart3, PieChart as PieChartIcon, DollarSign } from "lucide-react";

const COLORS = ["#ea580c", "#16a34a", "#2563eb", "#9333ea", "#eab308", "#ef4444", "#06b6d4"];

export function ReportsPage() {
  const { restaurantId } = useOutletContext<{ restaurantId: string }>();
  const [tab, setTab] = useState("sales");
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate + "T23:59:59").getTime();

  const salesSummary = useQuery(api.reports.getSalesSummary, { restaurantId, startDate: startMs, endDate: endMs });
  const productSales = useQuery(api.reports.getProductSalesReport, { restaurantId, startDate: startMs, endDate: endMs });
  const categorySales = useQuery(api.reports.getCategorySalesReport, { restaurantId, startDate: startMs, endDate: endMs });
  const dailyTrend = useQuery(api.reports.getDailySalesTrend, { restaurantId, days: 30 });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Reports & Analytics</h2>
      <div className="flex items-end gap-4">
        <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8" /></div>
        <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8" /></div>
      </div>

      {/* Summary Cards */}
      {salesSummary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-xl font-bold">{formatCurrency(salesSummary.totalRevenue)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Orders</p><p className="text-xl font-bold">{salesSummary.totalBills}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Avg Order</p><p className="text-xl font-bold">{formatCurrency(salesSummary.avgOrderValue)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Tax Collected</p><p className="text-xl font-bold">{formatCurrency(salesSummary.totalTax)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Discounts</p><p className="text-xl font-bold text-red-600">{formatCurrency(salesSummary.totalDiscount)}</p></CardContent></Card>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Daily Sales Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="sales" stroke="#ea580c" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Top Products by Revenue</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productSales?.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="revenue" fill="#ea580c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Qty Sold</TableHead><TableHead>Revenue</TableHead><TableHead>Cost</TableHead><TableHead>Profit</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {productSales?.slice(0, 15).map((p) => (
                      <TableRow key={p.productId}>
                        <TableCell className="font-medium text-sm">{p.name}</TableCell>
                        <TableCell>{p.count}</TableCell>
                        <TableCell>{formatCurrency(p.revenue)}</TableCell>
                        <TableCell>{formatCurrency(p.cost)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(p.revenue - p.cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Revenue by Category</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categorySales} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {categorySales?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Items Sold</TableHead><TableHead>Revenue</TableHead><TableHead>Share</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {categorySales?.map((c) => {
                      const total = categorySales.reduce((s, x) => s + x.revenue, 0);
                      return (
                        <TableRow key={c.categoryId}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.count}</TableCell>
                          <TableCell>{formatCurrency(c.revenue)}</TableCell>
                          <TableCell>{((c.revenue / total) * 100).toFixed(1)}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Payment Method Breakdown</CardTitle></CardHeader>
            <CardContent>
              {salesSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(salesSummary.paymentBreakdown).map(([method, amount]) => (
                    <div key={method} className="rounded-lg border p-4 text-center">
                      <p className="text-2xl mb-1">{method === "CASH" ? "💵" : method === "UPI" ? "📱" : method === "CARD" ? "💳" : "🔀"}</p>
                      <p className="text-sm text-muted-foreground">{method.replace("_", " ")}</p>
                      <p className="text-lg font-bold">{formatCurrency(amount as number)}</p>
                      {salesSummary.totalRevenue > 0 && (
                        <p className="text-xs text-muted-foreground">{(((amount as number) / salesSummary.totalRevenue) * 100).toFixed(1)}%</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
