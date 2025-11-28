import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Wallet from "./pages/Wallet";
import CreateSale from "./pages/CreateSale";
import JoinTransaction from "./pages/JoinTransaction";
import Transaction from "./pages/Transaction";
import Verification from "./pages/Verification";
import Admin from "./pages/Admin";
import MovementHistory from "./pages/MovementHistory";
import TransactionHistory from "./pages/TransactionHistory";
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
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/create-sale" element={<CreateSale />} />
            <Route path="/join-transaction" element={<JoinTransaction />} />
            <Route path="/transaction/:id" element={<Transaction />} />
            <Route path="/verification" element={<Verification />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/movement-history" element={<MovementHistory />} />
            <Route path="/transaction-history" element={<TransactionHistory />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
