import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useBlockchain, ROLE, ROLE_LABEL } from "../context/BlockchainContext";
import "./Navbar.css";

export default function Navbar() {
  const { account, userRole, username, isConnected, disconnect } = useBlockchain();
  const location = useLocation();

  const short = (addr) => addr ? `${addr.slice(0,6)}…${addr.slice(-4)}` : "";

  const isActive = (path) => location.pathname.startsWith(path) ? "nav-link active" : "nav-link";

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">⬡</span>
        <span className="navbar-title">SecureChart</span>
        <span className="navbar-tagline">Blockchain-Secured Visualisation</span>
      </div>

      {isConnected && (
        <div className="navbar-links">
          <Link to="/dashboard"       className={isActive("/dashboard")}>Dashboard</Link>
          {userRole >= ROLE.Editor && (
            <Link to="/charts/create" className={isActive("/charts/create")}>+ New Chart</Link>
          )}
          <Link to="/audit"           className={isActive("/audit")}>Audit Log</Link>
          {userRole >= ROLE.Admin && (
            <Link to="/admin"         className={isActive("/admin")}>Users</Link>
          )}
        </div>
      )}

      <div className="navbar-right">
        {isConnected ? (
          <div className="navbar-account">
            <div className="navbar-user-info">
              <span className="navbar-username">{username || "Unknown User"}</span>
              <span className={`badge badge-${ROLE_LABEL[userRole]?.toLowerCase()}`}>
                {ROLE_LABEL[userRole]}
              </span>
            </div>
            <span className="navbar-address">{short(account)}</span>
            <button className="btn btn-ghost btn-sm" onClick={disconnect}>Disconnect</button>
          </div>
        ) : (
          <div className="navbar-chain-info">
            <span className="chain-dot"></span>
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Not Connected</span>
          </div>
        )}
      </div>
    </nav>
  );
}
