import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ApiConnectionsPage from "./pages/integrations/ApiConnectionsPage";
import CRMPage from "./pages/crm/CRMPage";
import AgentsPage from "./pages/agents/AgentsPage";
import ProspeccaoPage from "./pages/prospeccao/ProspeccaoPage";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/conexoes-api" element={<ApiConnectionsPage />} />
        <Route path="/crm" element={<CRMPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/prospeccao" element={<ProspeccaoPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}