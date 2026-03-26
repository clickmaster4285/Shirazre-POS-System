import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import POSLayout from "./components/pos/POSLayout.tsx";
import POSDashboard from "./pages/pos/POSDashboard.tsx";
import POSScreen from "./pages/pos/POSScreen.tsx";
import OrderManagement from "./pages/pos/OrderManagement.tsx";
import TableManagement from "./pages/pos/TableManagement.tsx";
import KitchenDisplay from "./pages/pos/KitchenDisplay.tsx";
import Billing from "./pages/pos/Billing.tsx";
import MenuManagement from "./pages/pos/MenuManagement.tsx";
import Reports from "./pages/pos/Reports.tsx";
import PermissionManagement from "./pages/pos/PermissionManagement.tsx";
import InventoryManagement from "./pages/pos/InventoryManagement.tsx";
import HRManagement from "./pages/pos/HRManagement.tsx";
import DeliveryTracking from "./pages/pos/DeliveryTracking.tsx";
import SalesAnalytics from "./pages/pos/SalesAnalytics.tsx";
import Login from "./pages/pos/Login.tsx";
import PageGuard from "./components/pos/PageGuard.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/pos/login" element={<Login />} />
            <Route path="/pos" element={<POSLayout />}>
              <Route index element={<PageGuard page="dashboard"><POSDashboard /></PageGuard>} />
              <Route path="terminal" element={<PageGuard page="terminal"><POSScreen /></PageGuard>} />
              <Route path="orders" element={<PageGuard page="orders"><OrderManagement /></PageGuard>} />
              <Route path="tables" element={<PageGuard page="tables"><TableManagement /></PageGuard>} />
              <Route path="kitchen" element={<PageGuard page="kitchen"><KitchenDisplay /></PageGuard>} />
              <Route path="billing" element={<PageGuard page="billing"><Billing /></PageGuard>} />
              <Route path="menu" element={<PageGuard page="menu"><MenuManagement /></PageGuard>} />
              <Route path="reports" element={<PageGuard page="reports"><Reports /></PageGuard>} />
              <Route path="users" element={<PageGuard page="users"><PermissionManagement /></PageGuard>} />
              <Route path="inventory" element={<PageGuard page="inventory"><InventoryManagement /></PageGuard>} />
              <Route path="hr" element={<PageGuard page="hr"><HRManagement /></PageGuard>} />
              <Route path="delivery" element={<PageGuard page="delivery"><DeliveryTracking /></PageGuard>} />
              <Route path="analytics" element={<PageGuard page="analytics"><SalesAnalytics /></PageGuard>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
