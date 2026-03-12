import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Catalog from "./pages/Catalog";
import PropertyDetails from "./pages/PropertyDetails";
import InvalidLink from "./pages/InvalidLink";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProperties from "./pages/admin/AdminProperties";
import PropertyForm from "./pages/admin/PropertyForm";
import AdminLinks from "./pages/admin/AdminLinks";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSubmissions from "./pages/admin/AdminSubmissions";
import AdminClients from "./pages/admin/AdminClients";
import ClientDetails from "./pages/admin/ClientDetails";
import AdminPartners from "./pages/admin/AdminPartners";
import PartnerDetails from "./pages/admin/PartnerDetails";
import PropertySubmission from "./pages/PropertySubmission";
import AdminFinanceiro from "./pages/admin/AdminFinanceiro";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminCommunications from "./pages/admin/AdminCommunications";
import RegularizationDetails from "./pages/admin/RegularizationDetails";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Investor Catalog Routes */}
          <Route path="/catalogo/:token" element={<Catalog />} />
          <Route path="/catalogo/:token/imovel/:propertyId" element={<PropertyDetails />} />
          <Route path="/link-invalido" element={<InvalidLink />} />
          
          {/* Broker Submission Route */}
          <Route path="/submit/:token" element={<PropertySubmission />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="imoveis" element={<AdminProperties />} />
            <Route path="imoveis/:id" element={<PropertyForm />} />
            <Route path="links" element={<AdminLinks />} />
            <Route path="relatorios" element={<AdminReports />} />
            <Route path="configuracoes" element={<AdminSettings />} />
            <Route path="submissoes" element={<AdminSubmissions />} />
            <Route path="financeiro" element={<AdminFinanceiro />} />
            <Route path="documentos" element={<AdminDocuments />} />
            <Route path="regularizacoes/:id" element={<RegularizationDetails />} />
            <Route path="clientes" element={<AdminClients />} />
            <Route path="clientes/:id" element={<ClientDetails />} />
            <Route path="parceiros" element={<AdminPartners />} />
            <Route path="parceiros/:id" element={<PartnerDetails />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
