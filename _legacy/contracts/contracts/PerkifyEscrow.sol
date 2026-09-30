// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

error InvalidToken();
error QuestAlreadyExists();
error AmountMustBeGreaterThanZero();
error TokenNotAllowed();
error InvalidAmount();
error InvalidAddress();
error QuestNotFunded();
error HunterNotAssigned();
error TerminalState();
error EmergencyRefundBlocked();
error DeadlineNotExpired();
error InvalidGracePeriod();
error FreezeTimeoutNotReached();
error InvalidFeeRecipient();
error InvalidDeadline();
error NotFrozen();
error TimeoutNotReached();

/**
 * @title PerkifyEscrow
 * @notice Handles quest rewards.
 * RISK: Tokens with blacklist (e.g. USDC/USDT) may cause payments to revert.
 * This is an accepted risk; the Arbiter must ensure the token allowlist is safe.
 */
contract PerkifyEscrow is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");

    enum Status { None, Funded, Released, Refunded, Resolved }

    struct Escrow {
        address creator;
        address hunter;
        address token;
        uint256 amount;
        uint64 fundedAt;
        uint64 deadline;
        uint256 feeBpsSnapshot;
        Status status;
        bool frozen;
        uint64 frozenAt;
        uint64 assignedAt;
    }

    mapping(bytes32 => Escrow) public escrows;
    mapping(address => bool) public tokenAllowlist;

    uint256 public feeBps = 0;
    uint256 public constant MAX_FEE_BPS = 1000;
    address public feeRecipient;
    uint256 public gracePeriod = 7 days;
    uint256 public minGracePeriod = 1 days;
    uint256 public maxGracePeriod = 30 days;
    uint256 public maxFreeze = 45 days;

    event Deposited(bytes32 indexed questId, address indexed creator, address indexed token, uint256 amount, uint64 deadline);
    event HunterAssigned(bytes32 indexed questId, address indexed hunter);
    event Released(bytes32 indexed questId, address indexed hunter, uint256 amount, uint256 fee);
    event Refunded(bytes32 indexed questId, address indexed creator, uint256 amount);
    event Resolved(bytes32 indexed questId, uint256 hunterAmount, uint256 creatorAmount);
    event Frozen(bytes32 indexed questId, bool frozen);
    event Unfrozen(bytes32 indexed questId);
    event GracePeriodChanged(uint256 oldGrace, uint256 newGrace);
    event MaxFreezeChanged(uint256 oldMax, uint256 newMax);
    event FeeBpsChanged(uint256 oldFee, uint256 newFee);
    event FeeRecipientChanged(address oldRecipient, address newRecipient);
    event TokenAllowedChanged(address token, bool allowed);

    constructor(address _feeRecipient) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ARBITER_ROLE, msg.sender);
        feeRecipient = _feeRecipient;
    }

    function setTokenAllowed(address token, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenAllowlist[token] = allowed;
        emit TokenAllowedChanged(token, allowed);
    }

    function setFeeBps(uint256 _feeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_feeBps <= MAX_FEE_BPS, "Fee exceeds max limit");
        uint256 oldFee = feeBps;
        feeBps = _feeBps;
        emit FeeBpsChanged(oldFee, _feeBps);
    }

    function setFeeRecipient(address _recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_recipient != address(0), "Invalid recipient");
        address oldRecipient = feeRecipient;
        feeRecipient = _recipient;
        emit FeeRecipientChanged(oldRecipient, _recipient);
    }

    function setGracePeriod(uint256 _gracePeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_gracePeriod >= minGracePeriod && _gracePeriod <= maxGracePeriod, "Grace period out of bounds");
        uint256 oldGrace = gracePeriod;
        gracePeriod = _gracePeriod;
        emit GracePeriodChanged(oldGrace, _gracePeriod);
    }

    function setMaxFreeze(uint256 _maxFreeze) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_maxFreeze >= 1 days && _maxFreeze <= 180 days, "Max freeze out of bounds");
        uint256 oldMax = maxFreeze;
        maxFreeze = _maxFreeze;
        emit MaxFreezeChanged(oldMax, _maxFreeze);
    }

    function deposit(bytes32 questId, address token, uint256 amount, uint64 deadline) external nonReentrant whenNotPaused {
        if (!tokenAllowlist[token]) revert TokenNotAllowed();
        if (escrows[questId].status != Status.None) revert QuestAlreadyExists();
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 balanceAfter = IERC20(token).balanceOf(address(this));

        if (balanceAfter - balanceBefore != amount) {
            IERC20(token).safeTransfer(msg.sender, balanceAfter - balanceBefore);
            revert InvalidToken();
        }

        escrows[questId] = Escrow({
            creator: msg.sender,
            hunter: address(0),
            token: token,
            amount: amount,
            fundedAt: uint64(block.timestamp),
            deadline: deadline,
            feeBpsSnapshot: feeBps,
            status: Status.Funded,
            frozen: false,
            frozenAt: 0,
            assignedAt: 0
        });

        emit Deposited(questId, msg.sender, token, amount, deadline);
    }

    function freeze(bytes32 questId, bool frozen) external onlyRole(ARBITER_ROLE) {
        Escrow storage escrow = escrows[questId];
        if (escrow.status != Status.Funded) revert QuestNotFunded();

        if (frozen && !escrow.frozen) {
            // forge-lint: disable-next-line(unsafe-typecast)
            escrow.frozenAt = uint64(block.timestamp);
        }
        escrow.frozen = frozen;
        if (frozen) emit Frozen(questId, true); else emit Unfrozen(questId);
    }

    function assignHunter(bytes32 questId, address hunter) external onlyRole(ARBITER_ROLE) {
        Escrow storage escrow = escrows[questId];
        if (escrow.status != Status.Funded) revert QuestNotFunded();
        if (hunter == address(0)) revert InvalidAddress();
        if (hunter == escrow.creator) revert InvalidAddress();

        if (escrow.hunter == address(0)) {
            // forge-lint: disable-next-line(unsafe-typecast)
            escrow.assignedAt = uint64(block.timestamp);
        }
        escrow.hunter = hunter;
        emit HunterAssigned(questId, hunter);
    }

    function _calculateFee(uint256 amount, uint256 _feeBps) internal pure returns (uint256 fee) {
        return (amount * _feeBps) / 10000;
    }

    function release(bytes32 questId) external onlyRole(ARBITER_ROLE) nonReentrant {
        Escrow storage escrow = escrows[questId];
        if (escrow.status != Status.Funded) revert TerminalState();
        if (escrow.hunter == address(0)) revert HunterNotAssigned();

        uint256 currentFeeBps = escrow.feeBpsSnapshot;
        uint256 fee = _calculateFee(escrow.amount, currentFeeBps);
        uint256 hunterAmount = escrow.amount - fee;

        escrow.status = Status.Released;

        if (fee > 0 && feeRecipient != address(0)) {
            IERC20(escrow.token).safeTransfer(feeRecipient, fee);
        }
        IERC20(escrow.token).safeTransfer(escrow.hunter, hunterAmount);

        emit Released(questId, escrow.hunter, hunterAmount, fee);
    }

    function refund(bytes32 questId) external onlyRole(ARBITER_ROLE) nonReentrant {
        Escrow storage escrow = escrows[questId];
        if (escrow.status != Status.Funded) revert TerminalState();

        address creator = escrow.creator;
        uint256 amount = escrow.amount;
        address token = escrow.token;

        escrow.status = Status.Refunded;
        IERC20(token).safeTransfer(creator, amount);

        emit Refunded(questId, creator, amount);
    }

    function resolve(bytes32 questId, uint256 hunterAmount) external onlyRole(ARBITER_ROLE) nonReentrant {
        Escrow storage escrow = escrows[questId];
        if (escrow.status != Status.Funded) revert TerminalState();
        if (escrow.hunter == address(0)) revert HunterNotAssigned();
        if (hunterAmount > escrow.amount) revert InvalidAmount();

        uint256 totalAmount = escrow.amount;
        address token = escrow.token;
        address creator = escrow.creator;
        address hunter = escrow.hunter;

        uint256 currentFeeBps = escrow.feeBpsSnapshot;
        uint256 fee = _calculateFee(hunterAmount, currentFeeBps);
        uint256 finalHunterAmount = hunterAmount - fee;
        uint256 creatorAmount = totalAmount - hunterAmount;

        escrow.status = Status.Resolved;

        if (fee > 0 && feeRecipient != address(0)) {
            IERC20(token).safeTransfer(feeRecipient, fee);
        }
        IERC20(token).safeTransfer(hunter, finalHunterAmount);
        IERC20(token).safeTransfer(creator, creatorAmount);

        emit Resolved(questId, finalHunterAmount, creatorAmount);
    }

    function emergencyRefundAfterDeadline(bytes32 questId) external nonReentrant {
        Escrow storage escrow = escrows[questId];
        if (escrow.status != Status.Funded) revert TerminalState();

        if (escrow.hunter != address(0) || escrow.frozen) revert EmergencyRefundBlocked();
        if (block.timestamp <= escrow.deadline + gracePeriod) revert DeadlineNotExpired();

        address creator = escrow.creator;
        uint256 amount = escrow.amount;
        address token = escrow.token;

        escrow.status = Status.Refunded;
        IERC20(token).safeTransfer(creator, amount);

        emit Refunded(questId, creator, amount);
    }

    function _settleTimeout(bytes32 questId, Escrow storage escrow) private {
        uint256 total = escrow.amount;
        address token = escrow.token;
        address creator = escrow.creator;
        address hunter = escrow.hunter;

        if (hunter == address(0)) {
            escrow.status = Status.Resolved;
            IERC20(token).safeTransfer(creator, total);
            emit Resolved(questId, 0, total);
            return;
        }

        uint256 hunterGross = total / 2;
        uint256 creatorAmount = total - hunterGross;
        uint256 fee = _calculateFee(hunterGross, escrow.feeBpsSnapshot);
        uint256 hunterNet = hunterGross - fee;

        escrow.status = Status.Resolved;
        if (fee > 0) {
            IERC20(token).safeTransfer(feeRecipient, fee);
        }
        IERC20(token).safeTransfer(hunter, hunterNet);
        IERC20(token).safeTransfer(creator, creatorAmount);

        emit Resolved(questId, hunterNet, creatorAmount);
    }

    function resolveFreezeTimeout(bytes32 questId) external nonReentrant {
        Escrow storage escrow = escrows[questId];
        if (escrow.status != Status.Funded) revert TerminalState();
        if (!escrow.frozen) revert NotFrozen();
        if (block.timestamp <= escrow.frozenAt + maxFreeze) revert FreezeTimeoutNotReached();
        _settleTimeout(questId, escrow);
    }

    function resolveAbsoluteTimeout(bytes32 questId) external nonReentrant {
        Escrow storage escrow = escrows[questId];
        if (escrow.status != Status.Funded) revert TerminalState();

        // forge-lint: disable-next-line(unsafe-typecast)
        uint64 criticalDeadline = escrow.deadline > escrow.assignedAt ? escrow.deadline : escrow.assignedAt;
        if (block.timestamp <= criticalDeadline + gracePeriod + maxFreeze) revert TimeoutNotReached();
        _settleTimeout(questId, escrow);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}