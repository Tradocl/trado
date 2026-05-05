import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Wallet from "./pages/Wallet";
import CreateTransaction from "./pages/CreateTransaction";
import JoinTransaction from "./pages/JoinTransaction";
import Transaction from "./pages/Transaction";
import InviteWelcome from "./pages/InviteWelcome";
import Verification from "./pages/Verification";
import Admin from "./pages/Admin";
import MovementHistory from "./pages/MovementHistory";
import TransactionHistory from "./pages/TransactionHistory";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Appeal from "./pages/Appeal";
import AdminAppeal from "./pages/AdminAppeal";
import ReturnRoom from "./pages/ReturnRoom";
import AdminReturnRoom from "./pages/AdminReturnRoom";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import NotFound from "./pages/NotFound";
import MobileBottomNav from "./components/MobileBottomNav";

const queryClient = new QueryClient();

const MobileBootstrap = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    SplashScreen.hide().catch(() => {});

    try {
      StatusBar.setStyle({ style: Style.Dark });
      if (Capacitor.getPlatform() === 'android') {
        StatusBar.setBackgroundColor({ color: '#1a1a2e' });
      }
    } catch {}

    const listenerPromise = CapApp.addListener('appUrlOpen', ({ url }) => {
      try {
        const path = new URL(url).pathname;
        if (path) navigate(path);
      } catch {}
    });

    return () => { listenerPromise.then(l => l.remove()); };
  }, [navigate]);

  return null;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <MobileBootstrap />
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verificar-email" element={<VerifyEmail />} />
              <Route path="/invite/:id" element={<InviteWelcome />} />
              <Route path="/u/:userId" element={<PublicProfile />} />

              {/* Protected routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
              <Route path="/create-transaction" element={<ProtectedRoute><CreateTransaction /></ProtectedRoute>} />
              <Route path="/create-sale" element={<ProtectedRoute><CreateTransaction /></ProtectedRoute>} />
              <Route path="/join-transaction" element={<ProtectedRoute><JoinTransaction /></ProtectedRoute>} />
              <Route path="/transaction/:id" element={<ProtectedRoute><Transaction /></ProtectedRoute>} />
              <Route path="/verification" element={<ProtectedRoute><Verification /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/movement-history" element={<ProtectedRoute><MovementHistory /></ProtectedRoute>} />
              <Route path="/transaction-history" element={<ProtectedRoute><TransactionHistory /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/appeal/:appealId" element={<ProtectedRoute><Appeal /></ProtectedRoute>} />
              <Route path="/admin/appeal/:appealId" element={<ProtectedRoute><AdminAppeal /></ProtectedRoute>} />
              <Route path="/return/:returnId" element={<ProtectedRoute><ReturnRoom /></ProtectedRoute>} />
              <Route path="/admin/return/:returnId" element={<ProtectedRoute><AdminReturnRoom /></ProtectedRoute>} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <MobileBottomNav />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
