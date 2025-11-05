import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying contracts with account:", deployer);

  // 1. Deploy MockUSDC first
  const deployedMockUSDC = await deploy("MockUSDC", {
    from: deployer,
    log: true,
  });
  console.log(`MockUSDC deployed at: ${deployedMockUSDC.address}`);

  // 2. Deploy WheelPool (needs USDC address)
  const deployedWheelPool = await deploy("WheelPool", {
    from: deployer,
    args: [deployedMockUSDC.address],
    log: true,
  });
  console.log(`WheelPool deployed at: ${deployedWheelPool.address}`);

  // 3. Deploy PrivateVoting
  const VOTING_DURATION =  1 * 20 * 60; // 7 days in seconds
  const treasuryAddress = deployer; // Treasury = deployer address
  
  const deployedVoting = await deploy("PrivateVoting", {
    from: deployer,
    contract: "contracts/zamahub.sol:PrivateVoting",
    args: [
      "Community Vote #1",        // Voting name
      VOTING_DURATION,            // 7 days
      treasuryAddress,            // Protocol treasury
      deployedWheelPool.address   // WheelPool address
    ],
    log: true,
  });
  console.log(`PrivateVoting deployed at: ${deployedVoting.address}`);

  // 4. Set USDC token address in PrivateVoting contract
  const { ethers } = hre;
  const voting = await ethers.getContractAt("PrivateVoting", deployedVoting.address);
  const setUSDCTx = await voting.setUSDCToken(deployedMockUSDC.address);
  await setUSDCTx.wait();
  console.log(`✅ USDC token set to: ${deployedMockUSDC.address}`);

  console.log("\n=== Deployment Summary ===");
  console.log(`MockUSDC:       ${deployedMockUSDC.address}`);
  console.log(`WheelPool:      ${deployedWheelPool.address}`);
  console.log(`PrivateVoting:  ${deployedVoting.address}`);
  console.log(`Treasury:       ${treasuryAddress}`);
  console.log(`Voting Duration: ${VOTING_DURATION / 86400} days`);
  console.log("==========================\n");
};

export default func;
func.id = "deploy_private_voting";
func.tags = ["PrivateVoting", "MockUSDC", "WheelPool"];