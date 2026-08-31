import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  ChefHat,
  LayoutGrid,
  Package,
  Utensils,
  Users,
  Receipt,
  TrendingUp,
  Settings,
  Shield,
  Bell,
  Search,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { NotificationPanel } from "@/features/notifications/NotificationPanel";
import { GlobalSearch } from "@/features/search/GlobalSearch";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, permission: "view_reports" },
  { path: "/pos", label: "POS", icon: ShoppingCart, permission: "manage_billing" },
  { path: "/orders", label: "Orders", icon: ClipboardList, permission: "manage_orders" },
  { path: "/kitchen", label: "Kitchen", icon: ChefHat, permission: "manage_kitchen" },
  { path: "/tables", label: "Tables", icon: LayoutGrid, permission: "manage_tables" },
  { path: "/menu", label: "Menu", icon: Utensils, permission: "manage_menu" },
  { path: "/inventory", label: "Inventory", icon: Package, permission: "manage_inventory" },
  { path: "/customers", label: "Customers", icon: Users, permission: "manage_customers" },
  { path: "/sales", label: "Sales", icon: Receipt, permission: "manage_billing" },
  { path: "/expenses", label: "Expenses", icon: TrendingUp, permission: "manage_expenses" },
  { path: "/reports", label: "Reports", icon: TrendingUp, permission: "view_reports" },
  { path: "/staff", label: "Staff", icon: Users, permission: "manage_staff" },
  { path: "/audit", label: "Audit Log", icon: Shield, permission: "manage_audit" },
  { path: "/settings", label: "Settings", icon: Settings, permission: "manage_settings" },
  { path: "/super-admin", label: "Platform Admin", icon: Shield, permission: "manage_platform" },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { user: authUser } = useAuth();
  const currentUser = useQuery(
    api.users.getCurrentUserById,
    authUser ? { userId: authUser._id } : "skip"
  );
  const userRestaurants = useQuery(
    api.users.getUserRestaurants,
    authUser ? { userId: authUser._id } : "skip"
  );
  const activeRestaurantId = userRestaurants?.[0]?.restaurantId;
  const userRole = userRestaurants?.[0]?.role;
  const restaurant = userRestaurants?.[0]?.restaurant;
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    activeRestaurantId && currentUser ? { restaurantId: activeRestaurantId, userId: currentUser._id } : "skip"
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); navigate("/pos"); }
      if (e.key === "F3") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  // Still loading user data from Convex
  if (currentUser === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading RestaurantOS...</p>
        </div>
      </div>
    );
  }

  // User exists but has no restaurant — redirect to onboarding
  if (userRestaurants !== undefined && userRestaurants.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="text-center max-w-md p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-2xl mb-6">
            R
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome to RestaurantOS!</h2>
          <p className="text-muted-foreground mb-6">
            Set up your restaurant to get started. This takes just a minute.
          </p>
          <Button size="lg" onClick={() => navigate("/onboarding")}>
            Set Up My Restaurant
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Logged in as {currentUser.email}
          </p>
        </div>
      </div>
    );
  }

  // Still loading restaurant data
  if (!activeRestaurantId || !restaurant) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading restaurant data...</p>
        </div>
      </div>
    );
  }

  const filteredNav = navItems.filter((item) => {
    if (item.path === "/super-admin") return userRole === "SUPER_ADMIN";
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r bg-sidebar transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                R
              </div>
              <span className="font-bold text-lg">RestaurantOS</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
          </Button>
        </div>

        {/* Restaurant info */}
        {sidebarOpen && restaurant && (
          <div className="border-b px-4 py-3">
            <p className="text-sm font-medium truncate">{restaurant.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{userRole?.replace("_", " ").toLowerCase()}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  !sidebarOpen && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t p-3">
          <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center")}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              {getInitials(currentUser.name)}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 bg-sidebar border-r z-50 flex flex-col">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                  R
                </div>
                <span className="font-bold text-lg">RestaurantOS</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {restaurant && (
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium">{restaurant.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole?.replace("_", " ").toLowerCase()}</p>
              </div>
            )}
            <nav className="flex-1 overflow-y-auto px-2 py-3">
              {filteredNav.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMobileOpen(false); }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold capitalize">
              {location.pathname === "/" ? "Dashboard" : location.pathname.slice(1).replace("-", " ")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </Button>
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setNotifOpen(!notifOpen)}>
                <Bell className="h-5 w-5" />
                {(unreadCount ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                    {unreadCount}
                  </span>
                )}
              </Button>
              {notifOpen && (
                <NotificationPanel
                  restaurantId={activeRestaurantId}
                  userId={currentUser._id}
                  onClose={() => setNotifOpen(false)}
                />
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ restaurantId: activeRestaurantId, userRole, currentUser }} />
        </main>
      </div>

      {/* Global Search Modal */}
      {searchOpen && activeRestaurantId && (
        <GlobalSearch
          restaurantId={activeRestaurantId}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}
