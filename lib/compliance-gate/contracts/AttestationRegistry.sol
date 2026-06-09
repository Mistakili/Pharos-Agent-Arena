// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AttestationRegistry
/// @notice Minimal on-chain registry of compliance attestations for the
///         Compliance Gate Skill. Authorized issuers attest facts (KYC, AML
///         risk, jurisdiction, age, accreditation) about subject wallets;
///         any agent can read them trustlessly to gate its actions.
/// @dev    Designed to mirror the data Pharos exposes at the protocol layer via
///         its native ZK-KYC/AML modules. When that interface ships, agents can
///         point the Skill at it without changing policy or agent logic.
contract AttestationRegistry {
    enum AttType {
        KYC,
        AML,
        ACCREDITATION,
        JURISDICTION,
        AGE
    }

    struct Attestation {
        uint8 attType;
        address issuer;
        string value;
        uint64 issuedAt;
        uint64 expiresAt; // 0 == never expires
        bool revoked;
    }

    address public owner;
    mapping(address => bool) public isIssuer;
    mapping(address => Attestation[]) private _attestations;

    event Attested(
        address indexed subject,
        uint8 indexed attType,
        address indexed issuer,
        string value,
        uint64 expiresAt,
        uint256 index
    );
    event Revoked(address indexed subject, uint256 indexed index, address indexed by);
    event IssuerSet(address indexed issuer, bool allowed);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyIssuer() {
        require(isIssuer[msg.sender], "not issuer");
        _;
    }

    constructor() {
        owner = msg.sender;
        isIssuer[msg.sender] = true;
        emit IssuerSet(msg.sender, true);
    }

    /// @notice Authorize or de-authorize an issuer.
    function setIssuer(address issuer, bool allowed) external onlyOwner {
        isIssuer[issuer] = allowed;
        emit IssuerSet(issuer, allowed);
    }

    /// @notice Record an attestation about `subject`.
    /// @return index The position of the new attestation in the subject's list.
    function attest(
        address subject,
        uint8 attType,
        string calldata value,
        uint64 expiresAt
    ) external onlyIssuer returns (uint256 index) {
        require(attType <= uint8(AttType.AGE), "bad type");
        index = _attestations[subject].length;
        _attestations[subject].push(
            Attestation({
                attType: attType,
                issuer: msg.sender,
                value: value,
                issuedAt: uint64(block.timestamp),
                expiresAt: expiresAt,
                revoked: false
            })
        );
        emit Attested(subject, attType, msg.sender, value, expiresAt, index);
    }

    /// @notice Revoke an attestation. Callable by its issuer or the owner.
    function revoke(address subject, uint256 index) external {
        Attestation storage a = _attestations[subject][index];
        require(msg.sender == a.issuer || msg.sender == owner, "not authorized");
        a.revoked = true;
        emit Revoked(subject, index, msg.sender);
    }

    /// @notice Read all attestations for a subject.
    function getAttestations(address subject)
        external
        view
        returns (Attestation[] memory)
    {
        return _attestations[subject];
    }

    /// @notice Number of attestations recorded for a subject.
    function getAttestationCount(address subject) external view returns (uint256) {
        return _attestations[subject].length;
    }
}
