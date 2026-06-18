import { lazy, Suspense, useEffect } from "react";
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
import MobileBottomNav from "./components/MobileBottomNav";
import { SupportFab } from "./components/SupportFab";
import { CookieBanner } from "./components/CookieBanner";

// Eager: most frequent entry points
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import GuestPreview from "./pages/GuestPreview";

// Lazy: protected/secondary routes, loaded on demand
const Wallet = lazy(() => import("./pages/Wallet"));
const CreateTransaction = lazy(() => import("./pages/CreateTransaction"));
const JoinTransaction = lazy(() => import("./pages/JoinTransaction"));
const Transaction = lazy(() => import("./pages/Transaction"));
const InviteWelcome = lazy(() => import("./pages/InviteWelcome"));
const Verification = lazy(() => import("./pages/Verification"));
const Admin = lazy(() => import("./pages/Admin"));
const MovementHistory = lazy(() => import("./pages/MovementHistory"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Appeal = lazy(() => import("./pages/Appeal"));
const AdminAppeal = lazy(() => import("./pages/AdminAppeal"));
const ReturnRoom = lazy(() => import("./pages/ReturnRoom"));
const AdminReturnRoom = lazy(() => import("./pages/AdminReturnRoom"));
const Support = lazy(() => import("./pages/Support"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const SetPassword = lazy(() => import("./pages/SetPassword"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const AdminBlog = lazy(() => import("./pages/AdminBlog"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
  </div>
);

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
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/guest" element={<GuestPreview />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verificar-email" element={<VerifyEmail />} />
                <Route path="/invite/:id" element={<InviteWelcome />} />
                <Route path="/u/:userId" element={<PublicProfile />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/categoria/:categorySlug" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/admin/blog" element={<ProtectedRoute><AdminBlog /></ProtectedRoute>} />

                {/* Protected routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/set-password" element={<ProtectedRoute><SetPassword /></ProtectedRoute>} />
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
                <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
                <Route path="/support/:threadId" element={<ProtectedRoute><Support /></ProtectedRoute>} />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <MobileBottomNav />
            <SupportFab />
            <CookieBanner />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
