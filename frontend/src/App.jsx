import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { BlockchainProvider } from "./context/BlockchainContext";
import Navbar          from "./components/Navbar";
import LoginPage       from "./pages/LoginPage";
import ChatPage        from "./pages/ChatPage";
import CreateRoomPage  from "./pages/CreateRoomPage";
import AuditPage       from "./pages/AuditPage";
import AdminPage       from "./pages/AdminPage";
import "./App.css";

export default function App() {
  return (
    <BlockchainProvider>
      <div className="app-shell">
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route path="/"              element={<LoginPage />} />
            <Route path="/chat"          element={<ChatPage />} />
            <Route path="/rooms/create"  element={<CreateRoomPage />} />
            <Route path="/audit"         element={<AuditPage />} />
            <Route path="/audit/:id"     element={<AuditPage />} />
            <Route path="/admin"         element={<AdminPage />} />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BlockchainProvider>
  );
}
