# Project Structure

This monorepo contains two main components that work together to power the Agora platform.

## Core

The `core/` directory houses the smart contract infrastructure, built using Hardhat and TypeScript. It includes:

- **Contracts**: Solidity smart contracts for private proposals, proposal factories, space registries, and mock tokens for testing.
- **Deployment**: Scripts and configurations for deploying contracts to various networks.
- **Tests**: Comprehensive test suites for verifying contract functionality.
- **Tasks**: Hardhat tasks for interacting with deployed contracts.

Key features:
- Private proposal creation and management
- Automated proposal deployment
- Space registry for organizing governance spaces
- Integration with ERC721 and governance tokens

## Frontend

The `frontend/` directory contains a Next.js web application that provides the user interface for the Agora platform. It includes:

- **Next.js App**: A modern React-based web application with routing and API endpoints.
- **Subgraph Integration**: TheGraph subgraph for indexing and querying blockchain data efficiently.
- **Components**: Reusable UI components built with Tailwind CSS and shadcn/ui.
- **Wallet Integration**: Support for various wallets using Wagmi and other libraries.

Key features:
- Dashboard for managing proposals and spaces
- Encrypted proposal handling using FHEVM
- Real-time data fetching via Apollo GraphQL
- Responsive design for desktop and mobile

## Getting Started

To get started with development, refer to the individual README files in the `core/` and `frontend/` directories for setup instructions.