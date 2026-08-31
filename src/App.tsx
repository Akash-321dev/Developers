import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth-context";
import { Toaster } from "sonner";
import { AuthPage } from "./features/auth/AuthPage";
import { OnboardingPage } from "./features/onboarding/OnboardingPage";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./features/dashboard/Dashboard";
import { POSPage } from "./features/pos/POSPage";
import { OrdersPage } from "./features/orders/OrdersPage";
import { KitchenPage } from "./features/kitchen/KitchenPage";
import { TablesPage } from "./features/tables/TablesPage";
import { MenuPage } from "./features/menu/MenuPage";
import { InventoryPage } from "./features/inventory/InventoryPage";
import { CustomersPage } from "./features/customers/CustomersPage";
import { ExpensesPage } from "./features/expenses/ExpensesPage";
import { ReportsPage } from "./features/reports/ReportsPage";
import { StaffPage } from "./features/staff/StaffPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { SalesPage } from "./features/billing/SalesPage";
import { AuditPage } from "./features/audit/AuditPage";
import { SuperAdminPage } from "./features/superadmin/SuperAdminPage";
import { RequireAuth } from "./components/shared/RequireAuth";

export default function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading RestaurantOS...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={
          <RequireAuth>
            <OnboardingPage />
          </RequireAuth>
        } />
        <Route path="/" element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }>
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="kitchen" element={<KitchenPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="super-admin" element={<SuperAdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
