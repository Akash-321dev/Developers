import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { Users, Plus, Shield, UserCheck, UserX } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  RESTAURANT_OWNER: "bg-purple-100 text-purple-800",
  MANAGER: "bg-blue-100 text-blue-800",
  CASHIER: "bg-green-100 text-green-800",
  KITCHEN: "bg-orange-100 text-orange-800",
  WAITER: "bg-teal-100 text-teal-800",
};

export function StaffPage() {
  const { restaurantId, userRole } = useOutletContext<{ restaurantId: string; userRole: string }>();
  const [createOpen, setCreateOpen] = useState(false);
  const users = useQuery(api.users.getRestaurantUsers, { restaurantId });
  const updateUserRole = useMutation(api.users.updateUserRole);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "CASHIER" as any });

  const canManage = userRole === "RESTAURANT_OWNER" || userRole === "MANAGER" || userRole === "SUPER_ADMIN";

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateUserRole({ restaurantId, userId, role: role as any });
      toast.success("Role updated");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> Staff Management</h2>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Staff</Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {["RESTAURANT_OWNER", "MANAGER", "CASHIER", "KITCHEN", "WAITER"].map((role) => (
          <Card key={role}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{users?.filter((u) => u.role === role).length || 0}</p>
              <p className="text-xs text-muted-foreground">{role.replace("_", " ").toLowerCase()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                {canManage && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => (
                <TableRow key={u._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {getInitials(u.name)}
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm">{u.phone || "-"}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u._id, v)}>
                        <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["MANAGER", "CASHIER", "KITCHEN", "WAITER"].map((r) => (
                            <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={ROLE_COLORS[u.role] || ""}>{u.role.replace("_", " ")}</Badge>
                    )}
                  </TableCell>
                  <TableCell><Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-xs">{formatDateTime(u.createdAt)}</TableCell>
                  {canManage && (
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        {u.isActive ? <UserX className="h-3.5 w-3.5 text-destructive" /> : <UserCheck className="h-3.5 w-3.5 text-green-600" />}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="CASHIER">Cashier</SelectItem>
                  <SelectItem value="KITCHEN">Kitchen</SelectItem>
                  <SelectItem value="WAITER">Waiter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Note: In production, this would send an invitation email. The staff member would set their own password.</p>
            <Button onClick={() => { toast.success("Staff member added (demo mode)"); setCreateOpen(false); }} className="w-full">Add Staff</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
