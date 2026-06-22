import React, { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useBlockchain, ROLE, ROLE_LABEL } from "../context/BlockchainContext";
import "./AdminPage.css";

const ROLE_OPTIONS = [
  { value: 1, label: "Viewer" },
  { value: 2, label: "Editor" },
  { value: 3, label: "Admin" },
];

function UserRow({ user, onUpdateRole, onToggleActive }) {
  const [newRole, setNewRole] = useState(Number(user.role));
  const [saving, setSaving] = useState(false);

  const handleRoleChange = async () => {
    setSaving(true);
    await onUpdateRole(user.userAddress, newRole);
    setSaving(false);
  };

  const date = new Date(Number(user.registeredAt) * 1000);

  return (
    <tr className={`user-row ${!user.isActive ? "inactive" : ""}`}>
      <td>
        <div className="user-name">{user.username || "—"}</div>
        <code className="user-address">{user.userAddress}</code>
      </td>
      <td>
        <span className={`badge badge-${ROLE_LABEL[Number(user.role)]?.toLowerCase()}`}>
          {ROLE_LABEL[Number(user.role)] || "None"}
        </span>
      </td>
      <td>
        <span className={`badge ${user.isActive ? "badge-green" : "badge-red"}`}>
          {user.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td>{date.toLocaleDateString()}</td>
      <td>
        <div className="user-actions">
          <select
            className="form-control role-select"
            value={newRole}
            onChange={(e) => setNewRole(Number(e.target.value))}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button
            className="btn btn-secondary btn-xs"
            onClick={handleRoleChange}
            disabled={saving || Number(user.role) === newRole}
          >
            {saving ? <span className="spinner"></span> : "Update"}
          </button>
          <button
            className={`btn btn-xs ${user.isActive ? "btn-danger" : "btn-success"}`}
            onClick={() => onToggleActive(user.userAddress, !user.isActive)}
          >
            {user.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminPage() {
  const { uacContract, isConnected, userRole, account } = useBlockchain();

  const [users,     setUsers]     = useState([]);
  const [isLoading, setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  // Register form
  const [regAddress,  setRegAddress]  = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regRole,     setRegRole]     = useState(1);
  const [registering, setRegistering] = useState(false);

  if (!isConnected) return <Navigate to="/" replace />;
  if (userRole < ROLE.Admin) return <Navigate to="/dashboard" replace />;

  const loadUsers = useCallback(async () => {
    if (!uacContract) return;
    setLoading(true);
    try {
      const all = await uacContract.getAllUsers();
      setUsers(all.map((u) => ({
        userAddress:  u.userAddress,
        username:     u.username,
        role:         Number(u.role),
        isActive:     u.isActive,
        registeredAt: u.registeredAt,
      })));
    } catch (err) {
      setError("Failed to load users: " + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  }, [uacContract]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const notify = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!regAddress || !regUsername) { setError("All fields are required."); return; }
    setRegistering(true);
    try {
      const tx = await uacContract.registerUser(regAddress, regUsername, regRole);
      await tx.wait();
      notify(`User ${regUsername} registered successfully.`);
      setRegAddress(""); setRegUsername(""); setRegRole(1);
      await loadUsers();
    } catch (err) {
      setError(err.reason || err.message || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const handleUpdateRole = async (address, newRole) => {
    setError("");
    try {
      const tx = await uacContract.updateRole(address, newRole);
      await tx.wait();
      notify(`Role updated for ${address.slice(0,10)}…`);
      await loadUsers();
    } catch (err) {
      setError(err.reason || err.message || "Update failed");
    }
  };

  const handleToggleActive = async (address, active) => {
    setError("");
    try {
      const tx = await uacContract.setUserActive(address, active);
      await tx.wait();
      notify(`User ${active ? "activated" : "deactivated"} successfully.`);
      await loadUsers();
    } catch (err) {
      setError(err.reason || err.message || "Status update failed");
    }
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage roles and access control for registered users</p>
        </div>
        <button className="btn btn-secondary" onClick={loadUsers}>↻ Refresh</button>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Register new user */}
      <div className="card register-card">
        <h3>Register New User</h3>
        <form onSubmit={handleRegister} className="register-form">
          <div className="form-group">
            <label>Wallet Address</label>
            <input
              className="form-control"
              placeholder="0x…"
              value={regAddress}
              onChange={(e) => setRegAddress(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Display Name</label>
            <input
              className="form-control"
              placeholder="e.g. Alice Smith"
              value={regUsername}
              onChange={(e) => setRegUsername(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select
              className="form-control"
              value={regRole}
              onChange={(e) => setRegRole(Number(e.target.value))}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={registering}>
            {registering ? <><span className="spinner"></span> Registering…</> : "+ Register User"}
          </button>
        </form>
      </div>

      {/* User table */}
      <div className="card users-card">
        <h3>Registered Users ({users.length})</h3>
        {isLoading ? (
          <div className="loading-spinner"><div className="spinner"></div>Loading…</div>
        ) : (
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <UserRow
                    key={u.userAddress}
                    user={u}
                    onUpdateRole={handleUpdateRole}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-info">
        <div className="info-chip">⛓️ All role changes are recorded on blockchain</div>
        <div className="info-chip">🔒 Smart contract enforces access control on every operation</div>
      </div>
    </div>
  );
}
