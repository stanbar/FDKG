// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./lib/BabyJub.sol";

/**
 * @title FDKGVoteGW
 * @notice On-chain state-machine for FDKG-Vote-BC elections.
 *
 * Implements the gateway described in:
 *   04b-protocols.tex §sec:fdkg-vote-bc (lst:fdkg-vote-gw, alg:fdkg-deploy–alg:fdkg-tally)
 *   05a-fdkg-protocol.tex §sec:fdkg-full (Round 1 / Round 2)
 *
 * ─────────────────────────────────────────────────────────────────
 *  Phase windows (spec-faithful):
 *    [deploy,  tOpen)   KEYGEN   – talliers post FDKG generation messages
 *    [tOpen,   tClose)  VOTING   – eligible voters cast encrypted ballots
 *    [tClose,  ∞)       DECRYPT  – talliers / guardians post decryption material
 *    finalizeTally()    FINAL    – tally recorded once enough dec material present
 * ─────────────────────────────────────────────────────────────────
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MOCKED IN THIS PoC (see README.md for replacement hooks)   ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  • ZK proof verification    → _verifyProof() always true    ║
 * ║  • Eligibility              → on-chain allowlist            ║
 * ║  • Tally verification       → submitted result accepted     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
contract FDKGVoteGW {
    using BabyJub for BabyJub.Point;

    // ─── Data structures ────────────────────────────────────────

    /// @dev A BabyJub curve point (BN254 scalar-field coordinates).
    struct Point {
        uint256 x;
        uint256 y;
    }

    /**
     * @dev ElGamal ciphertext of a Shamir share.
     *   c1      = r · Base8
     *   c2      = m · Base8 + r · pk_guardian
     *   xIncrement encodes the randomisation used for scalar→point mapping.
     */
    struct EncShare {
        Point c1;
        Point c2;
        uint256 xIncrement;
    }

    /**
     * @dev An encrypted ballot.
     *   c1 = r · Base8
     *   c2 = m · Base8 + r · E     (m encodes the vote choice)
     */
    struct Ballot {
        Point c1;
        Point c2;
        bytes32 nullifier;
    }

    /**
     * @dev A tallier's partial decryption contribution.
     *   share = sk_i · aggC1   (PD_i in the paper)
     */
    struct DecShare {
        address tallier;
        Point share;
    }

    /**
     * @dev A guardian's plaintext Shamir share for an offline tallier.
     *   shareX  Lagrange x-index (1-based)
     *   shareY  plaintext share value y = f(shareX)
     */
    struct ReconShare {
        address tallier;
        address guardian;
        uint256 shareX;
        uint256 shareY;
    }

    // ─── Per-election scalar/array state (no nested mappings) ───

    struct ElectionInfo {
        address organiser;
        uint64  tOpen;      // start of voting window (= end of keygen)
        uint64  tClose;     // end of voting window   (= start of decryption)
        uint16  tRec;       // guardian threshold for SSS reconstruction
        bytes32 merkleRoot; // eligibility commitment (used as label; MOCK: not verified)
        bool    paramsPinned;
        bool    tallyFinalized;
        // Aggregate election public key E = ∏ E_i (accumulated via BabyJub.add)
        Point   electionPubKey;
        // Ordered list of accepted talliers
        address[] tallierList;
        // Accepted data
        Ballot[]     ballots;
        DecShare[]   decShares;
        ReconShare[] reconShares;
        // Off-chain computed tally (option vote counts)
        uint256[] tally;
    }

    // ─── Storage ─────────────────────────────────────────────────

    mapping(bytes32 => ElectionInfo) private _e;

    // Per-election, per-address flags and data (keyed by eid)
    mapping(bytes32 => mapping(address => bool))    public isTallier;
    mapping(bytes32 => mapping(address => bool))    public genPosted;
    mapping(bytes32 => mapping(address => bool))    public decPosted;
    mapping(bytes32 => mapping(address => Point))   public partialPubKey;
    mapping(bytes32 => mapping(address => address[])) public tallierGuardians;
    // encShares[eid][tallier] = array of encrypted shares (one per guardian in order)
    mapping(bytes32 => mapping(address => EncShare[])) public encShares;
    // nullifierUsed[eid][nullifier]
    mapping(bytes32 => mapping(bytes32 => bool))    public nullifierUsed;
    // MOCK eligibility allowlist (production: replaced by Merkle ZK proof)
    mapping(bytes32 => mapping(address => bool))    public eligible;
    // reconPosted[eid][tallier][guardian]
    mapping(bytes32 => mapping(address => mapping(address => bool))) public reconPosted;
    // reconCount[eid][tallier] = number of guardian recon shares received
    mapping(bytes32 => mapping(address => uint256)) public reconCount;

    // ─── Events ──────────────────────────────────────────────────

    event ParamsPinned(
        bytes32 indexed eid,
        address indexed organiser,
        uint64 tOpen,
        uint64 tClose,
        uint16 tRec,
        bytes32 merkleRoot
    );
    event EligibleAdded(bytes32 indexed eid, address indexed voter);
    event FDKGAccepted(
        bytes32 indexed eid,
        address indexed tallier,
        uint256 pkX,
        uint256 pkY
    );
    event BallotAccepted(bytes32 indexed eid, bytes32 indexed nullifier);
    event DecShareAccepted(
        bytes32 indexed eid,
        address indexed tallier,
        uint256 shareX,
        uint256 shareY
    );
    event ReconShareAccepted(
        bytes32 indexed eid,
        address indexed tallier,
        address indexed guardian,
        uint256 shareX,
        uint256 shareY
    );
    event TallyFinalized(bytes32 indexed eid, uint256[] tally);

    // ─── Modifiers ───────────────────────────────────────────────

    modifier onlyOrg(bytes32 eid) {
        require(_e[eid].organiser == msg.sender, "FDKGVoteGW: not organiser");
        _;
    }

    modifier mustBePinned(bytes32 eid) {
        require(_e[eid].paramsPinned, "FDKGVoteGW: not pinned");
        _;
    }

    // ─── 1. Pin parameters ───────────────────────────────────────

    /**
     * @notice Anchor an election instance on-chain (alg:fdkg-deploy).
     * @param eid        Unique election identifier.
     * @param tOpen      Unix timestamp: start of voting / end of keygen.
     * @param tClose     Unix timestamp: end of voting / start of decryption.
     * @param tRec       Guardian threshold for SSS reconstruction.
     * @param merkleRoot Eligibility commitment (informational; MOCK: not used for proof).
     */
    function pinParams(
        bytes32 eid,
        uint64  tOpen,
        uint64  tClose,
        uint16  tRec,
        bytes32 merkleRoot
    ) external {
        require(!_e[eid].paramsPinned,            "FDKGVoteGW: already pinned");
        require(tOpen > block.timestamp,           "FDKGVoteGW: tOpen in past");
        require(tClose > tOpen,                    "FDKGVoteGW: tClose <= tOpen");
        require(tRec > 0,                          "FDKGVoteGW: tRec must be > 0");

        ElectionInfo storage e = _e[eid];
        e.organiser    = msg.sender;
        e.tOpen        = tOpen;
        e.tClose       = tClose;
        e.tRec         = tRec;
        e.merkleRoot   = merkleRoot;
        e.paramsPinned = true;
        // Initialise election public key to BabyJub identity (0, 1)
        e.electionPubKey = Point(0, 1);

        emit ParamsPinned(eid, msg.sender, tOpen, tClose, tRec, merkleRoot);
    }

    // ─── MOCK: Eligibility management ────────────────────────────

    /**
     * @notice Add eligible voters (MOCK).
     * @dev    Production replacement: remove this function; verify Merkle ZK proof
     *         in castBallot() via MerkleProof.verify(proof, merkleRoot, leaf).
     */
    function addEligible(bytes32 eid, address[] calldata voters)
        external
        mustBePinned(eid)
        onlyOrg(eid)
    {
        for (uint256 i; i < voters.length; ++i) {
            eligible[eid][voters[i]] = true;
            emit EligibleAdded(eid, voters[i]);
        }
    }

    // ─── 2. FDKG Generation (keygen window: before tOpen) ────────

    /**
     * @notice Post an FDKG generation message (alg:fdkg-keygen / Round 1).
     *
     * @param eid        Election id.
     * @param Ei         Partial public key  E_i = Base8^sk_i  (BabyJub point).
     * @param guardianSet Addresses of G_i (ordered; index i+1 is Shamir x-coordinate).
     * @param shares     Encrypted Shamir shares — one per guardian in guardianSet order.
     * @param proof      FDKG NIZK (MOCK: not verified in PoC).
     *
     * On accept: E ← BabyJub.add(E, Ei)  (real on-chain aggregation).
     *
     * Production hook: replace _verifyProof with circom PVSS Groth16 verifier.
     */
    function postFDKGGen(
        bytes32    eid,
        Point calldata    Ei,
        address[] calldata guardianSet,
        EncShare[] calldata shares,
        bytes calldata proof
    ) external mustBePinned(eid) {
        ElectionInfo storage e = _e[eid];
        require(block.timestamp < e.tOpen,           "FDKGVoteGW: keygen window closed");
        require(!genPosted[eid][msg.sender],          "FDKGVoteGW: already registered");
        require(guardianSet.length == shares.length, "FDKGVoteGW: length mismatch");
        require(guardianSet.length > 0,              "FDKGVoteGW: empty guardian set");

        // MOCK: _verifyFDKGProof(proof) — always passes in PoC
        // Production: IFDKGVerifier(vkFDKG).verifyProof(Ei, guardianSet, shares, proof)
        _requireValidProof(proof);

        genPosted[eid][msg.sender]      = true;
        isTallier[eid][msg.sender]      = true;
        partialPubKey[eid][msg.sender]  = Ei;
        tallierGuardians[eid][msg.sender] = guardianSet;

        for (uint256 i; i < shares.length; ++i) {
            encShares[eid][msg.sender].push(shares[i]);
        }

        // Aggregate election public key on-chain via BabyJub point addition
        BabyJub.Point memory current = BabyJub.Point(e.electionPubKey.x, e.electionPubKey.y);
        BabyJub.Point memory contrib = BabyJub.Point(Ei.x, Ei.y);
        BabyJub.Point memory updated = BabyJub.add(current, contrib);
        e.electionPubKey = Point(updated.x, updated.y);

        e.tallierList.push(msg.sender);

        emit FDKGAccepted(eid, msg.sender, Ei.x, Ei.y);
    }

    // ─── 3. Cast Ballot (voting window: [tOpen, tClose)) ─────────

    /**
     * @notice Cast an encrypted ballot (alg:fdkg-cast).
     *
     * @param eid       Election id.
     * @param c1        First ElGamal component  c1 = r · Base8.
     * @param c2        Second ElGamal component c2 = m·Base8 + r·E.
     * @param nullifier One-time nullifier nf_u = keccak256(sk_u ‖ eid ‖ "cast").
     * @param proof     Cast NIZK (MOCK: not verified in PoC).
     *
     * Production hook: replace eligible check with Merkle ZK proof verification;
     * replace _verifyProof with circom cast + membership verifier.
     */
    function castBallot(
        bytes32 eid,
        Point calldata c1,
        Point calldata c2,
        bytes32 nullifier,
        bytes calldata proof
    ) external mustBePinned(eid) {
        ElectionInfo storage e = _e[eid];
        require(block.timestamp >= e.tOpen && block.timestamp < e.tClose,
                "FDKGVoteGW: not in voting window");
        require(!nullifierUsed[eid][nullifier],
                "FDKGVoteGW: nullifier already used");
        // MOCK: eligibility allowlist
        // Production: verify Merkle ZK proof of pk_u ∈ merkleRoot
        require(eligible[eid][msg.sender],
                "FDKGVoteGW: not eligible");

        // MOCK: _verifyCastProof(proof)
        _requireValidProof(proof);

        nullifierUsed[eid][nullifier] = true;
        e.ballots.push(Ballot(c1, c2, nullifier));

        emit BallotAccepted(eid, nullifier);
    }

    // ─── 4a. Post Decryption Share (after tClose) ────────────────

    /**
     * @notice Submit a partial decryption share (alg:fdkg-decrypt).
     *
     * @param eid   Election id.
     * @param share PD_i = sk_i · aggC1  (BabyJub point).
     * @param proof DLEQ / Chaum-Pedersen proof (MOCK: not verified in PoC).
     *
     * Production hook: replace _verifyProof with DLEQ verifier.
     */
    function postDecShare(
        bytes32 eid,
        Point calldata share,
        bytes calldata proof
    ) external mustBePinned(eid) {
        ElectionInfo storage e = _e[eid];
        require(block.timestamp >= e.tClose,     "FDKGVoteGW: voting not closed");
        require(isTallier[eid][msg.sender],       "FDKGVoteGW: not a tallier");
        require(!decPosted[eid][msg.sender],      "FDKGVoteGW: already posted dec share");

        // MOCK: _verifyDecProof(proof)
        _requireValidProof(proof);

        decPosted[eid][msg.sender] = true;
        e.decShares.push(DecShare(msg.sender, share));

        emit DecShareAccepted(eid, msg.sender, share.x, share.y);
    }

    // ─── 4b. Post Reconstruction Share (guardian, after tClose) ──

    /**
     * @notice A guardian reveals their plaintext Shamir share for an offline tallier
     *         (FDKG Round 2 reconstruction path).
     *
     * @param eid      Election id.
     * @param tallier  The offline tallier whose contribution needs reconstruction.
     * @param shareX   Lagrange x-index (1-based integer matching guardian position).
     * @param shareY   Plaintext Shamir share value y = f(shareX).
     * @param proof    Proof of correct ElGamal decryption (MOCK: not verified in PoC).
     *
     * Production hook: replace _verifyProof with proof-of-decryption verifier.
     */
    function postReconShare(
        bytes32 eid,
        address tallier,
        uint256 shareX,
        uint256 shareY,
        bytes calldata proof
    ) external mustBePinned(eid) {
        ElectionInfo storage e = _e[eid];
        require(block.timestamp >= e.tClose,           "FDKGVoteGW: voting not closed");
        require(isTallier[eid][tallier],               "FDKGVoteGW: not a registered tallier");
        require(!decPosted[eid][tallier],              "FDKGVoteGW: tallier posted directly");
        require(!reconPosted[eid][tallier][msg.sender],"FDKGVoteGW: guardian already posted");

        // Verify sender is a guardian of tallier
        address[] storage guards = tallierGuardians[eid][tallier];
        bool isGuardian;
        for (uint256 i; i < guards.length; ++i) {
            if (guards[i] == msg.sender) { isGuardian = true; break; }
        }
        require(isGuardian, "FDKGVoteGW: not a guardian");

        // MOCK: _verifyReconProof(proof)
        _requireValidProof(proof);

        reconPosted[eid][tallier][msg.sender] = true;
        reconCount[eid][tallier]++;
        e.reconShares.push(ReconShare(tallier, msg.sender, shareX, shareY));

        emit ReconShareAccepted(eid, tallier, msg.sender, shareX, shareY);
    }

    // ─── 5. Finalize Tally ────────────────────────────────────────

    /**
     * @notice Record the final tally once sufficient decryption material is present.
     *         The tally is computed off-chain and submitted here (alg:fdkg-tally).
     *
     * @param eid          Election id.
     * @param tallyResult  Off-chain computed vote counts per option.
     *
     * EnoughDecryptionMaterial:
     *   ∀ tallier i ∈ tallierList:  decPosted[i]  OR  reconCount[i] ≥ tRec
     *
     * Production hook: replace submitted tallyResult with on-chain re-derivation
     * from stored ballots + decShares/reconShares + BabyJub scalar multiplication,
     * or verify a ZK tally proof.
     */
    function finalizeTally(bytes32 eid, uint256[] calldata tallyResult)
        external
        mustBePinned(eid)
    {
        ElectionInfo storage e = _e[eid];
        require(block.timestamp >= e.tClose, "FDKGVoteGW: voting not closed");
        require(!e.tallyFinalized,           "FDKGVoteGW: already finalized");
        require(_enoughDecMaterial(eid),     "FDKGVoteGW: insufficient decryption material");
        require(tallyResult.length > 0,      "FDKGVoteGW: empty tally");

        for (uint256 i; i < tallyResult.length; ++i) {
            e.tally.push(tallyResult[i]);
        }
        e.tallyFinalized = true;

        emit TallyFinalized(eid, tallyResult);
    }

    // ─── Internal helpers ────────────────────────────────────────

    /**
     * @dev Check that enough decryption material exists.
     *   For every tallier i: decPosted[i] OR reconCount[i] >= tRec.
     */
    function _enoughDecMaterial(bytes32 eid) internal view returns (bool) {
        ElectionInfo storage e = _e[eid];
        uint16 threshold = e.tRec;
        address[] storage list = e.tallierList;
        for (uint256 i; i < list.length; ++i) {
            address t = list[i];
            if (!decPosted[eid][t] && reconCount[eid][t] < threshold) {
                return false;
            }
        }
        return true;
    }

    /**
     * @dev MOCK proof validation — always succeeds.
     *      Production: call the appropriate on-chain verifier contract.
     */
    function _requireValidProof(bytes calldata /* proof */) internal pure {
        // MOCK: accept any bytes (including empty 0x)
        // Production replacement:
        //   bool ok = IVerifier(verifierAddr).verifyProof(...);
        //   require(ok, "FDKGVoteGW: invalid proof");
    }

    // ─── View / getter functions ──────────────────────────────────

    function getElectionInfo(bytes32 eid)
        external
        view
        returns (
            address organiser,
            uint64  tOpen,
            uint64  tClose,
            uint16  tRec,
            bytes32 merkleRoot,
            bool    paramsPinned,
            bool    tallyFinalized,
            uint256 electionPkX,
            uint256 electionPkY,
            uint256 ballotCount,
            uint256 decShareCount,
            uint256 tallierCount
        )
    {
        ElectionInfo storage e = _e[eid];
        return (
            e.organiser,
            e.tOpen,
            e.tClose,
            e.tRec,
            e.merkleRoot,
            e.paramsPinned,
            e.tallyFinalized,
            e.electionPubKey.x,
            e.electionPubKey.y,
            e.ballots.length,
            e.decShares.length,
            e.tallierList.length
        );
    }

    function getBallots(bytes32 eid) external view returns (Ballot[] memory) {
        return _e[eid].ballots;
    }

    function getDecShares(bytes32 eid) external view returns (DecShare[] memory) {
        return _e[eid].decShares;
    }

    function getReconShares(bytes32 eid) external view returns (ReconShare[] memory) {
        return _e[eid].reconShares;
    }

    function getTallierList(bytes32 eid) external view returns (address[] memory) {
        return _e[eid].tallierList;
    }

    function getTallyResult(bytes32 eid) external view returns (uint256[] memory) {
        return _e[eid].tally;
    }

    function getGuardians(bytes32 eid, address tallier)
        external
        view
        returns (address[] memory)
    {
        return tallierGuardians[eid][tallier];
    }

    function getEncShares(bytes32 eid, address tallier)
        external
        view
        returns (EncShare[] memory)
    {
        return encShares[eid][tallier];
    }

    function getPartialPubKey(bytes32 eid, address tallier)
        external
        view
        returns (uint256 pkX, uint256 pkY)
    {
        Point storage pk = partialPubKey[eid][tallier];
        return (pk.x, pk.y);
    }

    function enoughDecMaterial(bytes32 eid) external view returns (bool) {
        return _enoughDecMaterial(eid);
    }
}
