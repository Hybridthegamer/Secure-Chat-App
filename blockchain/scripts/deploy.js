const { ethers } = require("hardhat");
const fs          = require("fs");
const path        = require("path");

async function main() {
  const signers = await ethers.getSigners();
  const [deployer, alice, bob, carol] = signers;
  console.log("Deploying with:", deployer.address);

  // ── 1. Deploy UserAccessControl ───────────────────────────────────────────
  const UAC = await ethers.getContractFactory("UserAccessControl");
  const uac = await UAC.deploy();
  await uac.waitForDeployment();
  const uacAddress = await uac.getAddress();
  console.log("UserAccessControl deployed:", uacAddress);

  // ── 2. Deploy ChatRoom ────────────────────────────────────────────────────
  const CR = await ethers.getContractFactory("ChatRoom");
  const cr = await CR.deploy(uacAddress);
  await cr.waitForDeployment();
  const crAddress = await cr.getAddress();
  console.log("ChatRoom deployed:", crAddress);

  // ── 3. Register demo users ────────────────────────────────────────────────
  // Role enum: 0=None, 1=Viewer, 2=Editor, 3=Admin
  await uac.connect(deployer).registerUser(alice.address, "Alice", 2);  // Editor
  await uac.connect(deployer).registerUser(bob.address,   "Bob",   1);  // Viewer
  await uac.connect(deployer).registerUser(carol.address, "Carol", 2);  // Editor
  console.log("Demo users registered.");

  // ── 4. Seed chat rooms ────────────────────────────────────────────────────
  await (await cr.connect(deployer).createRoom("General", "Public room for everyone", false)).wait();
  await (await cr.connect(alice).createRoom("Tech Talk", "Discuss blockchain and web3", false)).wait();
  await (await cr.connect(deployer).createRoom("Admin Private", "Private admin channel", true)).wait();

  // Add alice to private room
  await cr.connect(deployer).addMember(3, alice.address);
  // Bob joins General and Tech Talk (public)
  await cr.connect(bob).joinRoom(1);
  await cr.connect(bob).joinRoom(2);
  console.log("Demo rooms created.");

  // ── 5. Seed demo messages ─────────────────────────────────────────────────
  await cr.connect(alice).sendMessage(1, "Hello everyone! Welcome to the Secure Chat App.");
  await cr.connect(bob).sendMessage(1, "Thanks! Glad to be here. This is blockchain-secured.");
  await cr.connect(carol).sendMessage(1, "Hi all! The immutability here is fantastic.");
  await cr.connect(deployer).sendMessage(1, "Welcome. Every message is cryptographically hash-linked.");
  await cr.connect(alice).sendMessage(2, "Let's talk about Ethereum and Solidity smart contracts.");
  await cr.connect(carol).sendMessage(2, "I love how this app stores messages on-chain!");
  await cr.connect(deployer).sendMessage(3, "This is a private admin message.");
  await cr.connect(alice).sendMessage(3, "Only admins and approved members can see this.");
  console.log("Demo messages seeded.");

  // ── 6. Export contract addresses + ABIs to frontend ──────────────────────
  const uacArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/UserAccessControl.sol/UserAccessControl.json"),
      "utf8"
    )
  );
  const crArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/ChatRoom.sol/ChatRoom.json"),
      "utf8"
    )
  );

  const contractsOut = {
    network: "localhost",
    chainId: 31337,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    demoAccounts: {
      admin:   { address: deployer.address, role: "Admin",  label: "Admin (deployer)" },
      editor1: { address: alice.address,    role: "Editor", label: "Alice (Editor)"   },
      viewer:  { address: bob.address,      role: "Viewer", label: "Bob (Viewer)"     },
      editor2: { address: carol.address,    role: "Editor", label: "Carol (Editor)"   },
    },
    contracts: {
      UserAccessControl: { address: uacAddress, abi: uacArtifact.abi },
      ChatRoom:          { address: crAddress,  abi: crArtifact.abi  },
    },
  };

  const outPath = path.join(__dirname, "../../frontend/src/contracts/contracts.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(contractsOut, null, 2));
  console.log("contracts.json written to:", outPath);

  console.log("\n✅ Deployment complete!");
  console.log("\nDemo account private keys (Hardhat test accounts):");
  console.log("  #0 Admin:  0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  console.log("  #1 Editor: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
  console.log("  #2 Viewer: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
  console.log("  #3 Editor: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6");
  console.log("\nMetaMask: http://127.0.0.1:8545  |  Chain ID: 31337");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
