import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { EnvModeProvider } from "@/hooks/useEnvMode";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Overview from "./pages/dashboard/Overview";
import CreateTransaction from "./pages/dashboard/CreateTransaction";
import Transactions from "./pages/dashboard/Transactions";
import Profile from "./pages/dashboard/Profile";
import Notifications from "./pages/dashboard/Notifications";
import Kyc from "./pages/dashboard/Kyc";
import Chat from "./pages/dashboard/Chat";
import MerchantQris from "./pages/dashboard/MerchantQris";
import UserApiSettings from "./pages/dashboard/ApiSettings";
import Documentation from "./pages/dashboard/Documentation";
import Withdraw from "./pages/dashboard/Withdraw";
import AdminTransactions from "./pages/admin/AdminTransactions";
import UserManagement from "./pages/admin/UserManagement";
import AdminApiSettings from "./pages/admin/ApiSettings";
import FeeSettings from "./pages/admin/FeeSettings";
import Reports from "./pages/admin/Reports";
import LiveChat from "./pages/admin/LiveChat";
import DashboardWidgets from "./pages/admin/DashboardWidgets";
import MerchantQrisRequests from "./pages/admin/MerchantQrisRequests";
import Withdrawals from "./pages/admin/Withdrawals";
import AdminBalance from "./pages/admin/AdminBalance";
import PaymentProviders from "./pages/admin/PaymentProviders";

import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <EnvModeProvider>
          <Routes>

            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/checkout" element={<Checkout />} />

            {/* User Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Overview />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/create"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CreateTransaction />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/transactions"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Transactions />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/profile"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Profile />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/notifications"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Notifications />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/kyc"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Kyc />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/chat"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Chat />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/merchant-qris"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <MerchantQris />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/api"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <UserApiSettings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/docs"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Documentation />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/transactions"
              element={
                <ProtectedRoute requireAdmin>
                  <DashboardLayout>
                    <AdminTransactions />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <DashboardLayout>
                    <UserManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requireAdmin>
                  <DashboardLayout>
                    <AdminApiSettings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/fees"
              element={
                <ProtectedRoute requireAdmin>
                  <DashboardLayout>
                    <FeeSettings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/providers"
              element={
                <ProtectedRoute requireAdmin>
                  <DashboardLayout>
                    <PaymentProviders />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute requireAdmin>
                  <DashboardLayout>
                    <Reports />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/chat"
              element={
                <ProtectedRoute requireAdmin>
                  <DashboardLayout>
                    <LiveChat />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/widgets"
              element={
                <ProtectedRoute requireAdmin>
                  <DashboardLayout>
                    <DashboardWidgets />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/merchant-qris"
              element={
                <ProtectedRoute requireAdmin>
                  <DashboardLayout>
                    <MerchantQrisRequests />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Additional User Routes */}
            <Route
              path="/dashboard/withdraw"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Withdraw />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Additional Admin Routes */}
            <Route
              path="/admin/withdrawals"
              element={
                <ProtectedRoute requireAdmin>
                  <DashboardLayout>
                    <Withdrawals />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/balance"
              element={
                <ProtectedRoute requireAdmin>
                  <DashboardLayout>
                    <AdminBalance />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </EnvModeProvider>
        </AuthProvider>

      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
