/**
 * deploy.js
 * Deploys UserAccessControl and ChartStorage contracts, then writes
 * the addresses + ABIs to frontend/src/contracts/contracts.json
 * so the React app can import them without manual copying.
 */
const { ethers } = require("hardhat");
const fs   = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // ── 1. Deploy UserAccessControl ───────────────────────────────────────────
  console.log("\n1. Deploying UserAccessControl...");
  const UAC    = await ethers.getContractFactory("UserAccessControl");
  const uac    = await UAC.deploy();
  await uac.waitForDeployment();
  const uacAddr = await uac.getAddress();
  console.log("   UserAccessControl deployed to:", uacAddr);

  // ── 2. Deploy ChartStorage ────────────────────────────────────────────────
  console.log("\n2. Deploying ChartStorage...");
  const CS   = await ethers.getContractFactory("ChartStorage");
  const cs   = await CS.deploy(uacAddr);
  await cs.waitForDeployment();
  const csAddr = await cs.getAddress();
  console.log("   ChartStorage deployed to:", csAddr);

  // ── 3. Register demo users ─────────────────────────────────────────────────
  const signers = await ethers.getSigners();
  console.log("\n3. Registering demo users...");

  // Account[1] = Editor
  await uac.registerUser(signers[1].address, "Alice (Editor)", 2);
  console.log("   Editor registered:", signers[1].address);

  // Account[2] = Viewer
  await uac.registerUser(signers[2].address, "Bob (Viewer)", 1);
  console.log("   Viewer registered:", signers[2].address);

  // Account[3] = Second Editor
  await uac.registerUser(signers[3].address, "Carol (Editor)", 2);
  console.log("   Editor registered:", signers[3].address);

  // ── 4. Seed sample charts ─────────────────────────────────────────────────
  const csAsAlice = cs.connect(signers[1]);

  console.log("\n4. Creating sample charts...");

  const labelsMonthly = JSON.stringify(["Jan","Feb","Mar","Apr","May","Jun"]);
  const barDatasets   = JSON.stringify([{
    label: "Monthly Revenue (£k)",
    data: [42, 58, 37, 65, 80, 72],
    backgroundColor: ["#2563eb","#7c3aed","#10b981","#f59e0b","#ef4444","#06b6d4"]
  }]);
  await csAsAlice.createChart(
    "Monthly Revenue Overview",
    "bar",
    labelsMonthly,
    barDatasets,
    "Monthly revenue figures for H1 – recorded and secured on blockchain"
  );
  console.log("   Created: Monthly Revenue Overview (bar)");

  const lineDatasets = JSON.stringify([
    {
      label: "System Uptime (%)",
      data: [99.1, 98.7, 99.5, 97.8, 99.9, 99.2],
      borderColor: "#10b981",
      backgroundColor: "rgba(16,185,129,0.15)",
      fill: true
    }
  ]);
  await csAsAlice.createChart(
    "System Uptime Trend",
    "line",
    labelsMonthly,
    lineDatasets,
    "Six-month uptime percentage trend secured with blockchain audit trail"
  );
  console.log("   Created: System Uptime Trend (line)");

  const pieDatasets = JSON.stringify([{
    label: "Resource Allocation",
    data: [35, 25, 20, 15, 5],
    backgroundColor: ["#2563eb","#7c3aed","#10b981","#f59e0b","#ef4444"]
  }]);
  const pieLabels = JSON.stringify(["Development","Operations","Security","Research","Misc"]);
  await csAsAlice.createChart(
    "Resource Allocation",
    "pie",
    pieLabels,
    pieDatasets,
    "Departmental resource distribution – verified on blockchain"
  );
  console.log("   Created: Resource Allocation (pie)");

  const scatterDatasets = JSON.stringify([{
    label: "Performance vs Load",
    data: Array.from({length: 12}, (_, i) => ({
      x: Math.round(10 + i * 8),
      y: Math.round(95 - i * 3 + (i % 3))
    })),
    backgroundColor: "#7c3aed"
  }]);
  const scatterLabels = JSON.stringify([]);
  await csAsAlice.createChart(
    "Performance vs Load Analysis",
    "scatter",
    scatterLabels,
    scatterDatasets,
    "Correlation between system load and response time"
  );
  console.log("   Created: Performance vs Load Analysis (scatter)");

  // ── 5. Write contract data to frontend ────────────────────────────────────
  console.log("\n5. Writing contract data to frontend...");

  const uacArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/UserAccessControl.sol/UserAccessControl.json")
    )
  );
  const csArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/ChartStorage.sol/ChartStorage.json")
    )
  );

  const output = {
    network: "localhost",
    chainId: 31337,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    demoAccounts: {
      admin:   { address: deployer.address,    role: "Admin",  label: "Admin Account"  },
      editor1: { address: signers[1].address,  role: "Editor", label: "Alice (Editor)" },
      viewer:  { address: signers[2].address,  role: "Viewer", label: "Bob (Viewer)"   },
      editor2: { address: signers[3].address,  role: "Editor", label: "Carol (Editor)" }
    },
    contracts: {
      UserAccessControl: {
        address: uacAddr,
        abi: uacArtifact.abi
      },
      ChartStorage: {
        address: csAddr,
        abi: csArtifact.abi
      }
    }
  };

  const outPath = path.join(__dirname, "../../frontend/src/contracts/contracts.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log("   Written to:", outPath);

  console.log("\n✅ Deployment complete!\n");
  console.log("Demo account private keys (Hardhat test accounts):");
  console.log("  Account #0 (Admin):   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  console.log("  Account #1 (Editor):  0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
  console.log("  Account #2 (Viewer):  0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
  console.log("  Account #3 (Editor):  0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6");
  console.log("\nMetaMask Network: http://127.0.0.1:8545  |  Chain ID: 31337");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
