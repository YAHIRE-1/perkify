// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// El contrato solo custodia dinero. El proceso (participantes, evidencia, plazos)
/// vive en la plataforma, que autoriza con firmas EIP-712 lo que mueve fondos:
///  - approve:     el creador elige ganador, con firma del backend para ESE ganador
///  - cancelQuest: el creador cancela, con firma del backend (sin participantes activos)
///  - withdrawReward: el ganador cobra
///  - refund:      salida de emergencia del creador, tras deadline + 30 días
///  - openDispute / resolveDispute: solo el árbitro
contract QuestEscrow is ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    enum Status { Funded, Approved, Disputed, Paid, Refunded }

    struct Quest {
        address creator;
        IERC20 token;
        uint256 reward;
        uint64 deadline;
        Status status;
        address winner;
        string uri; // id de la quest en la plataforma
    }

    uint64 public constant EMERGENCY_REFUND_DELAY = 30 days;

    bytes32 private constant APPROVAL_TYPEHASH =
        keccak256("Approval(uint256 id,address creator,address winner,uint64 expiry)");
    bytes32 private constant CANCEL_TYPEHASH =
        keccak256("Cancel(uint256 id,address creator,uint64 expiry)");

    address public arbiter;
    address public pendingArbiter;
    address public signer; // llave del backend

    uint256 public questCount;
    mapping(uint256 => Quest) public quests;

    event QuestCreated(uint256 indexed id, address indexed creator, address token, uint256 reward, uint64 deadline, string uri);
    event QuestApproved(uint256 indexed id, address indexed winner);
    event RewardPaid(uint256 indexed id, address indexed winner, uint256 amount);
    event QuestRefunded(uint256 indexed id, address indexed creator, uint256 amount);
    event DisputeOpened(uint256 indexed id);
    event DisputeResolved(uint256 indexed id, address indexed arbiter, address indexed winner);
    event SignerChanged(address indexed signer);
    event ArbiterTransferStarted(address indexed newArbiter);
    event ArbiterChanged(address indexed newArbiter);

    error NotCreator();
    error NotArbiter();
    error NotWinner();
    error WrongStatus();
    error TooEarly();
    error BadParams();
    error BadSignature();
    error Expired();

    modifier onlyArbiter() {
        if (msg.sender != arbiter) revert NotArbiter();
        _;
    }

    constructor(address _arbiter, address _signer) EIP712("QuestEscrow", "1") {
        if (_arbiter == address(0) || _signer == address(0)) revert BadParams();
        arbiter = _arbiter;
        signer = _signer;
    }

    // ---------------------------------------------------------------
    // Creación (con fondeo incluido). Requiere approve previo del token.
    // ---------------------------------------------------------------
    function createQuest(
        IERC20 token,
        uint256 reward,
        uint64 deadline,
        string calldata uri
    ) external nonReentrant returns (uint256 id) {
        if (reward == 0 || deadline <= block.timestamp || msg.sender == arbiter) revert BadParams();

        id = ++questCount;
        quests[id] = Quest({
            creator: msg.sender,
            token: token,
            reward: reward,
            deadline: deadline,
            status: Status.Funded,
            winner: address(0),
            uri: uri
        });

        // Rechaza tokens con comisión por transferencia: el contrato debe recibir exactamente `reward`
        uint256 before = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), reward);
        if (token.balanceOf(address(this)) - before != reward) revert BadParams();

        emit QuestCreated(id, msg.sender, address(token), reward, deadline, uri);
    }

    // ---------------------------------------------------------------
    // Aprobar: el creador, con la firma del backend para este ganador
    // ---------------------------------------------------------------
    function approve(uint256 id, address winner, uint64 expiry, bytes calldata sig) external {
        Quest storage q = quests[id];
        if (msg.sender != q.creator) revert NotCreator();
        if (q.status != Status.Funded) revert WrongStatus();
        if (winner == address(0) || winner == q.creator) revert BadParams();
        if (block.timestamp > expiry) revert Expired();

        _verify(keccak256(abi.encode(APPROVAL_TYPEHASH, id, msg.sender, winner, expiry)), sig);

        q.winner = winner;
        q.status = Status.Approved;
        emit QuestApproved(id, winner);
    }

    function withdrawReward(uint256 id) external nonReentrant {
        Quest storage q = quests[id];
        if (q.status != Status.Approved) revert WrongStatus();
        if (msg.sender != q.winner) revert NotWinner();

        q.status = Status.Paid;
        q.token.safeTransfer(msg.sender, q.reward);
        emit RewardPaid(id, msg.sender, q.reward);
    }

    // ---------------------------------------------------------------
    // Cancelar / reembolsar
    // ---------------------------------------------------------------

    /// Cancelación normal: la plataforma firma solo si nadie está en juego.
    function cancelQuest(uint256 id, uint64 expiry, bytes calldata sig) external nonReentrant {
        Quest storage q = quests[id];
        if (msg.sender != q.creator) revert NotCreator();
        if (q.status != Status.Funded) revert WrongStatus();
        if (block.timestamp > expiry) revert Expired();

        _verify(keccak256(abi.encode(CANCEL_TYPEHASH, id, msg.sender, expiry)), sig);

        q.status = Status.Refunded;
        q.token.safeTransfer(q.creator, q.reward);
        emit QuestRefunded(id, q.creator, q.reward);
    }

    /// Salida de emergencia sin firma: si la plataforma desaparece, el dinero no queda bloqueado.
    function refund(uint256 id) external nonReentrant {
        Quest storage q = quests[id];
        if (msg.sender != q.creator) revert NotCreator();
        if (q.status != Status.Funded) revert WrongStatus();
        if (block.timestamp < uint256(q.deadline) + EMERGENCY_REFUND_DELAY) revert TooEarly();

        q.status = Status.Refunded;
        q.token.safeTransfer(q.creator, q.reward);
        emit QuestRefunded(id, q.creator, q.reward);
    }

    // ---------------------------------------------------------------
    // Disputas (solo árbitro)
    // ---------------------------------------------------------------
    function openDispute(uint256 id) external onlyArbiter {
        Quest storage q = quests[id];
        if (q.status != Status.Funded) revert WrongStatus();
        q.status = Status.Disputed;
        emit DisputeOpened(id);
    }

    /// winner == address(0): el fondo vuelve al creador. Si no, se paga a `winner`.
    function resolveDispute(uint256 id, address winner) external onlyArbiter nonReentrant {
        Quest storage q = quests[id];
        if (q.status != Status.Disputed) revert WrongStatus();

        emit DisputeResolved(id, msg.sender, winner);

        if (winner == address(0)) {
            q.status = Status.Refunded;
            q.token.safeTransfer(q.creator, q.reward);
            emit QuestRefunded(id, q.creator, q.reward);
        } else {
            q.winner = winner;
            q.status = Status.Paid;
            q.token.safeTransfer(winner, q.reward);
            emit RewardPaid(id, winner, q.reward);
        }
    }

    // ---------------------------------------------------------------
    // Administración
    // ---------------------------------------------------------------
    function setSigner(address s) external onlyArbiter {
        if (s == address(0)) revert BadParams();
        signer = s;
        emit SignerChanged(s);
    }

    function transferArbiter(address newArbiter) external onlyArbiter {
        pendingArbiter = newArbiter;
        emit ArbiterTransferStarted(newArbiter);
    }

    function acceptArbiter() external {
        if (msg.sender != pendingArbiter) revert NotArbiter();
        arbiter = pendingArbiter;
        pendingArbiter = address(0);
        emit ArbiterChanged(arbiter);
    }

    function _verify(bytes32 structHash, bytes calldata sig) private view {
        if (ECDSA.recover(_hashTypedDataV4(structHash), sig) != signer) revert BadSignature();
    }
}
