// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/FDKGVoteGW.sol";

/**
 * @notice Deploy FDKGVoteGW and (optionally) pin a demo election.
 *
 * Usage:
 *   # Start local node first:
 *   anvil
 *
 *   # Deploy only (prints contract address):
 *   forge script script/Deploy.s.sol \
 *     --rpc-url http://localhost:8545 \
 *     --broadcast \
 *     --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
 *
 *   # Deploy + pin a demo election:
 *   DEMO=true forge script script/Deploy.s.sol \
 *     --rpc-url http://localhost:8545 \
 *     --broadcast \
 *     --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
 *
 *   # With Anvil's default sender (no --private-key needed on a local node):
 *   forge script script/Deploy.s.sol \
 *     --rpc-url http://localhost:8545 \
 *     --broadcast \
 *     --unlocked \
 *     --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
 */
contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();

        FDKGVoteGW gw = new FDKGVoteGW();

        console2.log("FDKGVoteGW deployed at:", address(gw));

        // Optionally pin a demo election if DEMO=true
        bool demo = vm.envOr("DEMO", false);
        if (demo) {
            bytes32 eid      = keccak256("demo-election-001");
            uint64  tOpen    = uint64(block.timestamp + 60);   // keygen window: 60 s
            uint64  tClose   = uint64(block.timestamp + 180);  // voting window: 120 s
            uint16  tRec     = 2;
            bytes32 root     = bytes32(0);

            gw.pinParams(eid, tOpen, tClose, tRec, root);
            console2.log("Demo election pinned.");
            console2.log("  eid:    ", vm.toString(eid));
            console2.log("  tOpen:  ", tOpen);
            console2.log("  tClose: ", tClose);
            console2.log("  tRec:   ", uint256(tRec));
        }

        vm.stopBroadcast();

        // Write address to file for webapp to consume
        string memory out = vm.toString(address(gw));
        vm.writeFile("./out/contract_address.txt", out);
        console2.log("Contract address written to out/contract_address.txt");
    }
}
