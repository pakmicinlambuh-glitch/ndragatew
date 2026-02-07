import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Pages
import Auth from "./pages/Auth";
import Overview from "./pages/dashboard/Overview";
import CreateTransaction from "./pages/dashboard/CreateTransaction";
import Transactions from "./pages/dashboard/Transactions";
import Profile from "./pages/dashboard/Profile";
import AdminTransactions from "./pages/admin/AdminTransactions";
import UserManagement from "./pages/admin/UserManagement";
import AdminApiSettings from "./pages/admin/ApiSettings";
import FeeSettings from "./pages/admin/FeeSettings";
import Reports from "./pages/admin/Reports";
import UserApiSettings from "./pages/dashboard/ApiSettings";
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
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/auth" replace />} />
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
              path="/dashboard/api"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <UserApiSettings />
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
              path="/admin/reports"
              element={
                <ProtectedRoute requireAdmin>
                  <DashboardLayout>
                    <Reports />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
