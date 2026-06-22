# SecureChat — Blockchain-Secured Decentralised Messaging Application

> Final Year Project — Daniel Obinna Ikechi  
> Blockchain-Secured Secure Chat Application (Chapters 1–3 Implementation)

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
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Project Overview

**SecureChat** is a blockchain-secured, decentralised messaging application — similar in concept to WhatsApp or Telegram, but with every message stored as an immutable, cryptographically hash-linked record on the Ethereum blockchain. It implements the design specifications from Chapters 1–3 of the FYP document:

- **Objective 1**: User-friendly chat interface for sending, editing, and retracting messages in real time.
- **Objective 2**: Decentralised messaging platform integrating blockchain for tamper-proof message storage.
- **Objective 3**: Smart contracts to manage user permissions and enforce security policies automatically.
- **Objective 4**: Implemented in **JavaScript (React)** and **Solidity** as specified (§1.3 Objective 4).
- **Objective 5**: System tested through unit tests covering security, usability, and reliability.

Every message is recorded as an immutable, hash-linked block on the Ethereum blockchain. Previous messages are never overwritten — edits and retractions preserve the complete history. A built-in integrity verifier allows any user to cryptographically confirm the message chain has not been tampered with.

---

## 2. System Architecture

The system follows the **three-layer architecture** defined in §3.3.1:

```
┌──────────────────────────────────────────────────────────────────┐
│  Layer 1 – User Interface Layer (React)                          │
│  ChatPage · CreateRoomPage · AuditPage · AdminPage · LoginPage   │
└────────────────────────┬─────────────────────────────────────────┘
                         │ ethers.js (JSON-RPC via MetaMask)
┌────────────────────────▼─────────────────────────────────────────┐
│  Layer 2 – Application Logic Layer                               │
│  BlockchainContext · Role Validation · Contract Event Handling   │
└────────────────────────┬─────────────────────────────────────────┘
                         │ Solidity Contract Calls
┌────────────────────────▼─────────────────────────────────────────┐
│  Layer 3 – Blockchain Layer (Hardhat / Ethereum)                 │
│  UserAccessControl.sol · ChatRoom.sol                            │
│  Hash-Linked Message Chain · Immutable Audit Trail               │
└──────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Implementation |
|-----------|----------------|
| User Interface | React 18 + React Router v6 |
| Authentication & Access Control | `UserAccessControl.sol` + MetaMask wallet identity |
| Messaging Engine | `ChatRoom.sol` — on-chain rooms and messages |
| Blockchain Ledger | `ChatRoom.sol` on Hardhat local Ethereum network |
| Blockchain Client | ethers.js v6 (direct contract calls — no separate HTTP API needed) |

---

## 3. Tool Stack & Rationale

### Frontend — React (JavaScript)

**Specified in §1.3 Objective 4**: "Implement the system using Javascript (React)."

React was chosen because:
- **Component-based modularity** directly aligns with Object-Oriented Analysis and Design Methodology (OOADM) — each UI element maps to a class in the class diagram (§3.6.5).
- **Hooks + Context API** implement the role-based access model (Admin/Editor/Viewer) cleanly across the entire component tree without a separate state library.
- **React Router v6** provides client-side routing that matches the multi-page chat application structure (chat view, room creation, audit log, admin panel).
- **Vite** build tool provides near-instant hot-module reloading for rapid development iteration.

### Blockchain Layer — Solidity + Hardhat

**Specified in §1.3 Objective 4**: "Solidity programming language."

Solidity was chosen because:
- It is the primary language for Ethereum smart contracts, directly implementing the blockchain layer from §3.3.1.
- **Smart contracts enforce all access control on-chain** — role restrictions, message ownership, and hash generation cannot be bypassed from the frontend.
- **Hardhat** provides a deterministic local Ethereum network (Chain ID 31337) with 20 pre-funded test accounts, enabling full end-to-end testing without a public testnet.

### Blockchain Client — ethers.js v6

- Industry-standard library for browser↔Ethereum communication via MetaMask.
- Eliminates the need for a separate backend server — the React app communicates directly with smart contracts.
- Lightweight, tree-shakable, and fully compatible with the ES Module builds used by Vite.

### Wallet Identity — MetaMask

- Users are identified by their Ethereum wallet address (no passwords, no accounts database).
- MetaMask handles key management and transaction signing securely within the browser.
- Wallet address = immutable, blockchain-verified identity.

---

## 4. System Requirements

### Hardware

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | Dual-core 2 GHz | Quad-core 2.5 GHz+ |
| RAM | 4 GB | 8 GB+ |
| Storage | 2 GB free | 5 GB free |

### Software

| Software | Version | Notes |
|----------|---------|-------|
| Node.js  | 18.0 LTS+ | https://nodejs.org |
| npm      | 9.0+ | Included with Node.js |
| Git      | 2.x | https://git-scm.com |
| MetaMask | Latest | Browser extension — https://metamask.io |
| Chrome / Firefox / Brave | Latest | Any modern browser |

### Operating System

Windows 10/11, macOS 12+, or Ubuntu 20.04+ are all supported.

---

## 5. Project Structure

```
Secure-Chat-App/
├── blockchain/                          # Hardhat project (Solidity)
│   ├── contracts/
│   │   ├── UserAccessControl.sol        # User registration + RBAC
│   │   └── ChatRoom.sol                 # Rooms, messages, hash chain
│   ├── scripts/
│   │   └── deploy.js                    # Deploy + seed data + export ABIs
│   ├── test/
│   │   └── ChartStorage.test.js         # Mocha/Chai unit tests (20 tests)
│   ├── hardhat.config.js
│   └── package.json
│
├── frontend/                            # React application (Vite)
│   ├── src/
│   │   ├── context/
│   │   │   └── BlockchainContext.jsx    # Wallet connection + contract state
│   │   ├── components/
│   │   │   └── Navbar.jsx               # Navigation bar + wallet info
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx            # MetaMask connect + demo keys
│   │   │   ├── ChatPage.jsx             # Main WhatsApp-style chat interface
│   │   │   ├── CreateRoomPage.jsx       # Create public / private rooms
│   │   │   ├── AuditPage.jsx            # Blockchain message hash explorer
│   │   │   └── AdminPage.jsx            # User management (Admin only)
│   │   ├── contracts/
│   │   │   └── contracts.json           # Auto-generated by deploy.js
│   │   ├── styles/global.css            # CSS variables + utilities
│   │   ├── App.jsx                      # Route definitions
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── package.json                         # Root convenience scripts
└── README.md
```

---

## 6. Setup & Installation

### Step 1 — Clone the repository

```bash
git clone https://github.com/hybridthegamer/secure-chat-app.git
cd secure-chat-app
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

You need **three terminal windows** open simultaneously.

### Terminal 1 — Start the Local Blockchain

```bash
cd blockchain
npx hardhat node
```

Starts a local Ethereum node at `http://127.0.0.1:8545` with 10 pre-funded test accounts (10,000 ETH each). **Keep this terminal running.**

### Terminal 2 — Deploy Contracts and Seed Demo Data

```bash
cd blockchain
npm run deploy
```

This will:
1. Deploy `UserAccessControl.sol` and `ChatRoom.sol`
2. Register 4 demo users (Admin, 2 Editors, 1 Viewer)
3. Create 3 demo rooms (General, Tech Talk, Admin Private)
4. Seed demo messages in each room
5. Write contract addresses + ABIs to `frontend/src/contracts/contracts.json`

**The output includes private keys** you'll need to import into MetaMask.

### Terminal 3 — Start the React Frontend

```bash
cd frontend
npm run dev
```

App opens at **http://localhost:3000**.

---

### Configure MetaMask

**Step 1 — Add the Hardhat network:**

Open MetaMask → Settings → Networks → Add network manually:

```
Network Name:    Hardhat Local
RPC URL:         http://127.0.0.1:8545
Chain ID:        31337
Currency Symbol: ETH
```

**Step 2 — Import a demo account:**

Copy a private key from the `npm run deploy` output and import it into MetaMask (Account → Import Account → Private Key):

| Role | Label | Private Key |
|------|-------|-------------|
| Admin | deployer | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| Editor | Alice | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| Viewer | Bob | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| Editor | Carol | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |

**Step 3** — Visit `http://localhost:3000` and click **Connect MetaMask**.

> **Note**: After restarting the Hardhat node, go to MetaMask → Settings → Advanced → **Reset Account** to clear the nonce cache, then re-run `npm run deploy`.

---

## 8. User Roles & Permissions

All permissions are enforced by `UserAccessControl.sol` — they cannot be bypassed from the frontend.

| Action | Viewer | Editor | Admin |
|--------|:------:|:------:|:-----:|
| View public rooms | ✅ | ✅ | ✅ |
| Join public rooms | ✅ | ✅ | ✅ |
| Send messages | ✅ | ✅ | ✅ |
| Edit own messages | ✅ | ✅ | ✅ |
| Retract own messages | ✅ | ✅ | ✅ |
| Create rooms | ✅ | ✅ | ✅ |
| Add members to private rooms | Creator only | Creator only | ✅ |
| Retract any message | ❌ | ❌ | ✅ |
| Deactivate rooms | ❌ | ❌ | ✅ |
| Register new users | ❌ | ❌ | ✅ |
| Update user roles | ❌ | ❌ | ✅ |
| Activate / deactivate users | ❌ | ❌ | ✅ |
| View audit log | ✅ | ✅ | ✅ |
| Verify chain integrity | ✅ | ✅ | ✅ |

---

## 9. Smart Contract Reference

### UserAccessControl.sol

Manages user registration and role-based access.

```
Roles: None=0, Viewer=1, Editor=2, Admin=3

registerUser(address, username, role)   — Admin only
updateRole(address, newRole)            — Admin only
setUserActive(address, bool)            — Admin only
hasRole(address, minRole) → bool        — view
getProfile(address) → UserProfile       — view
getAllUsers() → UserProfile[]           — view
```

### ChatRoom.sol

Stores chat rooms and messages on-chain with a tamper-evident hash chain.

```
createRoom(name, description, isPrivate) → roomId
joinRoom(roomId)                          — public rooms only
addMember(roomId, address)                — creator or admin
sendMessage(roomId, content) → msgId
editMessage(roomId, msgIndex, newContent)
retractMessage(roomId, msgIndex)
verifyIntegrity(roomId) → (bool, string)
getRoomMessages(roomId) → Message[]
getMsgVersions(msgId) → MsgVersion[]
getAllRooms() → Room[]
```

### Message Hash Structure (§3.5, §3.6)

| Field | Description |
|-------|-------------|
| `msgId` | Auto-incrementing global message ID |
| `roomId` | Parent room reference |
| `sender` | Wallet address of the sender |
| `content` | Message text (or `[Message retracted]`) |
| `prevMsgHash` | Hash of previous message in room (0x00…00 for genesis) |
| `msgHash` | `keccak256(msgId + roomId + sender + content + timestamp + prevHash)` |
| `editCount` | Number of edits made |
| `isRetracted` | Soft-delete flag |

---

## 10. Algorithm Implementation

The system directly implements the algorithm from §3.6 of the specification:

| Step | Specification | Implementation |
|------|--------------|----------------|
| 1 | Start the system | Vite dev server + Hardhat local node |
| 2 | User Login/Authentication | MetaMask wallet connect + `hasRole()` check |
| 3 | Input Data | React message input bar in `ChatPage.jsx` |
| 4 | Validate Data | Solidity `require()` modifiers + role checks |
| 5 | Hash Data | `keccak256` in `ChatRoom.sol::sendMessage()` |
| 6 | Create Blockchain Transaction | `sendMessage()` / `editMessage()` / `retractMessage()` |
| 6a | Generate hash for new message | `keccak256(msgId + roomId + sender + content + ts + prevHash)` |
| 6b | Link to previous message hash | `prevMsgHash` field in `Message` struct |
| 6c | Record fields | `msgId, roomId, sender, content, sentAt, prevMsgHash, msgHash` |
| 7 | Store Message Data | `roomMessages[roomId]` mapping updated on-chain |
| 8 | Display Message | Message bubbles in `ChatPage.jsx` |
| 9 | Audit & Verify | `AuditPage.jsx` + `verifyIntegrity()` on-chain |
| 10 | End | User sees message with blockchain hash linkage |

---

## 11. Testing the System

### Automated Tests

```bash
cd blockchain
npx hardhat test
```

**20 tests** covering:

**UserAccessControl (5 tests):**
- Deployer is registered as Admin on deployment
- Admin can register an Editor
- `hasRole` returns false for unregistered address
- Non-admin cannot register users (access control)
- Admin can update roles and deactivate users

**ChatRoom (15 tests):**
- Registered user can create a public room
- Unregistered user cannot create a room
- User can join a public room and send messages
- Empty messages are rejected
- Hash chain is correctly linked (`prevMsgHash` = previous `msgHash`)
- `verifyIntegrity()` returns true for an unmodified chain
- Sender can edit their own message
- Edit history is preserved in `MsgVersion` records
- User cannot edit another user's message
- Sender can retract their own message
- Admin can retract any message
- Non-member cannot read private room messages
- Creator can add members to a private room
- `getTotalMessages()` increments correctly
- Admin can deactivate a room

### Manual Test Checklist

| Test | Steps | Expected |
|------|-------|---------|
| Connect as Admin | Import admin key → Connect MetaMask | Role shows "Admin" in navbar |
| View rooms | Navigate to /chat | 3 seeded rooms visible in sidebar |
| Send message | Select General room → type → Send | Message appears as bubble |
| Edit message | Click ⋯ on own message → Edit | Message updated, "edited" tag shown |
| View edit history | Click "edited" tag | Modal shows previous versions |
| Retract message | Click ⋯ → Retract | Bubble shows "[Message retracted]" |
| Create room | Click "+ New Room" | Room appears in sidebar |
| Private room | Create private room | Only members can read messages |
| View audit log | ⛓️ Audit button in chat header | Hash-linked message blocks shown |
| Verify integrity | Audit page → "Verify Integrity" | "Integrity verified — chain is intact" |
| Admin panel | /admin | Can register users and change roles |
| Viewer restrictions | Import viewer key | All features available (Viewers can chat) |

---

## 12. Troubleshooting

| Problem | Solution |
|---------|---------|
| "MetaMask not detected" | Install the MetaMask browser extension |
| "Wrong network" | Switch MetaMask to Hardhat Local (Chain ID 31337) |
| "Contracts not yet deployed" | Run `npm run deploy` in `blockchain/` with node running |
| "nonce too high" error in MetaMask | MetaMask → Settings → Advanced → Reset Account |
| Cannot read private room | You have not been added as a member |
| "CR: Registered active user required" | Your wallet address has not been registered by admin |
| Port 3000 already in use | Edit `frontend/vite.config.js`: set `port: 3001` |
| Compilation error on `npm run deploy` | Ensure `npx hardhat node` is running in a separate terminal |

---

## License

MIT — For academic use. Daniel Obinna Ikechi, 2025.
