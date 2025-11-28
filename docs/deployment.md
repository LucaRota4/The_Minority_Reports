# Deployment

This section covers the deployment processes for both the core smart contracts and the frontend application.

## Core Deployment

### Local Network
```bash
npx hardhat node
npx hardhat deploy --network localhost
```

### Sepolia Testnet
```bash
npx hardhat deploy --network sepolia ##verify automatically
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
npx hardhat proposal --network sepolia ## Create .agora ENS name, Space ID with this name and proposal in the space
```

#### Deployed Contracts on Sepolia
- **MockENS**: 0xB94ccA29A9eCCb65AC9548DAb2d1ab768F3b494D
- **SpaceRegistry**: 0xB1480EF7694d9e57b871fdD1a779eb5f278C8308
- **ProposalAutomation**: 0xA3ea6b9255b606Eda856eb699DD62efc72D39167
- **PrivateProposalFactory**: 0x6f27646A29501Ee4aF0e4b6ABC2B28c71F723A1A
- **MockGovernanceToken**: 0x24b8aE269ad0284762AfcAC32b5c1EF42875fa7D

For more details, see [Deployment Details](../core/deploy.md).

## Frontend Deployment

The frontend is built with Next.js and can be deployed to platforms like Vercel.

### Build for Production
```bash
npm run build
npm run start
```

### Deploy to Vercel
1. Connect your repository to Vercel
2. Set environment variables for Web3 connections
3. Deploy automatically on push

For more details, refer to the frontend README.