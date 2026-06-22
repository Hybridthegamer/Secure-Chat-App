import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, Navigate } from "react-router-dom";
import { useBlockchain, ROLE } from "../context/BlockchainContext";
import ChartRenderer from "../components/ChartRenderer";
import "./ChartViewPage.css";

export default function ChartViewPage() {
  const { id } = useParams();
  const { csContract, isConnected, userRole } = useBlockchain();
  const navigate = useNavigate();

  const [chart,       setChart]     = useState(null);
  const [integrity,   setIntegrity] = useState(null);
  const [isLoading,   setLoading]   = useState(true);
  const [isVerifying, setVerifying] = useState(false);
  const [error,       setError]     = useState("");

  if (!isConnected) return <Navigate to="/" replace />;

  useEffect(() => {
    if (!csContract || !id) return;
    (async () => {
      setLoading(true);
      try {
        const c = await csContract.getChart(Number(id));
        setChart({
          chartId:      Number(c.chartId),
          title:        c.title,
          chartType:    c.chartType,
          labelsJSON:   c.labelsJSON,
          datasetsJSON: c.datasetsJSON,
          description:  c.description,
          creator:      c.creator,
          createdAt:    c.createdAt,
          lastModified: c.lastModified,
          isActive:     c.isActive,
        });
      } catch (err) {
        setError("Chart not found or access denied: " + (err.reason || err.message));
      } finally {
        setLoading(false);
      }
    })();
  }, [csContract, id]);

  const verifyIntegrity = async () => {
    setVerifying(true);
    try {
      const [valid, message] = await csContract.verifyIntegrity(Number(id));
      const latestHash = await csContract.getLatestHash(Number(id));
      setIntegrity({ valid, message, latestHash });
    } catch (err) {
      setIntegrity({ valid: false, message: err.reason || err.message });
    } finally {
      setVerifying(false);
    }
  };

  if (isLoading) return <div className="loading-spinner"><div className="spinner"></div>Loading chart…</div>;
  if (error)     return <div className="chart-view-page"><div className="alert alert-error">{error}</div></div>;
  if (!chart)    return null;

  return (
    <div className="chart-view-page">
      <div className="chart-view-header">
        <div className="header-left">
          <button className="btn btn-ghost" onClick={() => navigate("/dashboard")}>← Back</button>
          <div>
            <h1 className="page-title">{chart.title}</h1>
            <p className="page-subtitle">{chart.description || "No description provided"}</p>
          </div>
        </div>
        <div className="header-actions">
          <Link to={`/audit/${chart.chartId}`} className="btn btn-secondary">
            🔍 Audit Log
          </Link>
          {userRole >= ROLE.Editor && (
            <Link to={`/charts/${chart.chartId}/edit`} className="btn btn-primary">
              ✏️ Edit Chart
            </Link>
          )}
        </div>
      </div>

      <div className="chart-view-grid">
        {/* Chart visualization */}
        <div className="chart-main">
          <div className="chart-display-card">
            <ChartRenderer chart={chart} height={380} />
          </div>
        </div>

        {/* Metadata panel */}
        <div className="chart-meta-panel">
          <div className="meta-card">
            <h3>Chart Information</h3>
            <div className="meta-rows">
              <div className="meta-row">
                <span className="meta-key">Chart ID</span>
                <span className="meta-val">#{chart.chartId}</span>
              </div>
              <div className="meta-row">
                <span className="meta-key">Type</span>
                <span className="meta-val" style={{ textTransform: "capitalize" }}>{chart.chartType}</span>
              </div>
              <div className="meta-row">
                <span className="meta-key">Creator</span>
                <span className="meta-val hash-display" style={{ fontSize: 11 }}>
                  {chart.creator}
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-key">Created</span>
                <span className="meta-val">
                  {new Date(Number(chart.createdAt) * 1000).toLocaleString()}
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-key">Last Modified</span>
                <span className="meta-val">
                  {new Date(Number(chart.lastModified) * 1000).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Blockchain integrity */}
          <div className="meta-card">
            <h3>Blockchain Integrity</h3>
            <p className="meta-desc">
              Verify the hash chain for this chart to confirm no tampering has occurred.
            </p>
            <button
              className="btn btn-secondary"
              onClick={verifyIntegrity}
              disabled={isVerifying}
              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
            >
              {isVerifying
                ? <><span className="spinner"></span> Verifying…</>
                : "⛓️ Verify Integrity"}
            </button>

            {integrity && (
              <div className={`integrity-result ${integrity.valid ? "valid" : "invalid"}`}>
                <div className="integrity-icon">{integrity.valid ? "✅" : "❌"}</div>
                <div className="integrity-message">{integrity.message}</div>
                {integrity.latestHash && (
                  <div style={{ marginTop: 10 }}>
                    <div className="meta-key" style={{ marginBottom: 4 }}>Latest Block Hash</div>
                    <code className="hash-display">{integrity.latestHash}</code>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Raw data */}
          <div className="meta-card">
            <h3>Raw Data (Labels)</h3>
            <pre className="raw-data">{JSON.stringify(JSON.parse(chart.labelsJSON || "[]"), null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
