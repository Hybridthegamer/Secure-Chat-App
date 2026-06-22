// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title UserAccessControl
 * @dev Manages user registration and role-based access for the secure chart application.
 *      Roles: 0=None (unregistered), 1=Viewer, 2=Editor, 3=Admin
 */
contract UserAccessControl {
    enum Role { None, Viewer, Editor, Admin }

    struct UserProfile {
        address userAddress;
        string  username;
        Role    role;
        bool    isActive;
        uint256 registeredAt;
    }

    address public owner;

    mapping(address => UserProfile) private profiles;
    address[] private userIndex;

    event UserRegistered(address indexed user, string username, Role role, uint256 timestamp);
    event RoleUpdated(address indexed user, Role oldRole, Role newRole, uint256 timestamp);
    event UserStatusChanged(address indexed user, bool isActive, uint256 timestamp);

    constructor() {
        owner = msg.sender;
        _register(msg.sender, "System Admin", Role.Admin);
    }

    modifier onlyAdmin() {
        require(
            profiles[msg.sender].role == Role.Admin && profiles[msg.sender].isActive,
            "UAC: Admin only"
        );
        _;
    }

    // ── internal helpers ───────────────────────────────────────────────────────

    function _register(address _addr, string memory _name, Role _role) internal {
        profiles[_addr] = UserProfile({
            userAddress : _addr,
            username    : _name,
            role        : _role,
            isActive    : true,
            registeredAt: block.timestamp
        });
        userIndex.push(_addr);
    }

    // ── admin functions ────────────────────────────────────────────────────────

    function registerUser(address _addr, string calldata _name, Role _role) external onlyAdmin {
        require(profiles[_addr].userAddress == address(0), "UAC: user already exists");
        require(_role != Role.None, "UAC: invalid role");
        _register(_addr, _name, _role);
        emit UserRegistered(_addr, _name, _role, block.timestamp);
    }

    function updateRole(address _addr, Role _newRole) external onlyAdmin {
        require(profiles[_addr].userAddress != address(0), "UAC: user not found");
        require(_newRole != Role.None, "UAC: invalid role");
        Role old = profiles[_addr].role;
        profiles[_addr].role = _newRole;
        emit RoleUpdated(_addr, old, _newRole, block.timestamp);
    }

    function setUserActive(address _addr, bool _active) external onlyAdmin {
        require(profiles[_addr].userAddress != address(0), "UAC: user not found");
        profiles[_addr].isActive = _active;
        emit UserStatusChanged(_addr, _active, block.timestamp);
    }

    // ── view functions ─────────────────────────────────────────────────────────

    function getProfile(address _addr) external view returns (UserProfile memory) {
        return profiles[_addr];
    }

    function getUserRole(address _addr) external view returns (Role) {
        return profiles[_addr].role;
    }

    function isUserActive(address _addr) external view returns (bool) {
        return profiles[_addr].isActive;
    }

    /// @dev Returns true if _addr has at least _minRole AND is active
    function hasRole(address _addr, Role _minRole) external view returns (bool) {
        UserProfile storage p = profiles[_addr];
        return p.isActive && uint256(p.role) >= uint256(_minRole);
    }

    function getAllUsers() external view returns (UserProfile[] memory) {
        UserProfile[] memory all = new UserProfile[](userIndex.length);
        for (uint256 i = 0; i < userIndex.length; i++) {
            all[i] = profiles[userIndex[i]];
        }
        return all;
    }

    function getUserCount() external view returns (uint256) {
        return userIndex.length;
    }
}
