// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./UserAccessControl.sol";

/**
 * @title ChatRoom
 * @dev Stores chat rooms and messages on-chain as a tamper-evident, hash-linked ledger.
 *      Each message is linked to the previous message hash in its room, forming an
 *      immutable audit chain (spec §3.3.1 — "does not overwrite, appends new block").
 *
 *      Tables (spec §3.5):
 *        - Room        → chat room metadata
 *        - Message     → message content + hash-chain fields
 *        - MsgVersion  → edit history for each message
 */
contract ChatRoom {
    UserAccessControl public accessControl;

    // ── data structures ────────────────────────────────────────────────────────

    struct Room {
        uint256 roomId;
        string  name;
        string  description;
        address creator;
        uint256 createdAt;
        bool    isPrivate;
        bool    isActive;
    }

    struct Message {
        uint256 msgId;
        uint256 roomId;
        address sender;
        string  content;
        uint256 sentAt;
        uint256 lastEditedAt;
        bytes32 prevMsgHash;
        bytes32 msgHash;
        bool    isRetracted;
        uint256 editCount;
    }

    struct MsgVersion {
        string  content;
        uint256 editedAt;
        address editedBy;
    }

    // ── storage ────────────────────────────────────────────────────────────────

    uint256 private roomCounter;
    uint256 private msgCounter;

    mapping(uint256 => Room)        private rooms;
    mapping(uint256 => Message[])   private roomMessages;
    mapping(uint256 => bytes32)     private latestMsgHash;
    mapping(uint256 => MsgVersion[]) private msgVersions;
    mapping(uint256 => mapping(address => bool)) private roomMembers;
    mapping(uint256 => address[])   private roomMemberList;
    uint256[] private roomIds;

    // ── events ─────────────────────────────────────────────────────────────────

    event RoomCreated(
        uint256 indexed roomId,
        string  name,
        address indexed creator,
        uint256 timestamp
    );
    event MessageSent(
        uint256 indexed msgId,
        uint256 indexed roomId,
        address indexed sender,
        bytes32 msgHash,
        uint256 timestamp
    );
    event MessageEdited(
        uint256 indexed msgId,
        uint256 indexed roomId,
        address indexed editor,
        uint256 editCount,
        uint256 timestamp
    );
    event MessageRetracted(
        uint256 indexed msgId,
        uint256 indexed roomId,
        address indexed by,
        uint256 timestamp
    );
    event MemberAdded(uint256 indexed roomId, address indexed member, uint256 timestamp);
    event RoomDeactivated(uint256 indexed roomId, address indexed by, uint256 timestamp);

    // ── constructor ────────────────────────────────────────────────────────────

    constructor(address _accessControl) {
        accessControl = UserAccessControl(_accessControl);
    }

    // ── modifiers ──────────────────────────────────────────────────────────────

    modifier onlyRegistered() {
        require(
            accessControl.hasRole(msg.sender, UserAccessControl.Role.Viewer),
            "CR: Registered active user required"
        );
        _;
    }

    modifier onlyAdmin() {
        require(
            accessControl.hasRole(msg.sender, UserAccessControl.Role.Admin),
            "CR: Admin required"
        );
        _;
    }

    modifier roomExists(uint256 _roomId) {
        require(rooms[_roomId].roomId != 0 && rooms[_roomId].isActive, "CR: room not found");
        _;
    }

    modifier canAccessRoom(uint256 _roomId) {
        require(rooms[_roomId].roomId != 0 && rooms[_roomId].isActive, "CR: room not found");
        if (rooms[_roomId].isPrivate) {
            require(roomMembers[_roomId][msg.sender], "CR: not a room member");
        } else {
            require(
                accessControl.hasRole(msg.sender, UserAccessControl.Role.Viewer),
                "CR: must be registered"
            );
        }
        _;
    }

    // ── internal helpers ───────────────────────────────────────────────────────

    function _computeHash(
        uint256 _msgId,
        uint256 _roomId,
        address _sender,
        string memory _content,
        uint256 _timestamp,
        bytes32 _prevHash
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(_msgId, _roomId, _sender, _content, _timestamp, _prevHash)
        );
    }

    function _addMember(uint256 _roomId, address _addr) internal {
        if (!roomMembers[_roomId][_addr]) {
            roomMembers[_roomId][_addr] = true;
            roomMemberList[_roomId].push(_addr);
        }
    }

    // ── room functions ─────────────────────────────────────────────────────────

    /**
     * @notice Create a new chat room. Creator is auto-added as a member.
     */
    function createRoom(
        string calldata _name,
        string calldata _description,
        bool _isPrivate
    ) external onlyRegistered returns (uint256) {
        roomCounter++;
        uint256 id = roomCounter;

        rooms[id] = Room({
            roomId     : id,
            name       : _name,
            description: _description,
            creator    : msg.sender,
            createdAt  : block.timestamp,
            isPrivate  : _isPrivate,
            isActive   : true
        });

        roomIds.push(id);
        _addMember(id, msg.sender);

        emit RoomCreated(id, _name, msg.sender, block.timestamp);
        return id;
    }

    /**
     * @notice Join a public room (private rooms require addMember from creator/admin).
     */
    function joinRoom(uint256 _roomId) external onlyRegistered roomExists(_roomId) {
        require(!rooms[_roomId].isPrivate, "CR: private room - use addMember");
        _addMember(_roomId, msg.sender);
        emit MemberAdded(_roomId, msg.sender, block.timestamp);
    }

    /**
     * @notice Add a member to a private room. Only room creator or admin.
     */
    function addMember(uint256 _roomId, address _member) external onlyRegistered roomExists(_roomId) {
        require(
            msg.sender == rooms[_roomId].creator ||
            accessControl.hasRole(msg.sender, UserAccessControl.Role.Admin),
            "CR: only room creator or admin"
        );
        require(
            accessControl.hasRole(_member, UserAccessControl.Role.Viewer),
            "CR: target must be a registered user"
        );
        _addMember(_roomId, _member);
        emit MemberAdded(_roomId, _member, block.timestamp);
    }

    function deactivateRoom(uint256 _roomId) external onlyAdmin roomExists(_roomId) {
        rooms[_roomId].isActive = false;
        for (uint256 i = 0; i < roomIds.length; i++) {
            if (roomIds[i] == _roomId) {
                roomIds[i] = roomIds[roomIds.length - 1];
                roomIds.pop();
                break;
            }
        }
        emit RoomDeactivated(_roomId, msg.sender, block.timestamp);
    }

    // ── message functions ──────────────────────────────────────────────────────

    /**
     * @notice Send a message to a room. Hash-links to the previous message hash.
     *         Algorithm (spec §3.6): hash = keccak256(msgId + roomId + sender + content + ts + prevHash)
     */
    function sendMessage(
        uint256 _roomId,
        string calldata _content
    ) external canAccessRoom(_roomId) returns (uint256) {
        require(bytes(_content).length > 0, "CR: empty message");

        msgCounter++;
        uint256 mid = msgCounter;

        bytes32 prev = latestMsgHash[_roomId];
        bytes32 hash = _computeHash(mid, _roomId, msg.sender, _content, block.timestamp, prev);

        roomMessages[_roomId].push(Message({
            msgId        : mid,
            roomId       : _roomId,
            sender       : msg.sender,
            content      : _content,
            sentAt       : block.timestamp,
            lastEditedAt : block.timestamp,
            prevMsgHash  : prev,
            msgHash      : hash,
            isRetracted  : false,
            editCount    : 0
        }));

        latestMsgHash[_roomId] = hash;

        emit MessageSent(mid, _roomId, msg.sender, hash, block.timestamp);
        return mid;
    }

    /**
     * @notice Edit own message. Previous content is preserved in MsgVersion history.
     *         A new hash is computed to record the edit (spec §3.3.1 — tamper-evident).
     */
    function editMessage(
        uint256 _roomId,
        uint256 _msgIndex,
        string calldata _newContent
    ) external canAccessRoom(_roomId) {
        require(_msgIndex < roomMessages[_roomId].length, "CR: invalid message index");
        Message storage m = roomMessages[_roomId][_msgIndex];
        require(m.sender == msg.sender, "CR: can only edit own messages");
        require(!m.isRetracted, "CR: message is retracted");
        require(bytes(_newContent).length > 0, "CR: empty content");

        msgVersions[m.msgId].push(MsgVersion({
            content : m.content,
            editedAt: block.timestamp,
            editedBy: msg.sender
        }));

        m.content      = _newContent;
        m.editCount    += 1;
        m.lastEditedAt = block.timestamp;

        emit MessageEdited(m.msgId, _roomId, msg.sender, m.editCount, block.timestamp);
    }

    /**
     * @notice Retract (soft-delete) own message. Content is replaced with a tombstone.
     *         Admin can retract any message.
     */
    function retractMessage(
        uint256 _roomId,
        uint256 _msgIndex
    ) external canAccessRoom(_roomId) {
        require(_msgIndex < roomMessages[_roomId].length, "CR: invalid message index");
        Message storage m = roomMessages[_roomId][_msgIndex];
        require(
            m.sender == msg.sender ||
            accessControl.hasRole(msg.sender, UserAccessControl.Role.Admin),
            "CR: not authorised to retract"
        );
        require(!m.isRetracted, "CR: already retracted");

        msgVersions[m.msgId].push(MsgVersion({
            content : m.content,
            editedAt: block.timestamp,
            editedBy: msg.sender
        }));

        m.content     = "[Message retracted]";
        m.isRetracted = true;

        emit MessageRetracted(m.msgId, _roomId, msg.sender, block.timestamp);
    }

    // ── read functions ─────────────────────────────────────────────────────────

    function getRoom(uint256 _roomId) external view onlyRegistered returns (Room memory) {
        require(rooms[_roomId].roomId != 0, "CR: room not found");
        return rooms[_roomId];
    }

    function getRoomMessages(uint256 _roomId)
        external view canAccessRoom(_roomId)
        returns (Message[] memory)
    {
        return roomMessages[_roomId];
    }

    function getMsgVersions(uint256 _msgId)
        external view onlyRegistered
        returns (MsgVersion[] memory)
    {
        return msgVersions[_msgId];
    }

    function getLatestHash(uint256 _roomId) external view returns (bytes32) {
        return latestMsgHash[_roomId];
    }

    function getAllRooms() external view onlyRegistered returns (Room[] memory) {
        Room[] memory result = new Room[](roomIds.length);
        for (uint256 i = 0; i < roomIds.length; i++) {
            result[i] = rooms[roomIds[i]];
        }
        return result;
    }

    function getRoomMembers(uint256 _roomId) external view onlyRegistered returns (address[] memory) {
        return roomMemberList[_roomId];
    }

    function isMember(uint256 _roomId, address _addr) external view returns (bool) {
        return roomMembers[_roomId][_addr];
    }

    function getRoomCount() external view returns (uint256) {
        return roomCounter;
    }

    function getTotalMessages() external view returns (uint256) {
        return msgCounter;
    }

    /**
     * @notice Verify the hash chain for a room's messages has not been tampered with.
     *         Returns (true, "verified") if intact, or (false, reason) if broken.
     */
    function verifyIntegrity(uint256 _roomId)
        external view
        returns (bool valid, string memory message)
    {
        Message[] storage msgs = roomMessages[_roomId];
        if (msgs.length == 0) return (false, "No messages found");

        bytes32 expected = bytes32(0);
        for (uint256 i = 0; i < msgs.length; i++) {
            if (msgs[i].prevMsgHash != expected) {
                return (false, "Hash chain broken - tampering detected");
            }
            expected = msgs[i].msgHash;
        }
        return (true, "Integrity verified - chain is intact");
    }
}
