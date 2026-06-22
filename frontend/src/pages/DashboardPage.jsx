import React, { useState, useEffect, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { useBlockchain, ROLE, ROLE_LABEL } from "../context/BlockchainContext";
import ChartRenderer from "../components/ChartRenderer";
import "./DashboardPage.css";

function StatCard({ label, value, icon, colour }) {
  return (
    <div className="stat-card" style={{ "--accent": colour }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function ChartCard({ chart, onSelect }) {
  const TYPE_ICON = { bar: "📊", line: "📈", pie: "🥧", scatter: "✦" };
  return (
    <div className="chart-card" onClick={() => onSelect(chart)}>
      <div className="chart-card-header">
        <span className="chart-type-badge">
          {TYPE_ICON[chart.chartType] || "📊"} {chart.chartType}
        </span>
        <span className="chart-date">
          {new Date(Number(chart.createdAt) * 1000).toLocaleDateString()}
        </span>
      </div>
      <h3 className="chart-card-title">{chart.title}</h3>
      <p className="chart-card-desc">{chart.description || "No description"}</p>
      <div className="chart-preview">
        <ChartRenderer chart={chart} height={160} />
      </div>
      <div className="chart-card-footer">
        <span className="chart-creator">
          {chart.creator?.slice(0,6)}…{chart.creator?.slice(-4)}
        </span>
        <Link
          to={`/charts/${chart.chartId}`}
          className="btn btn-secondary btn-xs"
          onClick={(e) => e.stopPropagation()}
        >
          View →
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { csContract, uacContract, isConnected, account, userRole } = useBlockchain();
  const [charts,     setCharts]   = useState([]);
  const [stats,      setStats]    = useState({ charts: 0, transactions: 0, users: 0 });
  const [isLoading,  setLoading]  = useState(true);
  const [error,      setError]    = useState("");
  const [filter,     setFilter]   = useState("all");

  if (!isConnected) return <Navigate to="/" replace />;

  const loadDashboard = useCallback(async () => {
    if (!csContract || !uacContract) return;
    setLoading(true);
    setError("");
    try {
      const ids = await csContract.getAllChartIds();
      const loaded = await Promise.all(
        ids.map((id) => csContract.getChart(id))
      );
      setCharts(loaded.map((c) => ({
        chartId:     Number(c.chartId),
        title:       c.title,
        chartType:   c.chartType,
        labelsJSON:  c.labelsJSON,
        datasetsJSON:c.datasetsJSON,
        description: c.description,
        creator:     c.creator,
        createdAt:   c.createdAt,
        lastModified:c.lastModified,
        isActive:    c.isActive,
      })));

      const totalCharts = await csContract.getChartCount();
      const totalTx     = await csContract.getTotalTransactions();
      const totalUsers  = await uacContract.getUserCount();
      setStats({
        charts:       Number(totalCharts),
        transactions: Number(totalTx),
        users:        Number(totalUsers),
      });
    } catch (err) {
      setError("Failed to load charts: " + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  }, [csContract, uacContract]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const filtered = filter === "all"
    ? charts
    : charts.filter((c) => c.chartType === filter);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Blockchain-secured chart visualisation platform</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-secondary" onClick={loadDashboard}>↻ Refresh</button>
          {userRole >= ROLE.Editor && (
            <Link to="/charts/create" className="btn btn-primary">+ New Chart</Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard label="Total Charts"       value={stats.charts}       icon="📊" colour="var(--blue)"   />
        <StatCard label="Blockchain Tx"      value={stats.transactions}  icon="⛓️"  colour="var(--purple)" />
        <StatCard label="Registered Users"   value={stats.users}         icon="👥" colour="var(--green)"  />
        <StatCard label="Your Role"          value={ROLE_LABEL[userRole]} icon="🔐" colour="var(--amber)"  />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filter */}
      <div className="chart-filters">
        {["all","bar","line","pie","scatter"].map((t) => (
          <button
            key={t}
            className={`filter-btn ${filter === t ? "active" : ""}`}
            onClick={() => setFilter(t)}
          >
            {t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Charts grid */}
      {isLoading ? (
        <div className="loading-spinner"><div className="spinner"></div> Loading charts from blockchain…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h3>No Charts Found</h3>
          <p>
            {userRole >= ROLE.Editor
              ? "Create your first blockchain-secured chart to get started."
              : "No charts are available yet."}
          </p>
          {userRole >= ROLE.Editor && (
            <Link to="/charts/create" className="btn btn-primary" style={{ marginTop: 16 }}>
              + Create First Chart
            </Link>
          )}
        </div>
      ) : (
        <div className="charts-grid">
          {filtered.map((chart) => (
            <ChartCard key={chart.chartId} chart={chart} onSelect={() => {}} />
          ))}
        </div>
      )}

      <div className="blockchain-footer">
        <span className="chain-dot-green"></span>
        Connected to Hardhat Local · Chain ID 31337 ·{" "}
        {account?.slice(0,6)}…{account?.slice(-4)}
      </div>
    </div>
  );
}
