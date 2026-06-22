# SecureChart — Blockchain-Enabled Secure Data Visualisation Platform

> Final Year Project — Daniel Obinna Ikechi  
> Blockchain-Enabled Secure Chart Application (Chapters 1–3 Implementation)

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tool Stack & Rationale](#3-tool-stack--rationale)
4. [System Requirements](#4-system-requirements)
5. [Project Structure](#5-project-structure)
6. [Setup & Installation](#6-setup--installation)
7. [Running the Application](#7-running-the-application)
8. [User Roles & Permissions](#8-user-roles--permissions)
9. [Smart Contract Reference](#9-smart-contract-reference)
10. [Algorithm Implementation](#10-algorithm-implementation)
11. [Testing the System](#11-testing-the-system)

---

## 1. Project Overview

SecureChart is a **blockchain-enabled secure data visualisation platform** that guarantees the integrity, auditability, and immutability of chart data. It implements the design specifications from Chapters 1–3 of the FYP document:

- **Objective 1**: User-friendly interface for creating, modifying, and visualising charts in real time.
- **Objective 2**: Decentralised charting platform integrating blockchain for tamper-proof storage.
- **Objective 3**: Smart contracts to manage user permissions and enforce security policies automatically.
- **Objective 4**: Implemented in **JavaScript (React)** and **Solidity** as specified (§1.3).
- **Objective 5**: System tested through unit tests covering security, usability, and reliability.

Every chart operation (create / update) is recorded as an immutable, hash-linked **BlockTransaction** on the Ethereum blockchain. Previous data is never overwritten — each update appends a new block preserving the full history.

---

## 2. System Architecture

The system follows the **three-layer architecture** defined in §3.3.1:

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1 – User Interface Layer (React)                      │
│  Dashboard · Chart Creator · Chart Viewer · Audit Log · Admin│
└────────────────────────┬─────────────────────────────────────┘
                         │ ethers.js (JSON-RPC)
┌────────────────────────▼─────────────────────────────────────┐
│  Layer 2 – Application Logic Layer                           │
│  BlockchainContext · Role Validation · Data Serialisation    │
└────────────────────────┬─────────────────────────────────────┘
                         │ Solidity Contract Calls
┌────────────────────────▼─────────────────────────────────────┐
│  Layer 3 – Blockchain Layer (Hardhat / Ethereum)             │
│  UserAccessControl.sol · ChartStorage.sol                    │
│  Hash-Linked Block Transactions · Immutable Audit Trail      │
└──────────────────────────────────────────────────────────────┘
```

### Components (§3.3.2)

| Component | Implementation |
|-----------|---------------|
| User Interface | React 18 + React Router v6 |
| Authentication & Access Control Module | `UserAccessControl.sol` + MetaMask wallet |
| Chart Engine | Chart.js 4 + react-chartjs-2 |
| Blockchain Ledger | `ChartStorage.sol` on Hardhat local network |
| API Module | ethers.js v6 (direct contract calls, no HTTP API needed) |
| Data Input Module | Validated React forms with JSON parsing |

---

## 3. Tool Stack & Rationale

### Frontend — React (JavaScript)
**Specified in §1.3 Objective 4**: "Implement the system using Javascript (React)."

React was chosen because:
- **Component-based modularity** aligns with the Object-Oriented Analysis and Design Methodology (OOADM) — each UI element maps directly to a class in the class diagram (§3.6.5).
- **Virtual DOM** enables real-time chart updates without full page reloads, fulfilling the "real-time interactive visualisation" requirement.
- **Chart.js via `react-chartjs-2`** provides professional interactive charts (bar, line, pie, scatter) with minimal code.
- **React Context API** implements the role-based access model (Admin/Editor/Viewer) cleanly across the component tree without a separate state library.

### Blockchain — Solidity + Hardhat
**Specified in §1.3 Objective 4**: "Solidity programming language."

Solidity was chosen because:
- It is the primary language for Ethereum smart contracts, directly implementing the blockchain layer described in §3.3.1.
- **Smart contracts enforce business rules on-chain** — access control, hash generation, and data validation cannot be bypassed by frontend manipulation.
- **Hardhat** provides a local Ethereum development network with 20 test accounts, enabling full end-to-end testing without deploying to a public testnet or spending real ETH.

### Blockchain Interaction — ethers.js v6
- Industry-standard library for connecting a browser application to an Ethereum node via MetaMask.
- Lightweight and actively maintained.
- Eliminates the need for a separate backend server — the React app communicates directly with smart contracts.

### Chart Visualisation — Chart.js 4
- The most widely-used JavaScript charting library; supports all four chart types required (bar, line, pie, scatter).
- Responsive, animated, and accessible out of the box.
- Integrates natively with React via the `react-chartjs-2` wrapper.

### Build Tool — Vite
- Significantly faster than Create React App for development iteration.
- Native ESM support aligns with ethers.js v6's module structure.

---

## 4. System Requirements

### Hardware
| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | Dual-core 2 GHz | Quad-core 2.5 GHz+ |
| RAM | 4 GB | 8 GB+ |
| Storage | 2 GB free | 5 GB free |

### Software
| Software | Minimum Version | Notes |
|----------|-----------------|-------|
| Node.js  | 18.0.0 LTS | https://nodejs.org |
| npm      | 9.0.0 | Included with Node.js |
| Git      | 2.x | https://git-scm.com |
| MetaMask Browser Extension | Latest | https://metamask.io |
| Chrome / Firefox / Brave | Latest | Any modern browser |

### Operating System
Windows 10/11, macOS 12+, or Ubuntu 20.04+ are all supported.

---

## 5. Project Structure

```
Secure-Chart-App/
├── blockchain/                        # Hardhat project (Solidity)
│   ├── contracts/
│   │   ├── UserAccessControl.sol      # User roles & permissions
│   │   └── ChartStorage.sol           # Chart data + blockchain ledger
│   ├── scripts/
│   │   └── deploy.js                  # Deploy + seed + write ABIs to frontend
│   ├── test/
│   │   └── ChartStorage.test.js       # Mocha/Chai unit tests
│   ├── hardhat.config.js
│   └── package.json
│
├── frontend/                          # React application (Vite)
│   ├── src/
│   │   ├── context/
│   │   │   └── BlockchainContext.jsx  # Wallet + contract state
│   │   ├── components/
│   │   │   ├── Navbar.jsx             # Navigation + wallet status
│   │   │   └── ChartRenderer.jsx      # Chart.js wrapper
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx          # MetaMask connect
│   │   │   ├── DashboardPage.jsx      # Chart grid + statistics
│   │   │   ├── ChartCreatePage.jsx    # Create chart
│   │   │   ├── ChartViewPage.jsx      # View + verify integrity
│   │   │   ├── ChartEditPage.jsx      # Edit (appends block)
│   │   │   ├── AuditPage.jsx          # Blockchain audit trail
│   │   │   └── AdminPage.jsx          # User management
│   │   ├── contracts/
│   │   │   └── contracts.json         # Auto-generated by deploy.js
│   │   ├── styles/global.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── package.json                       # Root convenience scripts
└── README.md
```

---

## 6. Setup & Installation

### Step 1 — Clone the repository
```bash
git clone https://github.com/hybridthegamer/secure-chart-app.git
cd secure-chart-app
git checkout claude/fyp-system-implementation-0bhxqm
```

### Step 2 — Install dependencies
```bash
# Blockchain dependencies
cd blockchain
npm install

# Frontend dependencies
cd ../frontend
npm install
cd ..
```

---

## 7. Running the Application

You need **three terminal windows** open at the same time.

### Terminal 1 — Start the Local Blockchain
```bash
cd blockchain
npx hardhat node
```

Starts a local Ethereum node at `http://127.0.0.1:8545` with 20 pre-funded test accounts. Keep this running.

### Terminal 2 — Deploy Contracts & Seed Sample Data
```bash
cd blockchain
npm run deploy
```

This will:
1. Deploy `UserAccessControl.sol` and `ChartStorage.sol`
2. Register 4 demo users (Admin, 2 Editors, 1 Viewer)
3. Create 4 sample charts (bar, line, pie, scatter)
4. Write contract ABIs and addresses to `frontend/src/contracts/contracts.json`

**Output includes the private keys** you'll need for MetaMask.

### Terminal 3 — Start the React Frontend
```bash
cd frontend
npm run dev
```

App opens at **http://localhost:3000**.

### Configure MetaMask

1. Open MetaMask → **Networks → Add network manually**:
   ```
   Network Name:    Hardhat Local
   RPC URL:         http://127.0.0.1:8545
   Chain ID:        31337
   Currency Symbol: ETH
   ```

2. **Import a test account** — copy one of the private keys printed by `npm run deploy`:

   | Role   | Private Key |
   |--------|-------------|
   | Admin  | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
   | Editor (Alice) | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
   | Viewer (Bob)   | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |

3. Visit **http://localhost:3000** and click **Connect MetaMask**.

> **Note**: If you restart the Hardhat node, go to MetaMask → Settings → Advanced → **Reset Account** to clear the nonce cache, then re-run `npm run deploy`.

---

## 8. User Roles & Permissions

Enforced by `UserAccessControl.sol` — cannot be bypassed from the frontend.

| Action | Viewer | Editor | Admin |
|--------|:------:|:------:|:-----:|
| View charts | ✅ | ✅ | ✅ |
| View audit log | ✅ | ✅ | ✅ |
| Verify blockchain integrity | ✅ | ✅ | ✅ |
| Create chart | ❌ | ✅ | ✅ |
| Edit chart | ❌ | ✅ | ✅ |
| Deactivate chart | ❌ | ❌ | ✅ |
| Register new users | ❌ | ❌ | ✅ |
| Update user roles | ❌ | ❌ | ✅ |
| Activate / deactivate users | ❌ | ❌ | ✅ |

---

## 9. Smart Contract Reference

### UserAccessControl.sol

```
Roles: None=0, Viewer=1, Editor=2, Admin=3

registerUser(address, name, role)    — Admin only
updateRole(address, newRole)         — Admin only
setUserActive(address, bool)         — Admin only
hasRole(address, minRole) → bool     — view
getAllUsers() → UserProfile[]        — view
```

### ChartStorage.sol

```
createChart(title, type, labelsJSON, datasetsJSON, description) → chartId
updateChart(chartId, labelsJSON, datasetsJSON, description)
getChart(chartId) → ChartRecord
getChartHistory(chartId) → BlockTransaction[]
verifyIntegrity(chartId) → (bool, string)
getAllChartIds() → uint256[]
```

### BlockTransaction Structure (§3.5, §3.6)

| Field | Description |
|-------|-------------|
| `txId` | Auto-incrementing transaction ID |
| `chartId` | Parent chart reference |
| `previousHash` | Hash of the previous block (0x00…00 for genesis) |
| `blockHash` | `keccak256(chartId + data + actor + timestamp + prevHash)` |
| `actor` | Wallet address that made the change |
| `blockTimestamp` | Unix timestamp |
| `action` | "CREATE" or "UPDATE" |
| `dataSnapshot` | Full JSON of chart data at this point in time |

---

## 10. Algorithm Implementation

The system directly implements the algorithm from §3.6 of the specification:

| Step | Specification | Implementation |
|------|--------------|----------------|
| 1 | Start the system | Vite dev server + Hardhat node |
| 2 | User Login/Authentication | MetaMask wallet connect + `hasRole()` check |
| 3 | Input Data | React form in `ChartCreatePage.jsx` |
| 4 | Validate Data | JSON parsing + Solidity `require()` modifiers |
| 5 | Encrypt Data | `keccak256` hash in `ChartStorage.sol` |
| 6 | Create Blockchain Transaction | `createChart()` / `updateChart()` in contract |
| 6a | Generate hash for new data | `keccak256(id + snap + actor + timestamp + prevHash)` |
| 6b | Link to previous block hash | `previousHash` field in `BlockTransaction` |
| 6c | Record fields | `txId, chartId, previousHash, blockHash, actor, blockTimestamp` |
| 7 | Store Chart Data | `ChartRecord` mapping updated on-chain |
| 8 | Render Chart | `ChartRenderer.jsx` using Chart.js |
| 9 | Audit & Verify | `AuditPage.jsx` + `verifyIntegrity()` on-chain |
| 10 | End | User sees chart with blockchain hash |

---

## 11. Testing the System

### Automated Tests
```bash
cd blockchain
npx hardhat test
```

Test suite covers:
- Admin-only user registration
- Role-based access enforcement (Viewer cannot create charts)
- Chart creation by Editor
- Update appends new block without overwriting history
- Hash chain is correctly linked (`previousHash` = previous `blockHash`)
- `verifyIntegrity()` returns true for an unmodified chain
- Unregistered wallet cannot read charts
- Admin can deactivate a chart
- Transaction counter increments correctly

### Manual Test Checklist

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Connect as Admin | Import admin key, connect | Role shows "Admin" in navbar |
| View dashboard | Navigate to /dashboard | 4 seeded charts visible |
| Create chart (Editor) | Import editor key, click "+ New Chart" | New chart appears |
| Edit chart | Click chart → "Edit Chart", change data | Old block preserved, new block appended |
| View audit log | Chart page → "Audit Log" | Hash-linked blocks timeline shown |
| Verify integrity | Audit page → "Verify Integrity" | "Integrity verified — chain is intact" |
| Viewer restriction | Import viewer key | "+ New Chart" button not shown |
| Admin panel | Connect admin → /admin | Can register users and change roles |

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| "MetaMask not detected" | Install the MetaMask browser extension |
| "Wrong network" | Switch MetaMask to Hardhat Local (Chain ID 31337) |
| "Contracts not yet deployed" | Run `npm run deploy` in `blockchain/` with node running |
| "nonce too high" in MetaMask | MetaMask → Settings → Advanced → Reset Account |
| "Access denied: Editor required" | Import an Editor/Admin private key |
| Port 3000 already in use | Change `port: 3001` in `frontend/vite.config.js` |

---

## License

MIT — For academic use. Daniel Obinna Ikechi, 2025.
