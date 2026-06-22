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
    expect(profile.role).to.equal(3); // Admin
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
    await uac.updateRole(editor.address, 1); // downgrade to Viewer
    expect((await uac.getProfile(editor.address)).role).to.equal(1);

    await uac.setUserActive(editor.address, false);
    expect(await uac.isUserActive(editor.address)).to.be.false;
    expect(await uac.hasRole(editor.address, 1)).to.be.false;
  });
});

describe("ChartStorage", function () {
  let uac, cs, admin, editor, viewer;

  const LABELS   = JSON.stringify(["Jan","Feb","Mar"]);
  const DATASETS = JSON.stringify([{ label: "Sales", data: [10, 20, 30] }]);

  beforeEach(async () => {
    [admin, editor, viewer] = await ethers.getSigners();

    const UAC = await ethers.getContractFactory("UserAccessControl");
    uac = await UAC.deploy();
    await uac.waitForDeployment();

    await uac.registerUser(editor.address, "Editor", 2);
    await uac.registerUser(viewer.address, "Viewer", 1);

    const CS = await ethers.getContractFactory("ChartStorage");
    cs = await CS.deploy(await uac.getAddress());
    await cs.waitForDeployment();
  });

  it("Editor can create a chart", async () => {
    const tx = await cs.connect(editor).createChart(
      "Test Chart", "bar", LABELS, DATASETS, "desc"
    );
    await tx.wait();
    expect(await cs.getChartCount()).to.equal(1);
  });

  it("Viewer cannot create a chart", async () => {
    await expect(
      cs.connect(viewer).createChart("X", "bar", LABELS, DATASETS, "d")
    ).to.be.revertedWith("CS: Editor or Admin required");
  });

  it("getChart returns correct data", async () => {
    await cs.connect(editor).createChart("Sales Chart", "line", LABELS, DATASETS, "monthly");
    const chart = await cs.connect(viewer).getChart(1);
    expect(chart.title).to.equal("Sales Chart");
    expect(chart.chartType).to.equal("line");
    expect(chart.creator).to.equal(editor.address);
    expect(chart.isActive).to.be.true;
  });

  it("Update appends new block without overwriting history", async () => {
    await cs.connect(editor).createChart("My Chart", "bar", LABELS, DATASETS, "d");

    const newDatasets = JSON.stringify([{ label: "Sales", data: [15, 25, 35] }]);
    await cs.connect(editor).updateChart(1, LABELS, newDatasets, "updated");

    const hist = await cs.connect(viewer).getChartHistory(1);
    expect(hist.length).to.equal(2);
    expect(hist[0].action).to.equal("CREATE");
    expect(hist[1].action).to.equal("UPDATE");
  });

  it("Hash chain is correctly linked", async () => {
    await cs.connect(editor).createChart("C", "bar", LABELS, DATASETS, "d");
    const newD = JSON.stringify([{ label: "Sales", data: [5, 10, 15] }]);
    await cs.connect(editor).updateChart(1, LABELS, newD, "v2");

    const hist = await cs.connect(viewer).getChartHistory(1);
    expect(hist[1].previousHash).to.equal(hist[0].blockHash);
  });

  it("verifyIntegrity returns true for unmodified chain", async () => {
    await cs.connect(editor).createChart("D", "pie", LABELS, DATASETS, "d");
    const [valid, msg] = await cs.verifyIntegrity(1);
    expect(valid).to.be.true;
    expect(msg).to.include("verified");
  });

  it("unregistered user cannot read charts", async () => {
    const [,,,, stranger] = await ethers.getSigners();
    await cs.connect(editor).createChart("E", "bar", LABELS, DATASETS, "d");
    await expect(
      cs.connect(stranger).getChart(1)
    ).to.be.revertedWith("CS: Registered active user required");
  });

  it("Admin can deactivate a chart", async () => {
    await cs.connect(editor).createChart("F", "bar", LABELS, DATASETS, "d");
    await cs.connect(admin).deactivateChart(1);
    await expect(cs.connect(viewer).getChart(1)).to.be.revertedWith("CS: chart not found");
  });

  it("getTotalTransactions increments correctly", async () => {
    expect(await cs.getTotalTransactions()).to.equal(0);
    await cs.connect(editor).createChart("G", "bar", LABELS, DATASETS, "d");
    expect(await cs.getTotalTransactions()).to.equal(1);
    await cs.connect(editor).updateChart(1, LABELS, DATASETS, "v2");
    expect(await cs.getTotalTransactions()).to.equal(2);
  });
});
