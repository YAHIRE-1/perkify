// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {QuestEscrow} from "../src/QuestEscrow.sol";

/// Uso:
///   forge script script/Deploy.s.sol --rpc-url eth_sepolia --broadcast --verify
contract Deploy is Script {
    function run() external returns (QuestEscrow escrow) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address arbiter = vm.envAddress("ARBITER_ADDRESS");
        address signer = vm.envAddress("VOUCHER_SIGNER_ADDRESS");

        vm.startBroadcast(deployerKey);
        escrow = new QuestEscrow(arbiter, signer);
        vm.stopBroadcast();

        console.log("QuestEscrow deployed at:", address(escrow));
        console.log("Arbiter:", arbiter);
        console.log("Signer:", signer);
        console.log("Chain id:", block.chainid);
        console.log("Block:", block.number);
    }
}
