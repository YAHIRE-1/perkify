// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// Flujo:
/// 1. El creador crea y fondea la quest en una sola tx (fondos bloqueados).
/// 2. Cualquiera se postula (submitClaim) antes del deadline.
/// 3. El creador aprueba a un postulante (approve) o lo rechaza (reject).
/// 4. Si el creador no responde en reviewWindow, o rechaza, el postulante
///    puede abrir una disputa (dispute).
/// 5. La plataforma (arbiter) resuelve: paga al postulante o devuelve al creador.
/// 6. El creador solo puede recuperar fondos (refund) si NO hay postulaciones
///    pendientes ni disputas abiertas, y ya pasó deadline + gracia.
contract QuestEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status { Funded, Approved, Disputed, Paid, Refunded }

    struct Quest {
        address creator;
        IERC20 token;
        uint256 reward;
        uint64 deadline;
        uint64 refundGrace;   // margen tras el deadline antes de poder hacer refund
        uint64 reviewWindow;  // tiempo que tiene el creador para responder a un claim
        Status status;
        address winner;
        uint32 pendingClaims; // claims ni rechazados ni resueltos
        string uri;
    }

    struct Claim {
        uint64 submittedAt;
        bool rejected;
        bool exists;
    }

    address public arbiter; // plataforma (idealmente un multisig)
    address public pendingArbiter;

    uint256 public questCount;
    mapping(uint256 => Quest) public quests;
    mapping(uint256 => mapping(address => Claim)) public claims;

    event QuestCreated(uint256 indexed id, address indexed creator, address token, uint256 reward, uint64 deadline);
    event ClaimSubmitted(uint256 indexed id, address indexed claimant);
    event ClaimRejected(uint256 indexed id, address indexed claimant);
    event QuestApproved(uint256 indexed id, address indexed winner);
    event DisputeOpened(uint256 indexed id, address indexed claimant);
    event DisputeResolved(uint256 indexed id, address indexed arbiter, address indexed winner);
    event RewardPaid(uint256 indexed id, address indexed winner, uint256 amount);
    event QuestRefunded(uint256 indexed id, address indexed creator, uint256 amount);
    event ArbiterTransferStarted(address indexed newArbiter);
    event ArbiterChanged(address indexed newArbiter);

    error NotCreator();
    error NotArbiter();
    error NotWinner();
    error WrongStatus();
    error DeadlinePassed();
    error NotClaimant();
    error TooEarly();
    error PendingClaims();
    error AlreadyClaimed();

    modifier onlyArbiter() {
        _onlyArbiter();
        _;
    }

    function _onlyArbiter() internal view {
        if (msg.sender != arbiter) revert NotArbiter();
    }

    constructor(address _arbiter) {
        require(_arbiter != address(0), "arbiter=0");
        arbiter = _arbiter;
    }

    // ---------------------------------------------------------------
    // Creación (con fondeo incluido)
    // ---------------------------------------------------------------

    /// Requiere approve previo del token a este contrato.
    function createQuest(
        IERC20 token,
        uint256 reward,
        uint64 deadline,
        uint64 refundGrace,
        uint64 reviewWindow,
        string calldata uri
    ) external nonReentrant returns (uint256 id) {
        require(reward > 0, "reward=0");
        require(deadline > block.timestamp, "bad deadline");
        require(msg.sender != arbiter, "creator=arbiter");

        id = ++questCount;
        quests[id] = Quest({
            creator: msg.sender,
            token: token,
            reward: reward,
            deadline: deadline,
            refundGrace: refundGrace,
            reviewWindow: reviewWindow,
            status: Status.Funded,
            winner: address(0),
            pendingClaims: 0,
            uri: uri
        });

        token.safeTransferFrom(msg.sender, address(this), reward);
        emit QuestCreated(id, msg.sender, address(token), reward, deadline);
    }

    // ---------------------------------------------------------------
    // Postulación y decisión del creador
    // ---------------------------------------------------------------

    function submitClaim(uint256 id) external {
        Quest storage q = quests[id];
        if (q.status != Status.Funded) revert WrongStatus();
        if (block.timestamp >= q.deadline) revert DeadlinePassed();
        require(msg.sender != q.creator, "creator can't claim");
        if (claims[id][msg.sender].exists) revert AlreadyClaimed();

        claims[id][msg.sender] = Claim({submittedAt: uint64(block.timestamp), rejected: false, exists: true});
        q.pendingClaims++;
        emit ClaimSubmitted(id, msg.sender);
    }

    function approve(uint256 id, address claimant) external {
        Quest storage q = quests[id];
        if (msg.sender != q.creator) revert NotCreator();
        if (q.status != Status.Funded) revert WrongStatus();
        if (!claims[id][claimant].exists) revert NotClaimant();

        q.winner = claimant;
        q.status = Status.Approved;
        emit QuestApproved(id, claimant);
    }

    /// Rechazar libera el claim del contador de pendientes, pero el
    /// postulante conserva el derecho a disputar.
    function reject(uint256 id, address claimant) external {
        Quest storage q = quests[id];
        if (msg.sender != q.creator) revert NotCreator();
        if (q.status != Status.Funded) revert WrongStatus();
        Claim storage c = claims[id][claimant];
        if (!c.exists || c.rejected) revert NotClaimant();

        c.rejected = true;
        q.pendingClaims--;
        emit ClaimRejected(id, claimant);
    }

    // ---------------------------------------------------------------
    // Disputa y arbitraje
    // ---------------------------------------------------------------

    /// Un postulante puede disputar si fue rechazado o si el creador no
    /// respondió dentro de reviewWindow.
    function dispute(uint256 id) external {
        Quest storage q = quests[id];
        if (q.status != Status.Funded) revert WrongStatus();
        Claim storage c = claims[id][msg.sender];
        if (!c.exists) revert NotClaimant();
        if (!c.rejected && block.timestamp < c.submittedAt + q.reviewWindow) revert TooEarly();

        q.status = Status.Disputed;
        emit DisputeOpened(id, msg.sender);
    }

    /// La plataforma decide. winner = un postulante, o address(0) para
    /// devolver los fondos al creador.
    function resolveDispute(uint256 id, address winner) external onlyArbiter nonReentrant {
        Quest storage q = quests[id];
        if (q.status != Status.Disputed) revert WrongStatus();

        emit DisputeResolved(id, msg.sender, winner);

        if (winner == address(0)) {
            q.status = Status.Refunded;
            q.token.safeTransfer(q.creator, q.reward);
            emit QuestRefunded(id, q.creator, q.reward);
        } else {
            if (!claims[id][winner].exists) revert NotClaimant();
            q.winner = winner;
            q.status = Status.Paid;
            q.token.safeTransfer(winner, q.reward);
            emit RewardPaid(id, winner, q.reward);
        }
    }

    // ---------------------------------------------------------------
    // Pagos y reembolso
    // ---------------------------------------------------------------

    function withdrawReward(uint256 id) external nonReentrant {
        Quest storage q = quests[id];
        if (q.status != Status.Approved) revert WrongStatus();
        if (msg.sender != q.winner) revert NotWinner();
        q.status = Status.Paid;
        q.token.safeTransfer(msg.sender, q.reward);
        emit RewardPaid(id, msg.sender, q.reward);
    }

    /// El creador solo recupera fondos si ya pasó deadline + gracia y
    /// no quedan claims pendientes. Los rechazados aún pueden disputar
    /// hasta que se ejecute el refund.
    function refund(uint256 id) external nonReentrant {
        Quest storage q = quests[id];
        if (msg.sender != q.creator) revert NotCreator();
        if (q.status != Status.Funded) revert WrongStatus();
        if (block.timestamp < q.deadline + q.refundGrace) revert TooEarly();
        if (q.pendingClaims != 0) revert PendingClaims();

        q.status = Status.Refunded;
        q.token.safeTransfer(q.creator, q.reward);
        emit QuestRefunded(id, q.creator, q.reward);
    }

    // ---------------------------------------------------------------
    // Cambio de árbitro (dos pasos)
    // ---------------------------------------------------------------

    function transferArbiter(address newArbiter) external onlyArbiter {
        pendingArbiter = newArbiter;
        emit ArbiterTransferStarted(newArbiter);
    }

    function acceptArbiter() external {
        require(msg.sender == pendingArbiter, "not pending");
        arbiter = pendingArbiter;
        pendingArbiter = address(0);
        emit ArbiterChanged(arbiter);
    }
}
