// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {QuestEscrow} from "../src/QuestEscrow.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract QuestEscrowTest is Test {
    QuestEscrow escrow;
    MockERC20 token;

    address arbiter = makeAddr("arbiter");
    address creator = makeAddr("creator");
    address luis = makeAddr("luis");
    address marta = makeAddr("marta");

    uint256 constant REWARD = 100e6; // 100 USDC
    uint64 constant GRACE = 3 days;
    uint64 constant REVIEW = 2 days;

    uint64 deadline;

    function setUp() public {
        escrow = new QuestEscrow(arbiter);
        token = new MockERC20();
        token.mint(creator, 1_000e6);
        deadline = uint64(block.timestamp + 7 days);
    }

    // ----- helpers -----

    function _create() internal returns (uint256 id) {
        vm.startPrank(creator);
        token.approve(address(escrow), REWARD);
        id = escrow.createQuest(token, REWARD, deadline, GRACE, REVIEW, "ipfs://quest");
        vm.stopPrank();
    }

    function _status(uint256 id) internal view returns (QuestEscrow.Status s) {
        (, , , , , , s, , , ) = escrow.quests(id);
    }

    // ----- creación -----

    function test_create_locksFunds() public {
        uint256 id = _create();
        assertEq(token.balanceOf(address(escrow)), REWARD);
        assertEq(token.balanceOf(creator), 900e6);
        assertEq(uint8(_status(id)), uint8(QuestEscrow.Status.Funded));
    }

    function test_create_revertsIfCreatorIsArbiter() public {
        token.mint(arbiter, REWARD);
        vm.startPrank(arbiter);
        token.approve(address(escrow), REWARD);
        vm.expectRevert("creator=arbiter");
        escrow.createQuest(token, REWARD, deadline, GRACE, REVIEW, "x");
        vm.stopPrank();
    }

    // ----- camino feliz -----

    function test_happyPath_approveAndWithdraw() public {
        uint256 id = _create();

        vm.prank(luis);
        escrow.submitClaim(id);

        vm.prank(creator);
        escrow.approve(id, luis);

        vm.prank(luis);
        escrow.withdrawReward(id);

        assertEq(token.balanceOf(luis), REWARD);
        assertEq(token.balanceOf(address(escrow)), 0);
        assertEq(uint8(_status(id)), uint8(QuestEscrow.Status.Paid));
    }

    function test_withdraw_onlyWinner() public {
        uint256 id = _create();
        vm.prank(luis);
        escrow.submitClaim(id);
        vm.prank(marta);
        escrow.submitClaim(id);
        vm.prank(creator);
        escrow.approve(id, luis);

        vm.prank(marta);
        vm.expectRevert(QuestEscrow.NotWinner.selector);
        escrow.withdrawReward(id);
    }

    function test_creatorCannotClaimOwnQuest() public {
        uint256 id = _create();
        vm.prank(creator);
        vm.expectRevert("creator can't claim");
        escrow.submitClaim(id);
    }

    function test_cannotClaimTwice() public {
        uint256 id = _create();
        vm.startPrank(luis);
        escrow.submitClaim(id);
        vm.expectRevert(QuestEscrow.AlreadyClaimed.selector);
        escrow.submitClaim(id);
        vm.stopPrank();
    }

    function test_cannotClaimAfterDeadline() public {
        uint256 id = _create();
        vm.warp(deadline);
        vm.prank(luis);
        vm.expectRevert(QuestEscrow.DeadlinePassed.selector);
        escrow.submitClaim(id);
    }

    // ----- el creador NO puede cobrar por silencio -----

    function test_refund_blockedWhileClaimPending() public {
        uint256 id = _create();
        vm.prank(luis);
        escrow.submitClaim(id);

        vm.warp(deadline + GRACE + 1);
        vm.prank(creator);
        vm.expectRevert(QuestEscrow.PendingClaims.selector);
        escrow.refund(id);
    }

    function test_refund_worksWithoutClaims() public {
        uint256 id = _create();
        vm.warp(deadline + GRACE);
        vm.prank(creator);
        escrow.refund(id);
        assertEq(token.balanceOf(creator), 1_000e6);
        assertEq(uint8(_status(id)), uint8(QuestEscrow.Status.Refunded));
    }

    function test_refund_tooEarly() public {
        uint256 id = _create();
        vm.warp(deadline + GRACE - 1);
        vm.prank(creator);
        vm.expectRevert(QuestEscrow.TooEarly.selector);
        escrow.refund(id);
    }

    function test_refund_afterRejectingAllClaims() public {
        uint256 id = _create();
        vm.prank(luis);
        escrow.submitClaim(id);
        vm.prank(creator);
        escrow.reject(id, luis);

        vm.warp(deadline + GRACE);
        vm.prank(creator);
        escrow.refund(id); // pendingClaims == 0, no revierte
        assertEq(uint8(_status(id)), uint8(QuestEscrow.Status.Refunded));
    }

    // ----- disputas -----

    function test_dispute_creatorIgnores_arbiterPaysClaimant() public {
        uint256 id = _create();
        vm.prank(luis);
        escrow.submitClaim(id);

        // antes de la ventana de revisión no se puede disputar
        vm.prank(luis);
        vm.expectRevert(QuestEscrow.TooEarly.selector);
        escrow.dispute(id);

        vm.warp(block.timestamp + REVIEW);
        vm.prank(luis);
        escrow.dispute(id);
        assertEq(uint8(_status(id)), uint8(QuestEscrow.Status.Disputed));

        vm.prank(arbiter);
        escrow.resolveDispute(id, luis);

        assertEq(token.balanceOf(luis), REWARD);
        assertEq(uint8(_status(id)), uint8(QuestEscrow.Status.Paid));
    }

    function test_dispute_afterReject_isImmediate() public {
        uint256 id = _create();
        vm.prank(luis);
        escrow.submitClaim(id);
        vm.prank(creator);
        escrow.reject(id, luis);

        vm.prank(luis);
        escrow.dispute(id); // sin esperar reviewWindow
        assertEq(uint8(_status(id)), uint8(QuestEscrow.Status.Disputed));
    }

    function test_dispute_arbiterRefundsCreator() public {
        uint256 id = _create();
        vm.prank(luis);
        escrow.submitClaim(id);
        vm.prank(creator);
        escrow.reject(id, luis);
        vm.prank(luis);
        escrow.dispute(id);

        vm.prank(arbiter);
        escrow.resolveDispute(id, address(0));

        assertEq(token.balanceOf(creator), 1_000e6);
        assertEq(uint8(_status(id)), uint8(QuestEscrow.Status.Refunded));
    }

    function test_resolve_onlyArbiter() public {
        uint256 id = _create();
        vm.prank(luis);
        escrow.submitClaim(id);
        vm.prank(creator);
        escrow.reject(id, luis);
        vm.prank(luis);
        escrow.dispute(id);

        vm.prank(creator);
        vm.expectRevert(QuestEscrow.NotArbiter.selector);
        escrow.resolveDispute(id, address(0));
    }

    function test_resolve_cannotPayNonClaimant() public {
        uint256 id = _create();
        vm.prank(luis);
        escrow.submitClaim(id);
        vm.prank(creator);
        escrow.reject(id, luis);
        vm.prank(luis);
        escrow.dispute(id);

        vm.prank(arbiter);
        vm.expectRevert(QuestEscrow.NotClaimant.selector);
        escrow.resolveDispute(id, marta); // marta nunca se postuló
    }

    function test_resolve_requiresDisputedStatus() public {
        uint256 id = _create();
        vm.prank(arbiter);
        vm.expectRevert(QuestEscrow.WrongStatus.selector);
        escrow.resolveDispute(id, address(0));
    }

    function test_nonClaimantCannotDispute() public {
        uint256 id = _create();
        vm.prank(marta);
        vm.expectRevert(QuestEscrow.NotClaimant.selector);
        escrow.dispute(id);
    }

    function test_creatorCannotApproveNonClaimant() public {
        uint256 id = _create();
        vm.prank(creator);
        vm.expectRevert(QuestEscrow.NotClaimant.selector);
        escrow.approve(id, marta);
    }

    function test_onlyCreatorCanApproveOrReject() public {
        uint256 id = _create();
        vm.prank(luis);
        escrow.submitClaim(id);

        vm.prank(marta);
        vm.expectRevert(QuestEscrow.NotCreator.selector);
        escrow.approve(id, luis);

        vm.prank(marta);
        vm.expectRevert(QuestEscrow.NotCreator.selector);
        escrow.reject(id, luis);
    }

    // ----- cambio de árbitro (2 pasos) -----

    function test_arbiterTransfer_twoSteps() public {
        address newArbiter = makeAddr("newArbiter");

        vm.prank(arbiter);
        escrow.transferArbiter(newArbiter);
        assertEq(escrow.arbiter(), arbiter); // aún no cambia

        vm.prank(newArbiter);
        escrow.acceptArbiter();
        assertEq(escrow.arbiter(), newArbiter);
    }

    function test_arbiterTransfer_onlyPendingCanAccept() public {
        vm.prank(arbiter);
        escrow.transferArbiter(makeAddr("newArbiter"));

        vm.prank(marta);
        vm.expectRevert("not pending");
        escrow.acceptArbiter();
    }

    // ----- invariante: los fondos nunca se pagan dos veces -----

    function test_cannotWithdrawTwice() public {
        uint256 id = _create();
        vm.prank(luis);
        escrow.submitClaim(id);
        vm.prank(creator);
        escrow.approve(id, luis);
        vm.startPrank(luis);
        escrow.withdrawReward(id);
        vm.expectRevert(QuestEscrow.WrongStatus.selector);
        escrow.withdrawReward(id);
        vm.stopPrank();
    }

    function testFuzz_reward_alwaysEndsWithOneParty(uint96 reward) public {
        reward = uint96(bound(reward, 1, 1_000e6));
        vm.startPrank(creator);
        token.approve(address(escrow), reward);
        uint256 id = escrow.createQuest(token, reward, deadline, GRACE, REVIEW, "x");
        vm.stopPrank();

        vm.prank(luis);
        escrow.submitClaim(id);
        vm.prank(creator);
        escrow.approve(id, luis);
        vm.prank(luis);
        escrow.withdrawReward(id);

        assertEq(token.balanceOf(luis), reward);
        assertEq(token.balanceOf(address(escrow)), 0);
    }
}
