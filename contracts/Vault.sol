// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, ebool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Realistic FHE Vault
/// @notice Vault avec fonctionnalités réalistes utilisant uniquement les opérations FHE disponibles
/// @dev Ratio 1:1, frais fixes, limites min/max
contract RealisticVault is SepoliaConfig {
    
    // ============ State Variables ============
    
    string public name;
    string public symbol;
    
    /// @notice Total supply of vault shares (encrypted)
    euint64 private _totalSupply;
    
    /// @notice User balances (encrypted shares)
    mapping(address => euint64) private _balances;
    
    /// @notice User deposits (encrypted assets)
    mapping(address => euint64) private _deposits;
    
    /// @notice Deposit timestamps for time-based features
    mapping(address => uint256) public depositTimestamp;
    
    // ============ Constants (Public) ============
    
    /// @notice Minimum deposit amount (public pour transparence)
    uint64 public constant MIN_DEPOSIT = 100;
    
    /// @notice Maximum deposit amount
    uint64 public constant MAX_DEPOSIT = 1_000_000;
    
    /// @notice Fixed withdrawal fee (10 tokens)
    uint64 public constant WITHDRAWAL_FEE = 10;
    
    /// @notice Minimum time before withdrawal (24 hours)
    uint256 public constant MIN_LOCK_TIME = 24 hours;
    
    // ============ Events ============
    
    event Deposit(address indexed user, uint256 timestamp);
    event Withdraw(address indexed user, uint256 timestamp);
    event Transfer(address indexed from, address indexed to);
    
    // ============ Constructor ============
    
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }
    
    // ============ View Functions ============
    
    function balanceOf(address account) external view returns (euint64) {
        return _balances[account];
    }
    
    function totalSupply() external view returns (euint64) {
        return _totalSupply;
    }
    
    function depositOf(address account) external view returns (euint64) {
        return _deposits[account];
    }
    
    // ============ Core Functions ============
    
    /// @notice Deposit assets with min/max checks
    function deposit(externalEuint64 inputEuint64, bytes calldata inputProof) external {
        euint64 encryptedAmount = FHE.fromExternal(inputEuint64, inputProof);
        
        // ✅ Check minimum deposit (using FHE comparison)
        euint64 minAmount = FHE.asEuint64(MIN_DEPOSIT);
        ebool isAboveMin = FHE.ge(encryptedAmount, minAmount);
        
        // ✅ Check maximum deposit
        euint64 maxAmount = FHE.asEuint64(MAX_DEPOSIT);
        ebool isBelowMax = FHE.le(encryptedAmount, maxAmount);
        
        // ✅ Both conditions must be true (using AND)
        ebool isValid = FHE.and(isAboveMin, isBelowMax);
        
        // ✅ Select: if valid use amount, else use 0
        euint64 validAmount = FHE.select(isValid, encryptedAmount, FHE.asEuint64(0));
        
        // Update balances (1:1 ratio)
        _deposits[msg.sender] = FHE.add(_deposits[msg.sender], validAmount);
        _balances[msg.sender] = FHE.add(_balances[msg.sender], validAmount);
        _totalSupply = FHE.add(_totalSupply, validAmount);
        
        // Record timestamp
        depositTimestamp[msg.sender] = block.timestamp;
        
        // Set permissions
        FHE.allowThis(_deposits[msg.sender]);
        FHE.allow(_deposits[msg.sender], msg.sender);
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allowThis(_totalSupply);
        
        emit Deposit(msg.sender, block.timestamp);
    }
    
    /// @notice Withdraw with time-lock and fixed fee
    function withdraw(externalEuint64 inputEuint64, bytes calldata inputProof) external {
        // ✅ Check time-lock (public check, pas besoin de FHE)
        require(
            block.timestamp >= depositTimestamp[msg.sender] + MIN_LOCK_TIME,
            "Vault: time-lock active"
        );
        
        euint64 requestedShares = FHE.fromExternal(inputEuint64, inputProof);
        
        // ✅ Check if user has enough shares
        ebool hasEnough = FHE.le(requestedShares, _balances[msg.sender]);
        euint64 sharesToBurn = FHE.select(hasEnough, requestedShares, FHE.asEuint64(0));
        
        // ✅ Apply fixed withdrawal fee (subtraction, not %)
        euint64 fee = FHE.asEuint64(WITHDRAWAL_FEE);
        
        // Check if amount > fee
        ebool canPayFee = FHE.gt(sharesToBurn, fee);
        
        // If can pay fee: amount - fee, else: 0
        euint64 amountAfterFee = FHE.select(
            canPayFee,
            FHE.sub(sharesToBurn, fee),
            FHE.asEuint64(0)
        );
        
        // Update balances
        _balances[msg.sender] = FHE.sub(_balances[msg.sender], sharesToBurn);
        _deposits[msg.sender] = FHE.sub(_deposits[msg.sender], amountAfterFee);
        _totalSupply = FHE.sub(_totalSupply, sharesToBurn);
        
        // Set permissions
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allowThis(_deposits[msg.sender]);
        FHE.allow(_deposits[msg.sender], msg.sender);
        FHE.allowThis(_totalSupply);
        
        emit Withdraw(msg.sender, block.timestamp);
    }
    
    /// @notice Transfer shares to another user
    function transfer(
        address to,
        externalEuint64 inputEuint64,
        bytes calldata inputProof
    ) external {
        require(to != address(0), "Vault: transfer to zero address");
        
        euint64 amount = FHE.fromExternal(inputEuint64, inputProof);
        
        // ✅ Check balance
        ebool hasEnough = FHE.le(amount, _balances[msg.sender]);
        euint64 transferAmount = FHE.select(hasEnough, amount, FHE.asEuint64(0));
        
        // Update balances
        _balances[msg.sender] = FHE.sub(_balances[msg.sender], transferAmount);
        _balances[to] = FHE.add(_balances[to], transferAmount);
        
        // Transfer deposit timestamp to recipient
        if (depositTimestamp[to] == 0) {
            depositTimestamp[to] = depositTimestamp[msg.sender];
        }
        
        // Set permissions
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);
        
        emit Transfer(msg.sender, to);
    }
    
    /// @notice Get user's time until unlock
    function timeUntilUnlock(address user) external view returns (uint256) {
        if (block.timestamp >= depositTimestamp[user] + MIN_LOCK_TIME) {
            return 0;
        }
        return (depositTimestamp[user] + MIN_LOCK_TIME) - block.timestamp;
    }
}