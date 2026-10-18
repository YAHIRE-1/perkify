// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {QuestEscrow} from "../src/QuestEscrow.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";

/// SOLO PARA ANVIL (red local). Despliega un token falso + el escrow, y
/// reparte tokens a las wallets de prueba de Anvil.
///   cuenta 0 = deployer y creador de quests
///   cuenta 1 = árbitro
///   cuenta 2 y 3 = hunters
contract DeployLocal is Script {
    function run() external {
        address arbiter = vm.addr(vm.envUint("ARBITER_KEY")); // cuenta 1 de Anvil

        vm.startBroadcast(); // usa la --private-key que se pase por CLI
        MockERC20 token = new MockERC20();
        QuestEscrow escrow = new QuestEscrow(arbiter);
        token.mint(msg.sender, 10_000e6); // 10,000 mUSDC al creador
        vm.stopBroadcast();

        console.log("MockERC20 (mUSDC):", address(token));
        console.log("QuestEscrow:      ", address(escrow));
        console.log("Arbiter:          ", arbiter);
    }
}