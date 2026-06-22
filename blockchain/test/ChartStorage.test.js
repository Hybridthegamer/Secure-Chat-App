const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UserAccessControl", function () {
  let uac, owner, editor, viewer, stranger;

  beforeEach(async () => {
    [owner, editor, viewer, stranger] = await ethers.getSigners();
    const UAC = await ethers.getContractFactory("UserAccessControl");
    uac = await UAC.deploy();
    await uac.waitForDeployment();
  });

  it("deployer is registered as Admin", async () => {
    const profile = await uac.getProfile(owner.address);
    expect(profile.role).to.equal(3);
    expect(profile.isActive).to.be.true;
  });

  it("Admin can register an Editor", async () => {
    await uac.registerUser(editor.address, "Alice", 2);
    const p = await uac.getProfile(editor.address);
    expect(p.role).to.equal(2);
    expect(p.username).to.equal("Alice");
  });

  it("hasRole returns false for unregistered address", async () => {
    expect(await uac.hasRole(stranger.address, 1)).to.be.false;
  });

  it("non-admin cannot register users", async () => {
    await expect(
      uac.connect(editor).registerUser(viewer.address, "Bob", 1)
    ).to.be.revertedWith("UAC: Admin only");
  });

  it("Admin can update role and deactivate user", async () => {
    await uac.registerUser(editor.address, "Alice", 2);
    await uac.updateRole(editor.address, 1);
    expect((await uac.getProfile(editor.address)).role).to.equal(1);

    await uac.setUserActive(editor.address, false);
    expect(await uac.isUserActive(editor.address)).to.be.false;
    expect(await uac.hasRole(editor.address, 1)).to.be.false;
  });
});

describe("ChatRoom", function () {
  let uac, cr, admin, editor, viewer, stranger;

  beforeEach(async () => {
    [admin, editor, viewer, stranger] = await ethers.getSigners();

    const UAC = await ethers.getContractFactory("UserAccessControl");
    uac = await UAC.deploy();
    await uac.waitForDeployment();

    await uac.registerUser(editor.address,  "Alice",   2); // Editor
    await uac.registerUser(viewer.address,  "Bob",     1); // Viewer

    const CR = await ethers.getContractFactory("ChatRoom");
    cr = await CR.deploy(await uac.getAddress());
    await cr.waitForDeployment();
  });

  it("registered user can create a public room", async () => {
    await cr.connect(editor).createRoom("General", "Public chat", false);
    expect(await cr.getRoomCount()).to.equal(1);
  });

  it("unregistered user cannot create a room", async () => {
    await expect(
      cr.connect(stranger).createRoom("Hack", "No", false)
    ).to.be.revertedWith("CR: Registered active user required");
  });

  it("user can join a public room and send messages", async () => {
    await cr.connect(editor).createRoom("General", "Public", false);
    await cr.connect(viewer).joinRoom(1);
    await cr.connect(viewer).sendMessage(1, "Hello from viewer!");
    const msgs = await cr.connect(viewer).getRoomMessages(1);
    expect(msgs.length).to.equal(1);
    expect(msgs[0].content).to.equal("Hello from viewer!");
    expect(msgs[0].sender).to.equal(viewer.address);
  });

  it("empty message is rejected", async () => {
    await cr.connect(editor).createRoom("G", "D", false);
    await expect(
      cr.connect(editor).sendMessage(1, "")
    ).to.be.revertedWith("CR: empty message");
  });

  it("hash chain is correctly linked", async () => {
    await cr.connect(editor).createRoom("G", "D", false);
    await cr.connect(editor).sendMessage(1, "First");
    await cr.connect(editor).sendMessage(1, "Second");

    const msgs = await cr.connect(editor).getRoomMessages(1);
    expect(msgs[0].prevMsgHash).to.equal(ethers.ZeroHash);
    expect(msgs[1].prevMsgHash).to.equal(msgs[0].msgHash);
  });

  it("verifyIntegrity returns true for unmodified chain", async () => {
    await cr.connect(editor).createRoom("G", "D", false);
    await cr.connect(editor).sendMessage(1, "Msg1");
    await cr.connect(editor).sendMessage(1, "Msg2");
    const [valid, msg] = await cr.verifyIntegrity(1);
    expect(valid).to.be.true;
    expect(msg).to.include("verified");
  });

  it("sender can edit own message", async () => {
    await cr.connect(editor).createRoom("G", "D", false);
    await cr.connect(editor).sendMessage(1, "Original");
    await cr.connect(editor).editMessage(1, 0, "Edited");

    const msgs = await cr.connect(editor).getRoomMessages(1);
    expect(msgs[0].content).to.equal("Edited");
    expect(msgs[0].editCount).to.equal(1);
  });

  it("edit history is preserved in MsgVersions", async () => {
    await cr.connect(editor).createRoom("G", "D", false);
    const tx = await cr.connect(editor).sendMessage(1, "Original");
    await tx.wait();
    await cr.connect(editor).editMessage(1, 0, "Edited");

    const msgs    = await cr.connect(editor).getRoomMessages(1);
    const versions = await cr.connect(editor).getMsgVersions(msgs[0].msgId);
    expect(versions.length).to.equal(1);
    expect(versions[0].content).to.equal("Original");
  });

  it("user cannot edit another user's message", async () => {
    await cr.connect(editor).createRoom("G", "D", false);
    await cr.connect(viewer).joinRoom(1);
    await cr.connect(editor).sendMessage(1, "Alice's msg");
    await expect(
      cr.connect(viewer).editMessage(1, 0, "Hacked")
    ).to.be.revertedWith("CR: can only edit own messages");
  });

  it("sender can retract own message", async () => {
    await cr.connect(editor).createRoom("G", "D", false);
    await cr.connect(editor).sendMessage(1, "Delete me");
    await cr.connect(editor).retractMessage(1, 0);

    const msgs = await cr.connect(editor).getRoomMessages(1);
    expect(msgs[0].isRetracted).to.be.true;
    expect(msgs[0].content).to.equal("[Message retracted]");
  });

  it("admin can retract any message", async () => {
    await cr.connect(editor).createRoom("G", "D", false);
    await cr.connect(editor).sendMessage(1, "Alice msg");
    await cr.connect(admin).retractMessage(1, 0);

    const msgs = await cr.connect(editor).getRoomMessages(1);
    expect(msgs[0].isRetracted).to.be.true;
  });

  it("non-member cannot read private room messages", async () => {
    await cr.connect(editor).createRoom("Private", "D", true);
    await cr.connect(editor).sendMessage(1, "Secret");
    await expect(
      cr.connect(viewer).getRoomMessages(1)
    ).to.be.revertedWith("CR: not a room member");
  });

  it("creator can add member to private room", async () => {
    await cr.connect(editor).createRoom("Priv", "D", true);
    await cr.connect(editor).addMember(1, viewer.address);
    expect(await cr.isMember(1, viewer.address)).to.be.true;
  });

  it("getTotalMessages increments correctly", async () => {
    await cr.connect(editor).createRoom("G", "D", false);
    expect(await cr.getTotalMessages()).to.equal(0);
    await cr.connect(editor).sendMessage(1, "A");
    expect(await cr.getTotalMessages()).to.equal(1);
    await cr.connect(editor).sendMessage(1, "B");
    expect(await cr.getTotalMessages()).to.equal(2);
  });

  it("admin can deactivate a room", async () => {
    await cr.connect(editor).createRoom("ToDelete", "D", false);
    await cr.connect(admin).deactivateRoom(1);
    await expect(
      cr.connect(editor).sendMessage(1, "msg")
    ).to.be.revertedWith("CR: room not found");
  });
});
