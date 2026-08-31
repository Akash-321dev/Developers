import { useOutletContext } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Shield, Building2, Users, DollarSign, Activity } from "lucide-react";

export function SuperAdminPage() {
  const { userRole } = useOutletContext<{ userRole: string }>();

  const stats = useQuery(api.superadmin.getPlatformStats);
  const restaurants = useQuery(api.superadmin.getAllRestaurants);
  const activity = useQuery(api.superadmin.getRecentActivity);

  if (userRole !== "SUPER_ADMIN") {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-20" />
          <p className="text-muted-foreground">Access restricted to Super Admin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" /> Platform Admin Dashboard
      </h2>

      {/* Platform Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Restaurants</p>
                  <p className="text-2xl font-bold">{stats.totalRestaurants}</p>
                  <p className="text-xs text-green-600">{stats.activeRestaurants} active</p>
                </div>
                <Building2 className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">{stats.totalRestaurantUsers} memberships</p>
                </div>
                <Users className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">30-Day Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Subscriptions</p>
                  <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
                  <p className="text-xs text-muted-foreground">of {stats.totalSubscriptions} total</p>
                </div>
                <Activity className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Restaurants List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Restaurants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Bills</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restaurants?.map((r) => (
                <TableRow key={r._id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.city || r.address || "No address"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.plan === "free" ? "secondary" : "default"}>
                      {r.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.userCount}</TableCell>
                  <TableCell>{r.billCount}</TableCell>
                  <TableCell>
                    <Badge variant={r.isActive ? "default" : "destructive"}>
                      {r.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{formatDateTime(r.createdAt)}</TableCell>
                </TableRow>
              ))}
              {(!restaurants || restaurants.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No restaurants registered
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-80 overflow-y-auto">
            {activity?.map((log) => (
              <div key={log._id} className="flex items-center gap-3 border-b px-4 py-2 last:border-0">
                <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{log.user?.name || "System"}</span>
                    {" "}
                    <span className="text-muted-foreground">{log.action}</span>
                    {" "}
                    <span className="text-muted-foreground">({log.entity})</span>
                  </p>
                  {log.restaurant && (
                    <p className="text-xs text-muted-foreground">{log.restaurant.name}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
            ))}
            {(!activity || activity.length === 0) && (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
