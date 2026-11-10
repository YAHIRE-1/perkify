// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {QuestEscrow} from "../src/QuestEscrow.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/// Token mínimo que cobra 1% por transferencia (para probar el rechazo de fee-on-transfer)
contract FeeToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 v) external { balanceOf[to] += v; }

    function approve(address s, uint256 v) external returns (bool) {
        allowance[msg.sender][s] = v;
        return true;
    }

    function transfer(address to, uint256 v) external returns (bool) {
        balanceOf[msg.sender] -= v;
        balanceOf[to] += v - v / 100;
        return true;
    }

    function transferFrom(address from, address to, uint256 v) external returns (bool) {
        allowance[from][msg.sender] -= v;
        balanceOf[from] -= v;
        balanceOf[to] += v - v / 100;
        return true;
    }
}

contract QuestEscrowTest is Test {
    QuestEscrow escrow;
    MockERC20 token;

    uint256 constant SIGNER_PK = 0xA11CE;
    uint256 constant ATTACKER_PK = 0xBAD;

    address signer = vm.addr(SIGNER_PK);
    address arbiter = makeAddr("arbiter");
    address creator = makeAddr("creator");
    address luis = makeAddr("luis");
    address marta = makeAddr("marta");

    uint256 constant REWARD = 100e6; // 100 USDC
    uint64 deadline;

    function setUp() public {
        escrow = new QuestEscrow(arbiter, signer);
        token = new MockERC20();
        token.mint(creator, 1_000e6);
        deadline = uint64(block.timestamp + 7 days);
    }

    // ---------- helpers ----------

    function _create() internal returns (uint256 id) {
        vm.startPrank(creator);
        token.approve(address(escrow), REWARD);
        id = escrow.createQuest(IERC20(address(token)), REWARD, deadline, "quest-1");
        vm.stopPrank();
    }

    function _status(uint256 id) internal view returns (QuestEscrow.Status s) {
        // creator, token, reward, deadline, status, winner, uri
        (, , , , s, , ) = escrow.quests(id);
    }

    function _digest(bytes32 structHash) internal view returns (bytes32) {
        bytes32 domain = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("QuestEscrow"), keccak256("1"), block.chainid, address(escrow)
        ));
        return keccak256(abi.encodePacked("\x19\x01", domain, structHash));
    }

    function _approvalSig(uint256 pk, uint256 id, address who, address winner, uint64 expiry)
        internal view returns (bytes memory)
    {
        bytes32 sh = keccak256(abi.encode(
            keccak256("Approval(uint256 id,address creator,address winner,uint64 expiry)"),
            id, who, winner, expiry
        ));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, _digest(sh));
        return abi.encodePacked(r, s, v);
    }

    function _cancelSig(uint256 pk, uint256 id, address who, uint64 expiry)
        internal view returns (bytes memory)
    {
        bytes32 sh = keccak256(abi.encode(
            keccak256("Cancel(uint256 id,address creator,uint64 expiry)"), id, who, expiry
        ));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, _digest(sh));
        return abi.encodePacked(r, s, v);
    }

    function _exp() internal view returns (uint64) {
        return uint64(block.timestamp + 10 minutes);
    }

    function _approve(uint256 id, address winner) internal {
        uint64 exp = _exp();
        vm.prank(creator);
        escrow.approve(id, winner, exp, _approvalSig(SIGNER_PK, id, creator, winner, exp));
    }

    // ---------- creación ----------

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
        vm.expectRevert(QuestEscrow.BadParams.selector);
        escrow.createQuest(IERC20(address(token)), REWARD, deadline, "x");
        vm.stopPrank();
    }

    function test_create_revertsOnZeroRewardOrPastDeadline() public {
        vm.startPrank(creator);
        vm.expectRevert(QuestEscrow.BadParams.selector);
        escrow.createQuest(IERC20(address(token)), 0, deadline, "x");
        vm.expectRevert(QuestEscrow.BadParams.selector);
        escrow.createQuest(IERC20(address(token)), 1, uint64(block.timestamp), "x");
        vm.stopPrank();
    }

    function test_create_rejectsFeeOnTransferToken() public {
        FeeToken fee = new FeeToken();
        fee.mint(creator, 1_000e6);
        vm.startPrank(creator);
        fee.approve(address(escrow), REWARD);
        vm.expectRevert(QuestEscrow.BadParams.selector);
        escrow.createQuest(IERC20(address(fee)), REWARD, deadline, "x");
        vm.stopPrank();
    }

    // ---------- camino feliz ----------

    function test_happyPath_approveAndWithdraw() public {
        uint256 id = _create();
        _approve(id, luis);
        assertEq(uint8(_status(id)), uint8(QuestEscrow.Status.Approved));

        vm.prank(luis);
        escrow.withdrawReward(id);

        assertEq(token.balanceOf(luis), REWARD);
        assertEq(token.balanceOf(address(escrow)), 0);
        assertEq(uint8(_status(id)), uint8(QuestEscrow.Status.Paid));
    }

    function test_withdraw_onlyWinnerAndOnlyOnce() public {
        uint256 id = _create();
        _approve(id, luis);

        vm.prank(marta);
        vm.expectRevert(QuestEscrow.NotWinner.selector);
        escrow.withdrawReward(id);

        vm.startPrank(luis);
        escrow.withdrawReward(id);
        vm.expectRevert(QuestEscrow.WrongStatus.selector);
        escrow.withdrawReward(id);
        vm.stopPrank();
    }

    function test_withdraw_revertsWithoutApproval() public {
        uint256 id = _create();
        vm.prank(luis);
        vm.expectRevert(QuestEscrow.WrongStatus.selector);
        escrow.withdrawReward(id);
    }

    // ---------- approve: firma del backend ----------

    function test_approve_revertsWithWrongSigner() public {
        uint256 id = _create();
        uint64 exp = _exp();
        bytes memory sig = _approvalSig(ATTACKER_PK, id, creator, luis, exp);
        vm.prank(creator);
        vm.expectRevert(QuestEscrow.BadSignature.selector);
        escrow.approve(id, luis, exp, sig);
    }

    function test_approve_creatorCannotSwapWinner() public {
        uint256 id = _create();
        uint64 exp = _exp();
        bytes memory sig = _approvalSig(SIGNER_PK, id, creator, luis, exp);
        vm.prank(creator);
        vm.expectRevert(QuestEscrow.BadSignature.selector);
        escrow.approve(id, marta, exp, sig); // firma era para luis
    }

    function test_approve_revertsIfExpired() public {
        uint256 id = _create();
        uint64 exp = _exp();
        bytes memory sig = _approvalSig(SIGNER_PK, id, creator, luis, exp);
        vm.warp(uint256(exp) + 1);
        vm.prank(creator);
        vm.expectRevert(QuestEscrow.Expired.selector);
        escrow.approve(id, luis, exp, sig);
    }

    function test_approve_onlyCreator() public {
        uint256 id = _create();
        uint64 exp = _exp();
        bytes memory sig = _approvalSig(SIGNER_PK, id, creator, luis, exp);
        vm.prank(marta);
        vm.expectRevert(QuestEscrow.NotCreator.selector);
        escrow.approve(id, luis, exp, sig);
    }

    function test_approve_twiceReverts() public {
        uint256 id = _create();
        uint64 exp = _exp();
        bytes memory sig = _approvalSig(SIGNER_PK, id, creator, luis, exp);
        vm.startPrank(creator);
        escrow.approve(id, luis, exp, sig);
        vm.expectRevert(QuestEscrow.WrongStatus.selector);
        escrow.approve(id, luis, exp, sig);
        vm.stopPrank();
    }

    function test_approve_revertsForZeroOrSelfWinner() public {
        uint256 id = _create();
        uint64 exp = _exp();

        bytes memory sigZero = _approvalSig(SIGNER_PK, id, creator, address(0), exp);
        vm.prank(creator);
        vm.expectRevert(QuestEscrow.BadParams.selector);
        escrow.approve(id, address(0), exp, sigZero);

        bytes memory sigSelf = _approvalSig(SIGNER_PK, id, creator, creator, exp);
        vm.prank(creator);
        vm.expectRevert(QuestEscrow.BadParams.selector);
        escrow.approve(id, creator, exp, sigSelf);
    }

    function test_approve_signatureNotValidForAnotherQuest() public {
        uint256 id1 = _create();
        uint256 id2 = _create();
        uint64 exp = _exp();
        bytes memory sig = _approvalSig(SIGNER_PK, id1, creator, luis, exp);
        vm.prank(creator);
        vm.expectRevert(QuestEscrow.BadSignature.selector);
        escrow.approve(id2, luis, exp, sig);
    }

    function test_rotatedSignerInvalidatesOldSignatures() public {
        uint256 id = _create();
        uint64 exp = _exp();
        bytes memory sig = _approvalSig(SIGNER_PK, id, creator, luis, exp);

        vm.prank(arbiter);
        escrow.setSigner(vm.addr(0xC0FFEE));

        vm.prank(creator);
        vm.expectRevert(QuestEscrow.BadSignature.selector);
        escrow.approve(id, luis, exp, sig);
    }

    // ---------- cancelar y refund de emergencia ----------

    function test_cancel_withSignature() public {
        uint256 id = _create();
        uint64 exp = _exp();
        vm.prank(creator);
        escrow.cancelQuest(id, exp, _cancelSig(SIGNER_PK, id, creator, exp));
        assertEq(token.balanceOf(creator), 1_000e6);
        assertEq(uint8(_status(id)), uint8(QuestEscrow.Status.Refunded));
    }

    function test_cancel_withoutPlatformSignatureReverts() public {
        uint256 id = _create();
        uint64 exp = _exp();
        bytes memory sig = _cancelSig(ATTACKER_PK, id, creator, exp);
        vm.prank(creator);
        vm.expectRevert(QuestEscrow.BadSignature.selector);
        escrow.cancelQuest(id, exp, sig);
    }

    function test_cancel_signatureCannotBeReplayed() public {
        uint256 id = _create();
        uint64 exp = _exp();
        bytes memory sig = _cancelSig(SIGNER_PK, id, creator, exp);
        vm.startPrank(creator);
        escrow.cancelQuest(id, exp, sig);
        vm.expectRevert(QuestEscrow.WrongStatus.selector);
        escrow.cancelQuest(id, exp, sig);
        vm.stopPrank();
    }

    function test_cancel_revertsIfExpiredOrNotCreator() public {
        uint256 id = _create();
        uint64 exp = _exp();
        bytes memory sig = _cancelSig(SIGNER_PK, id, creator, exp);

        vm.prank(marta);
        vm.expectRevert(QuestEscrow.NotCreator.selector);
        escrow.cancelQuest(id, exp, sig);

        vm.warp(uint256(exp) + 1);
        vm.prank(creator);
        vm.expectRevert(QuestEscrow.Expired.selector);
        escrow.cancelQuest(id, exp, sig);
    }

    function test_cancel_revertsAfterApproval() public {
        uint256 id = _create();
        _approve(id, luis);
        uint64 exp = _exp();
        bytes memory sig = _cancelSig(SIGNER_PK, id, creator, exp);
        vm.prank(creator);
        vm.expectRevert(QuestEscrow.WrongStatus.selector);
        escrow.cancelQuest(id, exp, sig);
    }

    function test_refund_onlyAfterEmergencyDelay() public {
        uint256 id = _create();

        vm.startPrank(creator);
        vm.expectRevert(QuestEscrow.TooEarly.selector);
        escrow.refund(id);

        vm.warp(uint256(deadline) + escrow.EMERGENCY_REFUND_DELAY() - 1);
        vm.expectRevert(QuestEscrow.TooEarly.selector);
        escrow.refund(id);

        vm.warp(uint256(deadline) + escrow.EMERGENCY_REFUND_DELAY());
        escrow.refund(id);
        vm.stopPrank();

        assertEq(token.balanceOf(creator), 1_000e6);
        assertEq(uint8(_status(id)), uint8(QuestEscrow.Status.Refunded));
    }

    function test_refund_onlyCreator() public {
        uint256 id = _create();
        vm.warp(uint256(deadline) + escrow.EMERGENCY_REFUND_DELAY());
        vm.prank(marta);
        vm.expectRevert(QuestEscrow.NotCreator.selector);
        escrow.refund(id);
    }

    function test_refund_revertsAfterApproval() public {
        uint256 id = _create();
        _approve(id, luis);
        vm.warp(uint256(deadline) + escrow.EMERGENCY_REFUND_DELAY());
        vm.prank(creator);
        vm.expectRevert(QuestEscrow.WrongStatus.selector);
        escrow.refund(id);
    }

    // ---------- disputas ----------

    function test_dispute_blocksRefund_arbiterPaysWinner() public {
        uint256 id = _create();
        vm.prank(arbiter);
        escrow.openDispute(id);
        assertEq(uint8(_status(id)), uint8(QuestEscrow.Status.Disputed));

        vm.warp(uint256(deadline) + escrow.EMERGENCY_REFUND_DELAY());
        vm.prank(creator);
        vm.expectRevert(QuestEscrow.WrongStatus.selector);
        escrow.refund(id);

        vm.prank(arbiter);
        escrow.resolveDispute(id, luis);

        assertEq(token.balanceOf(luis), REWARD);
        assertEq(uint8(_status(id)), uint8(QuestEscrow.Status.Paid));
    }

    function test_dispute_arbiterRefundsCreator() public {
        uint256 id = _create();
        vm.startPrank(arbiter);
        escrow.openDispute(id);
        escrow.resolveDispute(id, address(0));
        vm.stopPrank();

        assertEq(token.balanceOf(creator), 1_000e6);
        assertEq(uint8(_status(id)), uint8(QuestEscrow.Status.Refunded));
    }

    function test_dispute_blocksCancelAndApprove() public {
        uint256 id = _create();
        uint64 exp = _exp();
        bytes memory cSig = _cancelSig(SIGNER_PK, id, creator, exp);
        bytes memory aSig = _approvalSig(SIGNER_PK, id, creator, luis, exp);

        vm.prank(arbiter);
        escrow.openDispute(id);

        vm.startPrank(creator);
        vm.expectRevert(QuestEscrow.WrongStatus.selector);
        escrow.cancelQuest(id, exp, cSig);
        vm.expectRevert(QuestEscrow.WrongStatus.selector);
        escrow.approve(id, luis, exp, aSig);
        vm.stopPrank();
    }

    function test_openDispute_onlyArbiterAndOnlyWhenFunded() public {
        uint256 id = _create();

        vm.prank(marta);
        vm.expectRevert(QuestEscrow.NotArbiter.selector);
        escrow.openDispute(id);

        _approve(id, luis);
        vm.prank(arbiter);
        vm.expectRevert(QuestEscrow.WrongStatus.selector);
        escrow.openDispute(id);
    }

    function test_resolve_onlyArbiterAndRequiresDisputed() public {
        uint256 id = _create();

        vm.prank(arbiter);
        vm.expectRevert(QuestEscrow.WrongStatus.selector);
        escrow.resolveDispute(id, address(0));

        vm.prank(arbiter);
        escrow.openDispute(id);

        vm.prank(creator);
        vm.expectRevert(QuestEscrow.NotArbiter.selector);
        escrow.resolveDispute(id, address(0));
    }

    // ---------- administración ----------

    function test_setSigner_onlyArbiterAndNonZero() public {
        vm.prank(marta);
        vm.expectRevert(QuestEscrow.NotArbiter.selector);
        escrow.setSigner(marta);

        vm.prank(arbiter);
        vm.expectRevert(QuestEscrow.BadParams.selector);
        escrow.setSigner(address(0));

        vm.prank(arbiter);
        escrow.setSigner(marta);
        assertEq(escrow.signer(), marta);
    }

    function test_constructor_rejectsZeroAddresses() public {
        vm.expectRevert(QuestEscrow.BadParams.selector);
        new QuestEscrow(address(0), signer);
        vm.expectRevert(QuestEscrow.BadParams.selector);
        new QuestEscrow(arbiter, address(0));
    }

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
        vm.expectRevert(QuestEscrow.NotArbiter.selector);
        escrow.acceptArbiter();
    }

    // ---------- fuzz ----------

    function testFuzz_reward_alwaysEndsWithOneParty(uint96 reward) public {
        reward = uint96(bound(reward, 1, 1_000e6));
        vm.startPrank(creator);
        token.approve(address(escrow), reward);
        uint256 id = escrow.createQuest(IERC20(address(token)), reward, deadline, "x");
        vm.stopPrank();

        uint64 exp = _exp();
        vm.prank(creator);
        escrow.approve(id, luis, exp, _approvalSig(SIGNER_PK, id, creator, luis, exp));
        vm.prank(luis);
        escrow.withdrawReward(id);

        assertEq(token.balanceOf(luis), reward);
        assertEq(token.balanceOf(address(escrow)), 0);
    }
}
