import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { BlockchainProvider } from "./context/BlockchainContext";
import Navbar         from "./components/Navbar";
import LoginPage      from "./pages/LoginPage";
import DashboardPage  from "./pages/DashboardPage";
import ChartCreatePage from "./pages/ChartCreatePage";
import ChartViewPage  from "./pages/ChartViewPage";
import ChartEditPage  from "./pages/ChartEditPage";
import AuditPage      from "./pages/AuditPage";
import AdminPage      from "./pages/AdminPage";
import "./App.css";

export default function App() {
  return (
    <BlockchainProvider>
      <div className="app-shell">
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route path="/"                    element={<LoginPage />} />
            <Route path="/dashboard"           element={<DashboardPage />} />
            <Route path="/charts/create"       element={<ChartCreatePage />} />
            <Route path="/charts/:id"          element={<ChartViewPage />} />
            <Route path="/charts/:id/edit"     element={<ChartEditPage />} />
            <Route path="/audit"               element={<AuditPage />} />
            <Route path="/audit/:id"           element={<AuditPage />} />
            <Route path="/admin"               element={<AdminPage />} />
            <Route path="*"                    element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BlockchainProvider>
  );
}
