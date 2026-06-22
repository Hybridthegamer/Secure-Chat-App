import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useBlockchain, ROLE } from "../context/BlockchainContext";
import "./CreateRoomPage.css";

export default function CreateRoomPage() {
  const { crContract, isConnected, userRole } = useBlockchain();
  const navigate = useNavigate();

  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate,   setIsPrivate]   = useState(false);
  const [creating,    setCreating]    = useState(false);
  const [error,       setError]       = useState("");

  if (!isConnected) return <Navigate to="/" replace />;
  if (userRole < ROLE.Viewer) return <Navigate to="/chat" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Room name is required."); return; }
    setCreating(true);
    setError("");
    try {
      const tx = await crContract.createRoom(name.trim(), description.trim(), isPrivate);
      await tx.wait();
      navigate("/chat");
    } catch (err) {
      setError(err.reason || err.message || "Failed to create room");
      setCreating(false);
    }
  };

  return (
    <div className="create-room-page">
      <div className="create-room-card card">
        <div className="create-room-header">
          <button className="btn btn-ghost" onClick={() => navigate("/chat")}>← Back</button>
          <h1 className="page-title">Create Room</h1>
          <p className="page-subtitle">New chat rooms are recorded on the blockchain</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Room Name *</label>
            <input
              className="form-control"
              placeholder="e.g. General, Tech Talk, Project Alpha"
              value={name}
              maxLength={64}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              className="form-control"
              placeholder="Brief description of this room's purpose"
              value={description}
              maxLength={128}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="toggle-label">
              <div className="toggle-row">
                <div>
                  <div className="toggle-title">Private Room</div>
                  <div className="toggle-sub">Only invited members can read and send messages</div>
                </div>
                <div
                  className={`toggle-switch ${isPrivate ? "on" : ""}`}
                  onClick={() => setIsPrivate(!isPrivate)}
                >
                  <div className="toggle-knob"></div>
                </div>
              </div>
            </label>
          </div>

          <div className={`privacy-info ${isPrivate ? "private" : "public"}`}>
            {isPrivate ? (
              <>🔒 <strong>Private:</strong> Only members you invite can join and read messages.</>
            ) : (
              <>🌐 <strong>Public:</strong> Any registered user can join and participate.</>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/chat")}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={creating || !name.trim()}>
              {creating ? <><span className="spinner"></span> Creating…</> : "Create Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
