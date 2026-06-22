import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useBlockchain } from "../context/BlockchainContext";
import "./AuditPage.css";

function truncHash(h) {
  if (!h) return "—";
  const s = h.startsWith("0x") ? h : "0x" + h;
  return `${s.slice(0, 10)}…${s.slice(-8)}`;
}

function BlockNode({ tx, index, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(Number(tx.blockTimestamp) * 1000);

  return (
    <div className={`block-node ${tx.action === "CREATE" ? "genesis" : ""}`}>
      <div className="block-connector">
        <div className="block-circle">{index + 1}</div>
        {!isLast && <div className="block-line"></div>}
      </div>
      <div className="block-content" onClick={() => setExpanded(!expanded)}>
        <div className="block-header">
          <div className="block-action-row">
            <span className={`block-action ${tx.action === "CREATE" ? "create" : "update"}`}>
              {tx.action === "CREATE" ? "🔒 GENESIS BLOCK" : "✏️ UPDATE BLOCK"}
            </span>
            <span className="block-tx-id">Tx #{Number(tx.txId)}</span>
            <span className="block-time">{date.toLocaleString()}</span>
          </div>
          <div className="block-actor">
            <span className="meta-key">Actor:</span>
            <code className="actor-addr">{tx.actor}</code>
          </div>
        </div>

        <div className="block-hashes">
          <div className="hash-row">
            <span className="hash-label">Previous Hash</span>
            <code className="hash-val prev">
              {tx.previousHash === "0x0000000000000000000000000000000000000000000000000000000000000000"
                ? "0x000…000 (genesis)"
                : truncHash(tx.previousHash)}
            </code>
          </div>
          <div className="hash-arrow">↓ keccak256(id + data + actor + timestamp + prevHash)</div>
          <div className="hash-row current">
            <span className="hash-label">Block Hash</span>
            <code className="hash-val current">{truncHash(tx.blockHash)}</code>
          </div>
        </div>

        {expanded && (
          <div className="block-snapshot">
            <div className="snapshot-label">Data Snapshot stored in this block:</div>
            <pre className="snapshot-data">
              {(() => {
                try { return JSON.stringify(JSON.parse(tx.dataSnapshot), null, 2); }
                catch { return tx.dataSnapshot; }
              })()}
            </pre>
            <div className="full-hashes">
              <div><span className="meta-key">Full Previous Hash: </span><code className="hash-display">{tx.previousHash}</code></div>
              <div><span className="meta-key">Full Block Hash: </span><code className="hash-display">{tx.blockHash}</code></div>
            </div>
          </div>
        )}

        <button className="expand-btn">{expanded ? "▲ Collapse" : "▼ Show Data Snapshot"}</button>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const { id } = useParams();
  const { csContract, isConnected } = useBlockchain();
  const navigate = useNavigate();

  const [chartTitle, setChartTitle] = useState("");
  const [history,    setHistory]    = useState([]);
  const [integrity,  setIntegrity]  = useState(null);
  const [isLoading,  setLoading]    = useState(true);
  const [isVerifying,setVerifying]  = useState(false);
  const [error,      setError]      = useState("");

  if (!isConnected) return <Navigate to="/" replace />;

  // Load a specific chart if id is provided; otherwise show all charts
  const targetId = id ? Number(id) : null;

  useEffect(() => {
    if (!csContract) return;
    (async () => {
      setLoading(true);
      try {
        if (targetId) {
          const c = await csContract.getChart(targetId);
          setChartTitle(c.title);
          const hist = await csContract.getChartHistory(targetId);
          setHistory(hist.map((t) => ({
            txId:          Number(t.txId),
            chartId:       Number(t.chartId),
            previousHash:  t.previousHash,
            blockHash:     t.blockHash,
            actor:         t.actor,
            blockTimestamp:t.blockTimestamp,
            action:        t.action,
            dataSnapshot:  t.dataSnapshot,
          })));
        } else {
          // Show combined audit log across all charts
          const ids = await csContract.getAllChartIds();
          const allTxs = [];
          for (const cid of ids) {
            const hist = await csContract.getChartHistory(cid);
            for (const t of hist) {
              allTxs.push({
                txId:          Number(t.txId),
                chartId:       Number(t.chartId),
                previousHash:  t.previousHash,
                blockHash:     t.blockHash,
                actor:         t.actor,
                blockTimestamp:t.blockTimestamp,
                action:        t.action,
                dataSnapshot:  t.dataSnapshot,
              });
            }
          }
          allTxs.sort((a, b) => Number(a.txId) - Number(b.txId));
          setHistory(allTxs);
          setChartTitle("All Charts");
        }
      } catch (err) {
        setError("Failed to load audit log: " + (err.reason || err.message));
      } finally {
        setLoading(false);
      }
    })();
  }, [csContract, targetId]);

  const verifyIntegrity = async () => {
    if (!targetId) return;
    setVerifying(true);
    try {
      const [valid, message] = await csContract.verifyIntegrity(targetId);
      const latestHash = await csContract.getLatestHash(targetId);
      setIntegrity({ valid, message, latestHash });
    } catch (err) {
      setIntegrity({ valid: false, message: err.reason || err.message });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="audit-page">
      <div className="audit-header">
        <div>
          <div className="audit-breadcrumb">
            <button className="btn btn-ghost" onClick={() => navigate("/dashboard")}>← Dashboard</button>
            {targetId && (
              <>
                <span className="breadcrumb-sep">/</span>
                <button className="btn btn-ghost" onClick={() => navigate(`/charts/${targetId}`)}>
                  Chart #{targetId}
                </button>
              </>
            )}
          </div>
          <h1 className="page-title">
            {targetId ? `Audit Log — ${chartTitle}` : "Global Audit Log"}
          </h1>
          <p className="page-subtitle">
            Immutable blockchain transaction history · {history.length} block{history.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        {targetId && (
          <button className="btn btn-secondary" onClick={verifyIntegrity} disabled={isVerifying}>
            {isVerifying ? <><span className="spinner"></span> Verifying…</> : "⛓️ Verify Integrity"}
          </button>
        )}
      </div>

      {integrity && (
        <div className={`alert ${integrity.valid ? "alert-success" : "alert-error"}`} style={{ marginBottom: 24 }}>
          {integrity.valid ? "✅" : "❌"} {integrity.message}
          {integrity.latestHash && (
            <div style={{ marginTop: 6, fontSize: 12 }}>
              Latest block hash: <code className="hash-display">{integrity.latestHash}</code>
            </div>
          )}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {isLoading ? (
        <div className="loading-spinner"><div className="spinner"></div>Loading blockchain history…</div>
      ) : history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⛓️</div>
          <h3>No Transactions Found</h3>
          <p>No blockchain records exist for this chart yet.</p>
        </div>
      ) : (
        <div className="audit-chain">
          <div className="chain-legend">
            <span className="legend-item create">● Genesis Block</span>
            <span className="legend-item update">● Update Block</span>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Each block's hash includes the previous hash, creating a tamper-evident chain
            </span>
          </div>
          <div className="block-list">
            {history.map((tx, i) => (
              <BlockNode key={tx.txId} tx={tx} index={i} isLast={i === history.length - 1} />
            ))}
          </div>
          <div className="chain-end">
            <div className="chain-end-icon">🔒</div>
            <div className="chain-end-label">End of Chain — {history.length} transactions recorded</div>
          </div>
        </div>
      )}
    </div>
  );
}
