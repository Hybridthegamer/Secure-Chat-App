import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useBlockchain } from "../context/BlockchainContext";
import "./AuditPage.css";

function truncHash(h) {
  if (!h) return "—";
  const s = h.startsWith("0x") ? h : "0x" + h;
  return `${s.slice(0, 10)}…${s.slice(-8)}`;
}
function truncAddr(addr) {
  return addr ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : "—";
}

function MsgBlock({ msg, index, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(Number(msg.sentAt) * 1000);
  const isGenesis = msg.prevMsgHash === "0x0000000000000000000000000000000000000000000000000000000000000000";

  return (
    <div className={`block-node ${isGenesis ? "genesis" : ""}`}>
      <div className="block-connector">
        <div className="block-circle">{index + 1}</div>
        {!isLast && <div className="block-line"></div>}
      </div>
      <div className="block-content" onClick={() => setExpanded(!expanded)}>
        <div className="block-header">
          <div className="block-action-row">
            <span className={`block-action ${isGenesis ? "create" : "update"}`}>
              {isGenesis ? "🔒 GENESIS MESSAGE" : "💬 MESSAGE"}
              {msg.isRetracted && " [RETRACTED]"}
              {msg.editCount > 0 && ` (edited ${msg.editCount}x)`}
            </span>
            <span className="block-tx-id">Msg #{Number(msg.msgId)}</span>
            <span className="block-time">{date.toLocaleString()}</span>
          </div>
          <div className="block-actor">
            <span className="meta-key">Sender:</span>
            <code className="actor-addr">{msg.sender}</code>
          </div>
        </div>

        <div className="block-hashes">
          <div className="hash-row">
            <span className="hash-label">Previous Hash</span>
            <code className="hash-val prev">
              {isGenesis ? "0x000…000 (genesis)" : truncHash(msg.prevMsgHash)}
            </code>
          </div>
          <div className="hash-arrow">↓ keccak256(msgId + roomId + sender + content + timestamp + prevHash)</div>
          <div className="hash-row current">
            <span className="hash-label">Message Hash</span>
            <code className="hash-val current">{truncHash(msg.msgHash)}</code>
          </div>
        </div>

        {expanded && (
          <div className="block-snapshot">
            <div className="snapshot-label">Message content stored in this block:</div>
            <pre className="snapshot-data">{msg.content}</pre>
            <div className="full-hashes">
              <div>
                <span className="meta-key">Full Previous Hash: </span>
                <code className="hash-display">{msg.prevMsgHash}</code>
              </div>
              <div>
                <span className="meta-key">Full Message Hash: </span>
                <code className="hash-display">{msg.msgHash}</code>
              </div>
            </div>
          </div>
        )}

        <button className="expand-btn">{expanded ? "▲ Collapse" : "▼ Show Full Details"}</button>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const { id } = useParams();
  const { crContract, isConnected } = useBlockchain();
  const navigate = useNavigate();

  const [roomName,   setRoomName]   = useState("");
  const [messages,   setMessages]   = useState([]);
  const [integrity,  setIntegrity]  = useState(null);
  const [isLoading,  setLoading]    = useState(true);
  const [isVerifying,setVerifying]  = useState(false);
  const [error,      setError]      = useState("");

  if (!isConnected) return <Navigate to="/" replace />;

  const roomId = id ? Number(id) : null;

  useEffect(() => {
    if (!crContract) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        if (roomId) {
          const room = await crContract.getRoom(roomId);
          setRoomName(room.name);
          const raw = await crContract.getRoomMessages(roomId);
          setMessages(raw.map((m) => ({
            msgId:       Number(m.msgId),
            roomId:      Number(m.roomId),
            sender:      m.sender,
            content:     m.content,
            sentAt:      m.sentAt,
            prevMsgHash: m.prevMsgHash,
            msgHash:     m.msgHash,
            isRetracted: m.isRetracted,
            editCount:   Number(m.editCount),
          })));
        } else {
          // Global audit: collect messages across all rooms
          const rooms = await crContract.getAllRooms();
          const allMsgs = [];
          for (const r of rooms) {
            try {
              const raw = await crContract.getRoomMessages(Number(r.roomId));
              for (const m of raw) {
                allMsgs.push({
                  msgId:       Number(m.msgId),
                  roomId:      Number(m.roomId),
                  sender:      m.sender,
                  content:     m.content,
                  sentAt:      m.sentAt,
                  prevMsgHash: m.prevMsgHash,
                  msgHash:     m.msgHash,
                  isRetracted: m.isRetracted,
                  editCount:   Number(m.editCount),
                });
              }
            } catch {
              // skip private rooms user isn't a member of
            }
          }
          allMsgs.sort((a, b) => Number(a.msgId) - Number(b.msgId));
          setMessages(allMsgs);
          setRoomName("All Accessible Rooms");
        }
      } catch (err) {
        setError("Failed to load audit log: " + (err.reason || err.message));
      } finally {
        setLoading(false);
      }
    })();
  }, [crContract, roomId]);

  const verifyIntegrity = async () => {
    if (!roomId) return;
    setVerifying(true);
    try {
      const [valid, message] = await crContract.verifyIntegrity(roomId);
      const latestHash = await crContract.getLatestHash(roomId);
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
            <button className="btn btn-ghost" onClick={() => navigate("/chat")}>← Back to Chat</button>
            {roomId && (
              <>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">Room #{roomId}</span>
              </>
            )}
          </div>
          <h1 className="page-title">
            {roomId ? `Audit Log — ${roomName}` : "Global Audit Log"}
          </h1>
          <p className="page-subtitle">
            Immutable blockchain message history · {messages.length} message{messages.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        {roomId && (
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
              Latest hash: <code className="hash-display">{integrity.latestHash}</code>
            </div>
          )}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {isLoading ? (
        <div className="loading-spinner"><div className="spinner"></div>Loading blockchain message history…</div>
      ) : messages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⛓️</div>
          <h3>No Messages Found</h3>
          <p>No blockchain records exist for this room yet.</p>
        </div>
      ) : (
        <div className="audit-chain">
          <div className="chain-legend">
            <span className="legend-item create">● Genesis Message</span>
            <span className="legend-item update">● Subsequent Message</span>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Each message hash includes the previous hash, forming a tamper-evident chain
            </span>
          </div>
          <div className="block-list">
            {messages.map((msg, i) => (
              <MsgBlock key={msg.msgId} msg={msg} index={i} isLast={i === messages.length - 1} />
            ))}
          </div>
          <div className="chain-end">
            <div className="chain-end-icon">🔒</div>
            <div className="chain-end-label">End of Chain — {messages.length} messages on-chain</div>
          </div>
        </div>
      )}
    </div>
  );
}
