import { useOutletContext } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  Receipt,
  Package,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

const COLORS = ["#ea580c", "#16a34a", "#2563eb", "#9333ea", "#eab308"];

export function Dashboard() {
  const { restaurantId } = useOutletContext<{ restaurantId: string }>();
  const stats = useQuery(api.reports.getDashboardStats, { restaurantId });
  const dailyTrend = useQuery(api.reports.getDailySalesTrend, { restaurantId, days: 7 });
  const recentOrders = useQuery(api.orders.getTodayOrders, { restaurantId });

  if (!stats) {
    return (
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-8 bg-muted rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Today's Sales", value: formatCurrency(stats.todaySales), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
    { title: "Today's Orders", value: stats.todayOrders.toString(), icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Avg Order Value", value: formatCurrency(stats.avgOrderValue), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Total Customers", value: stats.totalCustomers.toString(), icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
    { title: "Pending KOTs", value: stats.pendingKots.toString(), icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
    { title: "Tables Occupied", value: `${stats.occupiedTables}/${stats.totalTables}`, icon: Receipt, color: "text-red-600", bg: "bg-red-50" },
    { title: "Low Stock Items", value: stats.lowStockItems.toString(), icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
    { title: "Today's Expenses", value: formatCurrency(stats.todayExpenses), icon: Package, color: "text-gray-600", bg: "bg-gray-50" },
  ];

  const paymentData = (Object.entries(stats.paymentBreakdown) as [string, number][])
    .filter(([_, val]) => val > 0)
    .map(([method, amount]) => ({ name: method, value: amount }));

  const hourlyData = stats.hourlySales
    .map((sales, hour) => ({
      hour: `${hour}:00`,
      sales,
    }))
    .filter((d) => d.sales > 0 || (d.hour >= "10:00" && d.hour <= "23:00"));

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estimated Profit */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Estimated Profit Today</p>
              <p className="text-3xl font-bold">
                {stats.estimatedProfit >= 0 ? (
                  <span className="text-green-600">{formatCurrency(stats.estimatedProfit)}</span>
                ) : (
                  <span className="text-red-600">{formatCurrency(stats.estimatedProfit)}</span>
                )}
              </p>
            </div>
            {stats.estimatedProfit >= 0 ? (
              <ArrowUpRight className="h-8 w-8 text-green-600" />
            ) : (
              <ArrowDownRight className="h-8 w-8 text-red-600" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hourly Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hourly Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="sales" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">7-Day Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="sales" stroke="#ea580c" strokeWidth={2} dot={{ fill: "#ea580c" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Payment Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {paymentData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No payments today</div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topProducts.length > 0 ? (
              <div className="space-y-3">
                {stats.topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(p.revenue)}</p>
                      <p className="text-xs text-muted-foreground">{p.count} sold</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No sales today</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.slice(0, 5).map((order) => (
                  <div key={order._id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{order.orderType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(order.totalAmount)}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No orders today</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
