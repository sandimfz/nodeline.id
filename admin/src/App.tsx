import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthInit } from "@/components/auth/auth-init";
import { ProtectedRoute, PublicRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/layout/app-shell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProductsPage } from "@/pages/ProductsPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { AllOrdersPage } from "@/pages/AllOrdersPage";
import { OrderDetailPage } from "@/pages/OrderDetailPage";
import { UsersPage } from "@/pages/UsersPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { PaymentMethodsPage } from "@/pages/PaymentMethodsPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { ApiServicesPage } from "@/pages/ApiServicesPage";
import { ChatConversationsPage } from "@/pages/ChatConversationsPage";
import { ChatConversationDetailPage } from "@/pages/ChatConversationDetailPage";
import { ForbiddenPage } from "@/pages/ForbiddenPage";
import { Toaster } from "@/components/ui/sonner";
import { ADMIN_BASE } from "@/lib/config";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="admin-theme">
        <Toaster richColors position="top-right" closeButton />
        <BrowserRouter>
          <AuthInit />
          <Routes>
            {/* Root → 403 forbidden */}
            <Route path="/" element={<ForbiddenPage />} />

            {/* Semua admin route di bawah path rahasia */}
            <Route path={ADMIN_BASE}>
              {/* Public routes — login di index path rahasia */}
              <Route element={<PublicRoute />}>
                <Route index element={<LoginPage />} />
              </Route>

              {/* Protected routes with AppShell */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route path="dashboard" element={<DashboardPage />} />
                <Route path="dashboard/products" element={<ProductsPage />} />
                <Route
                  path="dashboard/products/:id"
                  element={<ProductDetailPage />}
                />
                <Route path="dashboard/orders" element={<AllOrdersPage />} />
                <Route path="dashboard/orders/:id" element={<OrderDetailPage />} />
                <Route path="dashboard/users" element={<UsersPage />} />
                <Route path="dashboard/categories" element={<CategoriesPage />} />
                <Route path="dashboard/api-services" element={<ApiServicesPage />} />
                <Route path="dashboard/chat" element={<ChatConversationsPage />} />
                <Route path="dashboard/chat/:id" element={<ChatConversationDetailPage />} />
                  <Route path="dashboard/payment-methods" element={<PaymentMethodsPage />} />
                <Route path="dashboard/settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>

            {/* Catch-all → 403 */}
            <Route path="*" element={<ForbiddenPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
