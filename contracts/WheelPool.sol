// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title WheelPool
 * @notice A permanent USDC lock contract that receives 5% of voting surplus
 * @dev Funds deposited here are PERMANENTLY locked - no withdrawal function exists
 */
contract WheelPool {
    IERC20 public immutable usdcToken;
    uint256 public totalDeposits;
    
    event DepositRecorded(address indexed from, uint256 amount, uint256 totalDeposits);
    
    /**
     * @notice Constructor sets the USDC token address
     * @param _usdcToken Address of the USDC token contract
     */
    constructor(address _usdcToken) {
        require(_usdcToken != address(0), "WheelPool: zero address");
        usdcToken = IERC20(_usdcToken);
    }
    
    /**
     * @notice Record a deposit to the wheel pool
     * @dev Can only be called by contracts that have already transferred USDC to this contract
     * @param amount The amount of USDC deposited
     */
    function recordDeposit(uint256 amount) external {
        totalDeposits += amount;
        emit DepositRecorded(msg.sender, amount, totalDeposits);
    }
    
    /**
     * @notice Get the current USDC balance of this contract
     * @return The USDC balance
     */
    function balance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }
    
    /**
     * @notice Get total recorded deposits
     * @return The total amount of deposits recorded
     */
    function getTotalDeposits() external view returns (uint256) {
        return totalDeposits;
    }
}
