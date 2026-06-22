import React, { useState, useEffect, useCallback, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useBlockchain, ROLE } from "../context/BlockchainContext";
import "./ChatPage.css";

function formatTime(ts) {
  return new Date(Number(ts) * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDate(ts) {
  return new Date(Number(ts) * 1000).toLocaleDateString();
}
function truncAddr(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";
}

function MessageBubble({ msg, isMine, onEdit, onRetract, showEditHistory, roomMembers, usernames }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const senderName = usernames[msg.sender] || truncAddr(msg.sender);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className={`msg-wrapper ${isMine ? "mine" : "theirs"}`}>
      {!isMine && <div className="msg-sender-name">{senderName}</div>}
      <div className={`msg-bubble ${msg.isRetracted ? "retracted" : ""} ${isMine ? "mine" : "theirs"}`}>
        <div className="msg-content">{msg.content}</div>
        <div className="msg-meta">
          {msg.editCount > 0 && !msg.isRetracted && (
            <span
              className="msg-edited"
              onClick={() => showEditHistory(msg)}
              title="View edit history"
            >
              edited
            </span>
          )}
          <span className="msg-time">{formatTime(msg.sentAt)}</span>
          {(isMine || msg.isRetracted) && (
            <span className="msg-options" ref={menuRef}>
              {!msg.isRetracted && isMine && (
                <button className="msg-menu-btn" onClick={() => setShowMenu(!showMenu)}>⋯</button>
              )}
              {showMenu && (
                <div className="msg-menu">
                  <button onClick={() => { setShowMenu(false); onEdit(msg); }}>Edit</button>
                  <button className="danger" onClick={() => { setShowMenu(false); onRetract(msg); }}>Retract</button>
                </div>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EditHistoryModal({ msg, versions, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit History</h3>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="history-version current">
            <span className="version-label">Current</span>
            <p>{msg.content}</p>
          </div>
          {[...versions].reverse().map((v, i) => (
            <div key={i} className="history-version">
              <span className="version-label">Version {versions.length - i}</span>
              <span className="version-time">{formatTime(v.editedAt)} · {formatDate(v.editedAt)}</span>
              <p>{v.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { crContract, uacContract, isConnected, account, userRole } = useBlockchain();
  const navigate = useNavigate();

  const [rooms,         setRooms]         = useState([]);
  const [activeRoom,    setActiveRoom]     = useState(null);
  const [messages,      setMessages]       = useState([]);
  const [usernames,     setUsernames]      = useState({});
  const [input,         setInput]          = useState("");
  const [sending,       setSending]        = useState(false);
  const [loadingMsgs,   setLoadingMsgs]    = useState(false);
  const [loadingRooms,  setLoadingRooms]   = useState(true);
  const [error,         setError]          = useState("");
  const [editTarget,    setEditTarget]     = useState(null); // { msg, index }
  const [editInput,     setEditInput]      = useState("");
  const [historyTarget, setHistoryTarget]  = useState(null);
  const [historyVersions, setHistoryVersions] = useState([]);
  const [roomMembers,   setRoomMembers]    = useState([]);
  const [isMember,      setIsMember]       = useState(false);
  const messagesEndRef = useRef(null);

  if (!isConnected) return <Navigate to="/" replace />;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadRooms = useCallback(async () => {
    if (!crContract) return;
    setLoadingRooms(true);
    try {
      const raw = await crContract.getAllRooms();
      setRooms(raw.map((r) => ({
        roomId:      Number(r.roomId),
        name:        r.name,
        description: r.description,
        creator:     r.creator,
        createdAt:   r.createdAt,
        isPrivate:   r.isPrivate,
        isActive:    r.isActive,
      })));
    } catch (err) {
      setError("Failed to load rooms: " + (err.reason || err.message));
    } finally {
      setLoadingRooms(false);
    }
  }, [crContract]);

  const loadUsernames = useCallback(async (addresses) => {
    if (!uacContract) return;
    const map = { ...usernames };
    const unique = addresses.filter((a) => a && !map[a]);
    for (const addr of unique) {
      try {
        const profile = await uacContract.getProfile(addr);
        if (profile.username) map[addr] = profile.username;
      } catch {}
    }
    setUsernames(map);
  }, [uacContract, usernames]);

  const loadMessages = useCallback(async (room) => {
    if (!crContract || !room) return;
    setLoadingMsgs(true);
    setError("");
    try {
      const memberCheck = await crContract.isMember(room.roomId, account);
      setIsMember(memberCheck);

      const members = await crContract.getRoomMembers(room.roomId);
      setRoomMembers(members);

      if (!room.isPrivate || memberCheck) {
        const raw = await crContract.getRoomMessages(room.roomId);
        const msgs = raw.map((m, i) => ({
          index:       i,
          msgId:       Number(m.msgId),
          roomId:      Number(m.roomId),
          sender:      m.sender,
          content:     m.content,
          sentAt:      m.sentAt,
          lastEditedAt:m.lastEditedAt,
          prevMsgHash: m.prevMsgHash,
          msgHash:     m.msgHash,
          isRetracted: m.isRetracted,
          editCount:   Number(m.editCount),
        }));
        setMessages(msgs);
        await loadUsernames(msgs.map((m) => m.sender));
      } else {
        setMessages([]);
      }
    } catch (err) {
      setError("Failed to load messages: " + (err.reason || err.message));
    } finally {
      setLoadingMsgs(false);
    }
  }, [crContract, account, loadUsernames]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  useEffect(() => {
    if (activeRoom) loadMessages(activeRoom);
    else { setMessages([]); setIsMember(false); setRoomMembers([]); }
  }, [activeRoom, loadMessages]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeRoom) return;
    setSending(true);
    setError("");
    try {
      const tx = await crContract.sendMessage(activeRoom.roomId, input.trim());
      await tx.wait();
      setInput("");
      await loadMessages(activeRoom);
    } catch (err) {
      setError(err.reason || err.message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  const handleJoin = async () => {
    if (!activeRoom) return;
    setError("");
    try {
      const tx = await crContract.joinRoom(activeRoom.roomId);
      await tx.wait();
      setIsMember(true);
      await loadMessages(activeRoom);
    } catch (err) {
      setError(err.reason || err.message || "Join failed");
    }
  };

  const handleEdit = (msg) => {
    setEditTarget(msg);
    setEditInput(msg.content);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editInput.trim() || editTarget === null) return;
    setError("");
    try {
      const tx = await crContract.editMessage(activeRoom.roomId, editTarget.index, editInput.trim());
      await tx.wait();
      setEditTarget(null);
      setEditInput("");
      await loadMessages(activeRoom);
    } catch (err) {
      setError(err.reason || err.message || "Edit failed");
    }
  };

  const handleRetract = async (msg) => {
    if (!window.confirm("Retract this message? This cannot be undone.")) return;
    setError("");
    try {
      const tx = await crContract.retractMessage(activeRoom.roomId, msg.index);
      await tx.wait();
      await loadMessages(activeRoom);
    } catch (err) {
      setError(err.reason || err.message || "Retract failed");
    }
  };

  const handleShowEditHistory = async (msg) => {
    setHistoryTarget(msg);
    try {
      const raw = await crContract.getMsgVersions(msg.msgId);
      setHistoryVersions(raw.map((v) => ({
        content:  v.content,
        editedAt: v.editedAt,
        editedBy: v.editedBy,
      })));
    } catch {
      setHistoryVersions([]);
    }
  };

  const activeRoomMsgCount = messages.length;

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <aside className="chat-sidebar">
        <div className="sidebar-header">
          <h2>Rooms</h2>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate("/rooms/create")}
          >
            + New
          </button>
        </div>

        {loadingRooms ? (
          <div className="sidebar-loading"><div className="spinner"></div></div>
        ) : rooms.length === 0 ? (
          <div className="sidebar-empty">No rooms yet</div>
        ) : (
          <ul className="room-list">
            {rooms.map((r) => (
              <li
                key={r.roomId}
                className={`room-item ${activeRoom?.roomId === r.roomId ? "active" : ""}`}
                onClick={() => setActiveRoom(r)}
              >
                <div className="room-avatar">{r.name[0].toUpperCase()}</div>
                <div className="room-info">
                  <div className="room-name">{r.name}</div>
                  <div className="room-desc">{r.description}</div>
                </div>
                {r.isPrivate && <span className="room-lock" title="Private room">🔒</span>}
              </li>
            ))}
          </ul>
        )}

        <div className="sidebar-footer">
          <button
            className="sidebar-audit-btn"
            onClick={() => navigate("/audit")}
          >
            ⛓️ View Audit Log
          </button>
          {userRole >= ROLE.Admin && (
            <button
              className="sidebar-admin-btn"
              onClick={() => navigate("/admin")}
            >
              Admin Panel
            </button>
          )}
        </div>
      </aside>

      {/* Main panel */}
      <div className="chat-main">
        {!activeRoom ? (
          <div className="chat-welcome">
            <div className="welcome-icon">💬</div>
            <h2>SecureChat</h2>
            <p>Select a room from the sidebar or create a new one to start chatting.</p>
            <p className="welcome-sub">Every message is secured with blockchain cryptography.</p>
          </div>
        ) : (
          <>
            {/* Room header */}
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="chat-room-avatar">{activeRoom.name[0].toUpperCase()}</div>
                <div>
                  <div className="chat-room-name">
                    {activeRoom.name}
                    {activeRoom.isPrivate && <span className="private-badge">Private</span>}
                  </div>
                  <div className="chat-room-meta">
                    {activeRoomMsgCount} message{activeRoomMsgCount !== 1 ? "s" : ""} · {roomMembers.length} member{roomMembers.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              <div className="chat-header-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/audit/${activeRoom.roomId}`)}
                  title="View hash chain for this room"
                >
                  ⛓️ Audit
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => loadMessages(activeRoom)}
                >
                  ↻
                </button>
              </div>
            </div>

            {error && <div className="chat-error">{error}</div>}

            {/* Messages */}
            <div className="messages-area">
              {loadingMsgs ? (
                <div className="loading-spinner"><div className="spinner"></div>Loading messages…</div>
              ) : !isMember && activeRoom.isPrivate ? (
                <div className="private-notice">
                  <div className="private-icon">🔒</div>
                  <p>This is a private room. You need to be added by the room creator or an admin.</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">💬</div>
                  <h3>No messages yet</h3>
                  <p>Be the first to send a message!</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.msgId}
                      msg={msg}
                      isMine={msg.sender.toLowerCase() === account?.toLowerCase()}
                      onEdit={handleEdit}
                      onRetract={handleRetract}
                      showEditHistory={handleShowEditHistory}
                      roomMembers={roomMembers}
                      usernames={usernames}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            {!isMember && !activeRoom.isPrivate ? (
              <div className="join-bar">
                <button className="btn btn-primary" onClick={handleJoin}>
                  Join Room to Chat
                </button>
              </div>
            ) : isMember ? (
              editTarget ? (
                <form className="edit-bar" onSubmit={handleEditSubmit}>
                  <span className="edit-label">Editing message</span>
                  <input
                    className="chat-input"
                    value={editInput}
                    onChange={(e) => setEditInput(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="btn btn-primary btn-sm">Save</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditTarget(null)}>Cancel</button>
                </form>
              ) : (
                <form className="input-bar" onSubmit={handleSend}>
                  <input
                    className="chat-input"
                    placeholder="Type a message…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={sending}
                    autoFocus
                  />
                  <button type="submit" className="btn btn-primary send-btn" disabled={sending || !input.trim()}>
                    {sending ? <span className="spinner"></span> : "Send"}
                  </button>
                </form>
              )
            ) : null}
          </>
        )}
      </div>

      {/* Edit history modal */}
      {historyTarget && (
        <EditHistoryModal
          msg={historyTarget}
          versions={historyVersions}
          onClose={() => { setHistoryTarget(null); setHistoryVersions([]); }}
        />
      )}
    </div>
  );
}
