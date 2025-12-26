# Frontend

The frontend component of The Minority Reports is a Next.js web application that provides the user interface for the Minority Reports platform. It enables users to interact with the decentralized governance system through a modern, responsive web interface.

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- A Web3 wallet (MetaMask, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/LucaRota4/The_Minority_Reports.git
   cd The_Minority_Reports/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy the `local.example` file to `.env.local` and update the values with your own credentials:
   
   ```bash
   cp local.example .env.local
   ```
   
   Edit `.env.local` and fill in the required values. It is mandatory to edit the Infura and Pinata credentials; the other values can be used as provided in the example. Please refer to the documentation of Pinata and Infura to create your own credentials.

   **MongoDB Setup (Required for Space Metadata)**:
   
   The application requires MongoDB for storing space descriptions and logos. You have two options:
   
   **Option A: MongoDB Atlas (Recommended for Production)**
   - Create a free account at https://mongodb.com/atlas
   - Create a new cluster
   - Get the connection string from "Connect" → "Connect your application"
   - Add to `.env.local`:
     ```
     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/report?retryWrites=true&w=majority
     ```
   
   **Option B: Local MongoDB**
   - Install MongoDB locally: https://www.mongodb.com/try/download/community
   - Start MongoDB service: `mongod`
   - Add to `.env.local`:
     ```
     MONGODB_URI=mongodb://localhost:27017/report
     ```



4. **Start the development server**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Architecture

### Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Blockchain**: EVM, Solidity smart contracts
- **Indexing**: The Graph protocol for subgraph queries
- **Data Storage**: MongoDB for off-chain metadata (space descriptions and logos). See [Metadata Storage Architecture](metadata-storage.md) for details.
- **Deployment**: Hardhat development environment
- **Encryption**: Zama FHE (@zama-fhe/relayer-sdk)
- **Wallet**: RainbowKit, Wagmi
- **Automation**: Chainlink
- **UI Components**: Radix UI, Framer Motion animations

### Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.js                 # Landing page
│   │   ├── docs/                   # Documentation
│   │   ├── api/
│   │   │   └── space-description/
│   │   │       └── route.js        # Space description API
│   │   └── app/
│   │       ├── layout.js           # App layout
│   │       ├── page.js             # App dashboard
│   │       ├── spaces/
│   │       │   └── create/
│   │       │       └── page.js     # Create new space
│   │       └── [space_name]/
│   │           ├── page.js         # Space dashboard
│   │           └── [proposal_id]/
│   │               └── page.js     # Proposal voting page
│   ├── components/
│   │   ├── landing/                # Landing page components
│   │   ├── ui/                     # Reusable UI components
│   │   ├── wallet/                 # Wallet connection components
│   │   ├── dashboard/              # Dashboard components
│   │   └── providers.jsx           # App providers
│   ├── lib/
│   │   ├── wagmi.js                # Web3 configuration
│   │   ├── apollo.ts               # GraphQL client
│   │   ├── fhevm.ts                # FHE utilities
│   │   ├── spaceDescriptions.js    # Space description storage
│   │   └── utils.js                # Utility functions
│   ├── hooks/
│   │   ├── useSubgraph.js          # Subgraph hooks
│   │   └── useSpaceDescription.js  # Space description hook
│   └── styles/
├── data/
│   └── space-descriptions.json     # Space descriptions storage
├── public/                         # Static assets
└── package.json                    # Dependencies
```

### Subgraphs

The platform uses The Graph protocol for efficient on-chain data indexing:
- `The_Minority_Report/`: Subgraph for The_Minority_Reports-related events

For local development, you can run your own subgraph node instead of using the hosted service. Refer to [The Graph documentation](https://thegraph.com/docs/) for setup instructions.

#### The Minority Reports Subgraph Commands

To work with The Minority Report subgraph locally:

1. **Navigate to the subgraph directory**:
   ```bash
   cd The_Minority_Reports_subgraph
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Generate types from the ABI**:
   ```bash
   npx graph codegen
   ```

4. **Build the subgraph**:
   ```bash
   npx graph build
   ```

5. **Deploy locally (requires local Graph Node)**:
   ```bash
   graph create-local --node http://localhost:8020/
   graph deploy-local --node http://localhost:8020/
   ```

6. **Deploy to hosted service** (replace with your Graph Studio details):
   ```bash
   graph deploy --product hosted-service your-username/your-subgraph-name
   ```

Ensure you have the Graph CLI installed globally: `npm install -g @graphprotocol/graph-cli`.

## Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Vitest tests

### Environment Setup

For local development, ensure you have:

1. **Blockchain Network**: Access to testnet (Sepolia)
2. **Wallet**: Connected wallet with test tokens

### Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with coverage
npm run test -- --coverage
```

## Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Zama FHE Documentation](https://docs.zama.ai/)
- [Wagmi Documentation](https://wagmi.sh/)
- [Chainlink Documentation](https://docs.chain.link/)
- [The Graph Documentation](https://thegraph.com/docs/)

## Acknowledgments

- [Chriswilder](https://github.com/0xchriswilder/fhevm-react-template/blob/main/packages/fhevm-sdk/src/core/fhevm.ts) for providing the initial skeleton of the `fhevm.ts` file