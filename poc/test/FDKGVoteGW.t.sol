// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/FDKGVoteGW.sol";

/**
 * @title FDKGVoteGW Integration Tests
 *
 * Uses BabyJub test vectors for partial public keys and mock values for
 * encrypted shares and proofs (proof verification is mocked in the PoC).
 *
 * Test cases:
 *  1. test_pinParams               – happy-path pinning
 *  2. test_fullElectionFlow        – 2 talliers, 3 voters, full phases
 *  3. test_duplicateNullifierRejected – second cast with same nullifier reverts
 *  4. test_tallyFinalizedViaGuardianRecon – offline tallier, guardian recon path
 *  5. test_insufficientDecMaterialReverts – finalizeTally reverts if not enough material
 *  6. test_castOutsideWindow       – cast before tOpen or after tClose reverts
 *  7. test_keygenAfterTOpenReverts – FDKG gen after voting starts reverts
 *  8. test_nonEligibleVoterReverts – ineligible voter cannot cast
 *  9. test_nonGuardianReconReverts – non-guardian cannot post recon share
 */
contract FDKGVoteGWTest is Test {
    FDKGVoteGW gw;

    // Named actors
    address org      = makeAddr("org");
    address tallier1 = makeAddr("tallier1");
    address tallier2 = makeAddr("tallier2");
    address guardian1 = makeAddr("guardian1");
    address guardian2 = makeAddr("guardian2");
    address voter1   = makeAddr("voter1");
    address voter2   = makeAddr("voter2");
    address voter3   = makeAddr("voter3");
    address attacker = makeAddr("attacker");

    bytes32 constant EID = keccak256("election-001");

    // BabyJub Base8 test-vector point (used as mock partial public key)
    // Base8 = (5299619240641551281634865583518297030282874472190772894086521144482721001553,
    //          16950150798460657717958625567821834550301663161624707787222815936182638968203)
    uint256 constant BASE8_X = 5299619240641551281634865583518297030282874472190772894086521144482721001553;
    uint256 constant BASE8_Y = 16950150798460657717958625567821834550301663161624707787222815936182638968203;

    // A second mock point (arbitrary valid-looking BabyJub point for tallier2)
    uint256 constant PT2_X = 17777552123799933955779906779655732241715742912184938656739573121738514868268;
    uint256 constant PT2_Y = 2626589144620713026669568689430873010625803460240594936192429771607379076977;

    uint64 tOpen;
    uint64 tClose;

    function setUp() public {
        gw     = new FDKGVoteGW();
        tOpen  = uint64(block.timestamp + 100);
        tClose = uint64(block.timestamp + 200);
    }

    // ─── Helpers ──────────────────────────────────────────────────

    function _pin() internal {
        vm.prank(org);
        gw.pinParams(EID, tOpen, tClose, 1, bytes32(0));
    }

    function _pinWithTRec(uint16 tRec) internal {
        vm.prank(org);
        gw.pinParams(EID, tOpen, tClose, tRec, bytes32(0));
    }

    function _addVoters() internal {
        address[] memory voters = new address[](3);
        voters[0] = voter1;
        voters[1] = voter2;
        voters[2] = voter3;
        vm.prank(org);
        gw.addEligible(EID, voters);
    }

    /// @dev Post an FDKG gen message for tallier1 with guardian1, guardian2
    function _postGen1() internal {
        address[] memory guards = new address[](2);
        guards[0] = guardian1;
        guards[1] = guardian2;

        FDKGVoteGW.EncShare[] memory shares = new FDKGVoteGW.EncShare[](2);
        shares[0] = FDKGVoteGW.EncShare(
            FDKGVoteGW.Point(BASE8_X, BASE8_Y),
            FDKGVoteGW.Point(PT2_X,   PT2_Y),
            12345
        );
        shares[1] = FDKGVoteGW.EncShare(
            FDKGVoteGW.Point(PT2_X,   PT2_Y),
            FDKGVoteGW.Point(BASE8_X, BASE8_Y),
            67890
        );

        vm.prank(tallier1);
        gw.postFDKGGen(
            EID,
            FDKGVoteGW.Point(BASE8_X, BASE8_Y),
            guards,
            shares,
            ""
        );
    }

    /// @dev Post an FDKG gen message for tallier2 with guardian1, guardian2
    function _postGen2() internal {
        address[] memory guards = new address[](2);
        guards[0] = guardian1;
        guards[1] = guardian2;

        FDKGVoteGW.EncShare[] memory shares = new FDKGVoteGW.EncShare[](2);
        shares[0] = FDKGVoteGW.EncShare(
            FDKGVoteGW.Point(PT2_X, PT2_Y),
            FDKGVoteGW.Point(BASE8_X, BASE8_Y),
            11111
        );
        shares[1] = FDKGVoteGW.EncShare(
            FDKGVoteGW.Point(BASE8_X, BASE8_Y),
            FDKGVoteGW.Point(PT2_X, PT2_Y),
            22222
        );

        vm.prank(tallier2);
        gw.postFDKGGen(
            EID,
            FDKGVoteGW.Point(PT2_X, PT2_Y),
            guards,
            shares,
            ""
        );
    }

    function _castBallot(address voter, bytes32 nf) internal {
        vm.prank(voter);
        gw.castBallot(
            EID,
            FDKGVoteGW.Point(BASE8_X, BASE8_Y),
            FDKGVoteGW.Point(PT2_X, PT2_Y),
            nf,
            ""
        );
    }

    function _postDec(address tallier) internal {
        vm.prank(tallier);
        gw.postDecShare(
            EID,
            FDKGVoteGW.Point(BASE8_X, BASE8_Y),
            ""
        );
    }

    // ─── Tests ───────────────────────────────────────────────────

    function test_pinParams() public {
        _pin();

        (
            address org_,
            uint64 to,
            uint64 tc,
            uint16 tRec,
            ,
            bool pinned,
            bool finalized,
            ,
            ,
            ,
            ,

        ) = gw.getElectionInfo(EID);

        assertEq(org_, org,    "wrong organiser");
        assertEq(to, tOpen,    "wrong tOpen");
        assertEq(tc, tClose,   "wrong tClose");
        assertEq(tRec, 1,      "wrong tRec");
        assertTrue(pinned,     "should be pinned");
        assertFalse(finalized, "should not be finalized");
    }

    function test_pinParamsRevertsIfAlreadyPinned() public {
        _pin();
        vm.expectRevert("FDKGVoteGW: already pinned");
        vm.prank(org);
        gw.pinParams(EID, tOpen, tClose, 1, bytes32(0));
    }

    /**
     * @notice Full election lifecycle: 2 talliers, 3 voters, all online.
     *
     * Phases:
     *  1. pinParams
     *  2. addEligible
     *  3. postFDKGGen (tallier1, tallier2) → E = E1 + E2 on-chain
     *  4. warp to voting window
     *  5. castBallot (voter1, voter2, voter3)
     *  6. warp to decryption window
     *  7. postDecShare (tallier1, tallier2)
     *  8. finalizeTally
     */
    function test_fullElectionFlow() public {
        // 1-2
        _pin();
        _addVoters();

        // 3 — FDKG generation
        _postGen1();
        _postGen2();

        (,,,,,,,,uint256 pkX, uint256 pkY,,) = _electionInfo();
        // Election public key should no longer be identity (0,1) after two additions
        assertTrue(pkX != 0 || pkY != 1, "election key should be updated");

        // 4
        vm.warp(tOpen);

        // 5
        bytes32 nf1 = keccak256(abi.encodePacked("v1", EID));
        bytes32 nf2 = keccak256(abi.encodePacked("v2", EID));
        bytes32 nf3 = keccak256(abi.encodePacked("v3", EID));
        _castBallot(voter1, nf1);
        _castBallot(voter2, nf2);
        _castBallot(voter3, nf3);

        FDKGVoteGW.Ballot[] memory ballots = gw.getBallots(EID);
        assertEq(ballots.length, 3, "should have 3 ballots");

        // 6
        vm.warp(tClose);

        // 7
        _postDec(tallier1);
        _postDec(tallier2);

        assertTrue(gw.enoughDecMaterial(EID), "should have enough dec material");

        // 8
        uint256[] memory result = new uint256[](2);
        result[0] = 2; // 2 votes option 1
        result[1] = 1; // 1 vote  option 2
        gw.finalizeTally(EID, result);

        (,,,,,, bool finalized,,,,, ) = gw.getElectionInfo(EID);
        assertTrue(finalized, "should be finalized");

        uint256[] memory stored = gw.getTallyResult(EID);
        assertEq(stored[0], 2);
        assertEq(stored[1], 1);
    }

    /// @notice Second cast with the same nullifier must revert.
    function test_duplicateNullifierRejected() public {
        _pin();
        _addVoters();
        _postGen1();
        vm.warp(tOpen);

        bytes32 nf = keccak256("unique-nf");
        _castBallot(voter1, nf);

        vm.expectRevert("FDKGVoteGW: nullifier already used");
        vm.prank(voter2);
        gw.castBallot(
            EID,
            FDKGVoteGW.Point(1, 2),
            FDKGVoteGW.Point(3, 4),
            nf, // SAME nullifier
            ""
        );
    }

    /**
     * @notice Tallier1 offline — guardian1 and guardian2 post recon shares.
     *         With tRec=2 this satisfies the threshold; finalizeTally should succeed.
     */
    function test_tallyFinalizedViaGuardianRecon() public {
        _pinWithTRec(2);
        _addVoters();
        _postGen1(); // tallier1 with guardian1, guardian2

        vm.warp(tOpen);
        _castBallot(voter1, keccak256("nf-recon-1"));

        vm.warp(tClose);

        // tallier1 is offline (no postDecShare)

        // guardian1 posts recon share
        vm.prank(guardian1);
        gw.postReconShare(EID, tallier1, 1, 11111111, "");

        // guardian2 posts recon share
        vm.prank(guardian2);
        gw.postReconShare(EID, tallier1, 2, 22222222, "");

        assertTrue(gw.enoughDecMaterial(EID), "should have enough via guardian recon");

        uint256[] memory result = new uint256[](2);
        result[0] = 1;
        result[1] = 0;
        gw.finalizeTally(EID, result);

        (,,,,,, bool finalized,,,,, ) = gw.getElectionInfo(EID);
        assertTrue(finalized);
    }

    /// @notice finalizeTally reverts if reconCount < tRec and no direct dec share.
    function test_insufficientDecMaterialReverts() public {
        _pinWithTRec(2);
        _addVoters();
        _postGen1(); // tallier1, tRec=2

        vm.warp(tOpen);
        _castBallot(voter1, keccak256("nf-insuf"));
        vm.warp(tClose);

        // Only ONE guardian posts (threshold is 2)
        vm.prank(guardian1);
        gw.postReconShare(EID, tallier1, 1, 99999, "");

        assertFalse(gw.enoughDecMaterial(EID));

        uint256[] memory result = new uint256[](1);
        result[0] = 1;
        vm.expectRevert("FDKGVoteGW: insufficient decryption material");
        gw.finalizeTally(EID, result);
    }

    /// @notice Cast before tOpen and after tClose must revert.
    function test_castOutsideWindow() public {
        _pin();
        _addVoters();
        _postGen1();

        bytes32 nf = keccak256("nf-window");

        // Before tOpen
        vm.expectRevert("FDKGVoteGW: not in voting window");
        vm.prank(voter1);
        gw.castBallot(EID, FDKGVoteGW.Point(1,2), FDKGVoteGW.Point(3,4), nf, "");

        // After tClose
        vm.warp(tClose);
        vm.expectRevert("FDKGVoteGW: not in voting window");
        vm.prank(voter1);
        gw.castBallot(EID, FDKGVoteGW.Point(1,2), FDKGVoteGW.Point(3,4), nf, "");
    }

    /// @notice FDKG generation after voting starts must revert.
    function test_keygenAfterTOpenReverts() public {
        _pin();
        vm.warp(tOpen);

        address[] memory guards = new address[](1);
        guards[0] = guardian1;
        FDKGVoteGW.EncShare[] memory shares = new FDKGVoteGW.EncShare[](1);
        shares[0] = FDKGVoteGW.EncShare(FDKGVoteGW.Point(1,2), FDKGVoteGW.Point(3,4), 5);

        vm.expectRevert("FDKGVoteGW: keygen window closed");
        vm.prank(tallier1);
        gw.postFDKGGen(EID, FDKGVoteGW.Point(BASE8_X, BASE8_Y), guards, shares, "");
    }

    /// @notice Non-eligible voter cannot cast.
    function test_nonEligibleVoterReverts() public {
        _pin();
        _addVoters();
        _postGen1();
        vm.warp(tOpen);

        vm.expectRevert("FDKGVoteGW: not eligible");
        vm.prank(attacker);
        gw.castBallot(
            EID,
            FDKGVoteGW.Point(BASE8_X, BASE8_Y),
            FDKGVoteGW.Point(PT2_X, PT2_Y),
            keccak256("hacker-nf"),
            ""
        );
    }

    /// @notice A non-guardian cannot post a recon share.
    function test_nonGuardianReconReverts() public {
        _pin();
        _postGen1(); // guardian1, guardian2 registered for tallier1
        vm.warp(tClose);

        vm.expectRevert("FDKGVoteGW: not a guardian");
        vm.prank(attacker);
        gw.postReconShare(EID, tallier1, 1, 12345, "");
    }

    /// @notice BabyJub identity element is (0,1); adding identity to any point
    ///         returns the same point (smoke test for BabyJub.add).
    function test_babyJubAddIdentity() public view {
        BabyJub.Point memory id = BabyJub.identity();
        BabyJub.Point memory p  = BabyJub.Point(BASE8_X, BASE8_Y);
        BabyJub.Point memory r  = BabyJub.add(id, p);
        assertEq(r.x, BASE8_X, "x should be unchanged");
        assertEq(r.y, BASE8_Y, "y should be unchanged");
    }

    // ─── Internal decode helper ───────────────────────────────────

    function _electionInfo()
        internal
        view
        returns (
            address, uint64, uint64, uint16, bytes32,
            bool, bool, uint256, uint256, uint256, uint256, uint256
        )
    {
        return gw.getElectionInfo(EID);
    }
}
