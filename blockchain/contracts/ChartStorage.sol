// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./UserAccessControl.sol";

/**
 * @title ChartStorage
 * @dev Stores chart data on-chain as an immutable, hash-linked ledger.
 *      Each CREATE or UPDATE produces a new BlockTransaction whose blockHash
 *      is derived from the previous hash, ensuring tamper-evident history.
 *
 *      Tables (spec §3.5):
 *        - ChartRecord   → stores chart metadata + latest data
 *        - BlockTransaction → immutable log of every change (audit trail)
 */
contract ChartStorage {
    UserAccessControl public accessControl;

    // ── data structures ────────────────────────────────────────────────────────

    struct ChartRecord {
        uint256 chartId;
        string  title;
        string  chartType;      // "bar" | "line" | "pie" | "scatter"
        string  labelsJSON;     // JSON array  e.g. '["Jan","Feb","Mar"]'
        string  datasetsJSON;   // JSON array  Chart.js dataset objects
        string  description;
        address creator;
        uint256 createdAt;
        uint256 lastModified;
        bool    isActive;
    }

    struct BlockTransaction {
        uint256 txId;
        uint256 chartId;
        bytes32 previousHash;
        bytes32 blockHash;
        address actor;
        uint256 blockTimestamp;
        string  action;          // "CREATE" | "UPDATE"
        string  dataSnapshot;    // full JSON snapshot at time of transaction
    }

    // ── storage ────────────────────────────────────────────────────────────────

    uint256 private chartCounter;
    uint256 private txCounter;

    mapping(uint256 => ChartRecord)         private charts;
    mapping(uint256 => BlockTransaction[])  private history;
    mapping(uint256 => bytes32)             private latestHash;
    uint256[] private chartIds;

    // ── events ─────────────────────────────────────────────────────────────────

    event ChartCreated(
        uint256 indexed chartId,
        string  title,
        address indexed creator,
        bytes32 blockHash,
        uint256 timestamp
    );
    event ChartUpdated(
        uint256 indexed chartId,
        address indexed actor,
        bytes32 previousHash,
        bytes32 blockHash,
        uint256 timestamp
    );
    event ChartDeactivated(uint256 indexed chartId, address indexed by, uint256 timestamp);

    // ── constructor ────────────────────────────────────────────────────────────

    constructor(address _accessControl) {
        accessControl = UserAccessControl(_accessControl);
    }

    // ── modifiers ──────────────────────────────────────────────────────────────

    modifier onlyEditorOrAbove() {
        require(
            accessControl.hasRole(msg.sender, UserAccessControl.Role.Editor),
            "CS: Editor or Admin required"
        );
        _;
    }

    modifier onlyViewerOrAbove() {
        require(
            accessControl.hasRole(msg.sender, UserAccessControl.Role.Viewer),
            "CS: Registered active user required"
        );
        _;
    }

    modifier onlyAdmin() {
        require(
            accessControl.hasRole(msg.sender, UserAccessControl.Role.Admin),
            "CS: Admin required"
        );
        _;
    }

    modifier chartExists(uint256 _id) {
        require(charts[_id].chartId != 0 && charts[_id].isActive, "CS: chart not found");
        _;
    }

    // ── internal helpers ───────────────────────────────────────────────────────

    function _snapshot(
        string memory _title,
        string memory _type,
        string memory _labels,
        string memory _datasets
    ) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '{"title":"', _title,
            '","type":"',  _type,
            '","labels":',  _labels,
            ',"datasets":', _datasets, '}'
        ));
    }

    // ── write functions ────────────────────────────────────────────────────────

    /**
     * @notice Create a new chart and record the genesis block-transaction.
     *         Algorithm step 6 (spec §3.6): generate hash, link to genesis (0x0).
     */
    function createChart(
        string calldata _title,
        string calldata _chartType,
        string calldata _labelsJSON,
        string calldata _datasetsJSON,
        string calldata _description
    ) external onlyEditorOrAbove returns (uint256) {
        chartCounter++;
        txCounter++;

        uint256 id  = chartCounter;
        string memory snap = _snapshot(_title, _chartType, _labelsJSON, _datasetsJSON);

        bytes32 prev = bytes32(0); // genesis
        bytes32 hash = keccak256(
            abi.encodePacked(id, snap, msg.sender, block.timestamp, prev)
        );

        charts[id] = ChartRecord({
            chartId      : id,
            title        : _title,
            chartType    : _chartType,
            labelsJSON   : _labelsJSON,
            datasetsJSON : _datasetsJSON,
            description  : _description,
            creator      : msg.sender,
            createdAt    : block.timestamp,
            lastModified : block.timestamp,
            isActive     : true
        });

        history[id].push(BlockTransaction({
            txId           : txCounter,
            chartId        : id,
            previousHash   : prev,
            blockHash      : hash,
            actor          : msg.sender,
            blockTimestamp : block.timestamp,
            action         : "CREATE",
            dataSnapshot   : snap
        }));

        latestHash[id] = hash;
        chartIds.push(id);

        emit ChartCreated(id, _title, msg.sender, hash, block.timestamp);
        return id;
    }

    /**
     * @notice Update existing chart data. Previous block is NOT overwritten;
     *         a new linked block is appended (spec §3.3.1 "does not overwrite").
     */
    function updateChart(
        uint256 _chartId,
        string calldata _labelsJSON,
        string calldata _datasetsJSON,
        string calldata _description
    ) external onlyEditorOrAbove chartExists(_chartId) {
        txCounter++;

        ChartRecord storage c = charts[_chartId];
        string memory snap = _snapshot(c.title, c.chartType, _labelsJSON, _datasetsJSON);

        bytes32 prev = latestHash[_chartId];
        bytes32 hash = keccak256(
            abi.encodePacked(_chartId, snap, msg.sender, block.timestamp, prev)
        );

        c.labelsJSON   = _labelsJSON;
        c.datasetsJSON = _datasetsJSON;
        c.description  = _description;
        c.lastModified = block.timestamp;
        c.isActive     = true; // stays active on update

        history[_chartId].push(BlockTransaction({
            txId           : txCounter,
            chartId        : _chartId,
            previousHash   : prev,
            blockHash      : hash,
            actor          : msg.sender,
            blockTimestamp : block.timestamp,
            action         : "UPDATE",
            dataSnapshot   : snap
        }));

        latestHash[_chartId] = hash;

        emit ChartUpdated(_chartId, msg.sender, prev, hash, block.timestamp);
    }

    function deactivateChart(uint256 _chartId)
        external onlyAdmin chartExists(_chartId)
    {
        charts[_chartId].isActive = false;
        // remove from active list
        for (uint256 i = 0; i < chartIds.length; i++) {
            if (chartIds[i] == _chartId) {
                chartIds[i] = chartIds[chartIds.length - 1];
                chartIds.pop();
                break;
            }
        }
        emit ChartDeactivated(_chartId, msg.sender, block.timestamp);
    }

    // ── read functions ─────────────────────────────────────────────────────────

    function getChart(uint256 _chartId)
        external view onlyViewerOrAbove chartExists(_chartId)
        returns (ChartRecord memory)
    {
        return charts[_chartId];
    }

    function getChartHistory(uint256 _chartId)
        external view onlyViewerOrAbove
        returns (BlockTransaction[] memory)
    {
        return history[_chartId];
    }

    function getLatestHash(uint256 _chartId) external view returns (bytes32) {
        return latestHash[_chartId];
    }

    function getAllChartIds()
        external view onlyViewerOrAbove
        returns (uint256[] memory)
    {
        return chartIds;
    }

    function getChartCount() external view returns (uint256) {
        return chartCounter;
    }

    function getTotalTransactions() external view returns (uint256) {
        return txCounter;
    }

    /**
     * @notice Traverse the hash chain for a chart and verify it has not been tampered.
     *         Returns (true, "verified") if intact, or (false, reason) if broken.
     */
    function verifyIntegrity(uint256 _chartId)
        external view
        returns (bool valid, string memory message)
    {
        BlockTransaction[] storage txs = history[_chartId];
        if (txs.length == 0) return (false, "No history found");

        bytes32 expected = bytes32(0); // genesis starts at 0x0
        for (uint256 i = 0; i < txs.length; i++) {
            if (txs[i].previousHash != expected) {
                return (false, "Hash chain broken - tampering detected");
            }
            expected = txs[i].blockHash;
        }
        return (true, "Integrity verified - chain is intact");
    }
}
