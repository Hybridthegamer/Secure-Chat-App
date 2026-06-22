import React from "react";
import { Navigate } from "react-router-dom";
import { useBlockchain } from "../context/BlockchainContext";
import "./LoginPage.css";

export default function LoginPage() {
  const { connect, isConnected, isLoading, error, isDeployed, contractData } = useBlockchain();

  if (isConnected) return <Navigate to="/chat" replace />;

  const accounts = contractData?.demoAccounts;

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-icon">⬡</div>
        <h1 className="login-title">SecureChat</h1>
        <p className="login-subtitle">
          Blockchain-Secured Decentralised Messaging Application
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <button
          className="btn btn-primary connect-btn"
          onClick={connect}
          disabled={isLoading}
        >
          {isLoading ? (
            <><span className="spinner"></span> Connecting…</>
          ) : (
            <><span>🦊</span> Connect MetaMask</>
          )}
        </button>

        <p className="login-note">
          Requires MetaMask connected to <strong>Hardhat Local</strong><br />
          (RPC: <code>http://127.0.0.1:8545</code> · Chain ID: <code>31337</code>)
        </p>
      </div>

      <div className="login-info">
        <div className="info-section">
          <h3>Why Blockchain Chat?</h3>
          <ul className="feature-list">
            <li><span className="feat-icon">⛓️</span> Every message recorded on Ethereum blockchain</li>
            <li><span className="feat-icon">🔒</span> Tamper-proof keccak256 hash-linked message chain</li>
            <li><span className="feat-icon">👥</span> Role-based access: Admin / Editor / Viewer</li>
            <li><span className="feat-icon">🏠</span> Public and private chat rooms</li>
            <li><span className="feat-icon">✅</span> One-click cryptographic integrity verification</li>
            <li><span className="feat-icon">📜</span> Full immutable edit and retraction history</li>
          </ul>
        </div>

        {accounts && (
          <div className="info-section">
            <h3>Demo Accounts (Hardhat Test Keys)</h3>
            <p className="demo-note">Import these private keys into MetaMask to test different roles:</p>
            <div className="demo-accounts">
              {Object.values(accounts).map((acc, i) => (
                <div key={i} className="demo-account-row">
                  <span className={`badge badge-${acc.role.toLowerCase()}`}>{acc.role}</span>
                  <span className="demo-label">{acc.label}</span>
                  <code className="demo-address">{acc.address.slice(0, 10)}…</code>
                </div>
              ))}
            </div>
            <p className="demo-note" style={{ marginTop: 8 }}>
              Full private keys printed when running <code>npm run deploy</code>.
            </p>
          </div>
        )}

        <div className="info-section">
          <h3>Quick Start</h3>
          <ol className="quick-start">
            <li>Run <code>npx hardhat node</code> in <code>blockchain/</code></li>
            <li>Run <code>npm run deploy</code> in <code>blockchain/</code></li>
            <li>Add Hardhat network to MetaMask (RPC above)</li>
            <li>Import a demo account private key</li>
            <li>Click <strong>Connect MetaMask</strong> above</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
