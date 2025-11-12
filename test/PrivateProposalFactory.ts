import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { PrivateProposal, PrivateProposalFactory, SpaceRegistry } from "../types";
import { CreateProposalParamsStruct } from "../types/contracts/IProposalFactory";
import { FhevmType } from "@fhevm/hardhat-plugin";
import * as hre from "hardhat";

type Signers = {
  owner: HardhatEthersSigner;
  user1: HardhatEthersSigner;
  user2: HardhatEthersSigner;
  user3: HardhatEthersSigner;
};

async function deployProposalCreationFixture(owner: HardhatEthersSigner, user1: HardhatEthersSigner, user2: HardhatEthersSigner) {
  // Deploy MockENS
  const MockENSFactory = await ethers.getContractFactory("MockENS");
  const mockENS = await MockENSFactory.deploy();

  // Deploy SpaceRegistry
  const SpaceRegistryFactory = await ethers.getContractFactory("SpaceRegistry");
  const spaceRegistry = await SpaceRegistryFactory.deploy(mockENS.target);

  // Deploy VotingUtils
  const VotingUtilsFactory = await ethers.getContractFactory("VotingUtils");
  const votingUtils = await VotingUtilsFactory.deploy();

  // Deploy factory
  const PrivateProposalFactoryFactory = await ethers.getContractFactory("PrivateProposalFactory", {
    libraries: {
      VotingUtils: votingUtils.target
    }
  });
  const privateProposalFactory = await PrivateProposalFactoryFactory.deploy(spaceRegistry.target);

  return { mockENS, spaceRegistry, votingUtils, privateProposalFactory };
}

async function deploySpaceManagementFixture() {
  // Deploy MockENS
  const MockENSFactory = await ethers.getContractFactory("MockENS");
  const mockENS = await MockENSFactory.deploy();

  // Deploy SpaceRegistry
  const SpaceRegistryFactory = await ethers.getContractFactory("SpaceRegistry");
  const spaceRegistry = await SpaceRegistryFactory.deploy(mockENS.target);

  // Deploy VotingUtils
  const VotingUtilsFactory = await ethers.getContractFactory("VotingUtils");
  const votingUtils = await VotingUtilsFactory.deploy();

  // Deploy factory
  const PrivateProposalFactoryFactory = await ethers.getContractFactory("PrivateProposalFactory", {
    libraries: {
      VotingUtils: votingUtils.target
    }
  });
  const privateProposalFactory = await PrivateProposalFactoryFactory.deploy(spaceRegistry.target);

  return { mockENS, spaceRegistry, votingUtils, privateProposalFactory };
}

describe("PrivateProposalFactory", function () {
let privateProposalFactory: PrivateProposalFactory;
let spaceRegistry: SpaceRegistry;
let testSpaceId: string;  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }
    this.signers = {} as Signers;
    const signers = await ethers.getSigners();
    this.signers.owner = signers[0];
    this.signers.user1 = signers[1];
    this.signers.user2 = signers[2];
    this.signers.user3 = signers[3];
  });

  beforeEach(async function () {
    // Deploy MockENS for testing
    const MockENSFactory = await ethers.getContractFactory("MockENS");
    const mockENS = await MockENSFactory.deploy();

    // Deploy SpaceRegistry with MockENS
    const SpaceRegistryFactory = await ethers.getContractFactory("SpaceRegistry");
    spaceRegistry = await SpaceRegistryFactory.deploy(mockENS.target);

    // Create a test space with ENS name
    const ensName = "test.eth";
    testSpaceId = ethers.keccak256(ethers.toUtf8Bytes(ensName));

    // Set ENS ownership for the test space
    const node = await spaceRegistry.namehash(ensName);
    await mockENS.setNodeOwner(node, this.signers.owner.address);    await spaceRegistry.createSpace(ensName, "Test Space");

    // Deploy VotingUtils library
    const VotingUtilsFactory = await ethers.getContractFactory("VotingUtils");
    const votingUtils = await VotingUtilsFactory.deploy();

    // Deploy factory with space registry and link library
    const PrivateProposalFactoryFactory = await ethers.getContractFactory("PrivateProposalFactory", {
      libraries: {
        VotingUtils: votingUtils.target
      }
    });
    privateProposalFactory = await PrivateProposalFactoryFactory.deploy(spaceRegistry.target);
  });

  describe("Space Management", function () {
    let space1Id: string, space2Id: string;
    let mockENS: any;

    beforeEach(async function () {
      const { mockENS: testMockENS, spaceRegistry: testSpaceRegistry, privateProposalFactory: testFactory } = await deploySpaceManagementFixture();
      mockENS = testMockENS;
      spaceRegistry = testSpaceRegistry;
      privateProposalFactory = testFactory;

      // Create additional spaces with ENS names
      const ensName1 = "space1.eth";
      const ensName2 = "space2.eth";
      space1Id = ethers.keccak256(ethers.toUtf8Bytes(ensName1));
      space2Id = ethers.keccak256(ethers.toUtf8Bytes(ensName2));

    // Set ENS ownership
    const node1 = await spaceRegistry.namehash(ensName1);
    const node2 = await spaceRegistry.namehash(ensName2);
    await mockENS.setNodeOwner(node1, this.signers.owner.address);
    await mockENS.setNodeOwner(node2, this.signers.user1.address);      await spaceRegistry.createSpace(ensName1, "Space 1");
    await spaceRegistry.connect(this.signers.user1).createSpace(ensName2, "Space 2");

      // Whitelist users for creating proposals
      await privateProposalFactory.updateWhitelist(this.signers.owner.address, true);
      await privateProposalFactory.updateWhitelist(this.signers.user1.address, true);

      // Create proposals in different spaces
      const baseParams: CreateProposalParamsStruct = {
        spaceId: space1Id,
        title: "Test Proposal",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No"],
        start: 0,
        end: 300,
        quorumMode: 0,
        quorumValue: 1,
        thresholdMode: 0,
        thresholdValue: 5000,
        abstainCountsTowardQuorum: false,
        revealPolicy: 0,
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress,
        fhe: { enabled: true }
      };

      await privateProposalFactory.createProposal({
      ...baseParams,
      title: "Proposal in Space 1"
    });

    await privateProposalFactory.createProposal({
      ...baseParams,
      title: "Another Proposal in Space 1"
    });

    await privateProposalFactory.connect(this.signers.user1).createProposal({
      ...baseParams,
      spaceId: space2Id,
      title: "Proposal in Space 2"
    });
    });

    it("Should return proposals for specific space", async function () {
      const space1Proposals = await privateProposalFactory.getSpaceProposals(space1Id);
      const space2Proposals = await privateProposalFactory.getSpaceProposals(space2Id);

      expect(space1Proposals.length).to.equal(2);
      expect(space2Proposals.length).to.equal(1);
    });

    it("Should return empty array for space with no proposals", async function () {
      const emptySpaceId = ethers.encodeBytes32String("empty-space");
      const emptyProposals = await privateProposalFactory.getSpaceProposals(emptySpaceId);

      expect(emptyProposals.length).to.equal(0);
    });

    it("Should return correct space info", async function () {
    const [spaceOwner, displayName, proposalCount] = await privateProposalFactory.getSpaceInfo(space1Id);

    expect(spaceOwner).to.equal(this.signers.owner.address);
      expect(displayName).to.equal("space1.eth");
      expect(proposalCount).to.equal(2);
    });

    it("Should return correct space info for user-owned space", async function () {
    const [spaceOwner, displayName, proposalCount] = await privateProposalFactory.getSpaceInfo(space2Id);

    expect(spaceOwner).to.equal(this.signers.user1.address);
      expect(displayName).to.equal("space2.eth");
      expect(proposalCount).to.equal(1);
    });
  });

  describe("User Vote Recording", function () {
    it("Should track user-created proposals in votings", async function () {
      const initialVotings = await privateProposalFactory.getUserVotings(this.signers.user1.address);
      const initialCount = initialVotings.length;

      // user1 creates a proposal
      await privateProposalFactory.updateWhitelist(this.signers.user1.address, true);
      await privateProposalFactory.connect(this.signers.user1).createProposal({
        spaceId: testSpaceId,
        title: "User Created Proposal",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No"],
        start: 0,
        end: 300,
        quorumMode: 0,
        quorumValue: 1,
        thresholdMode: 0,
        thresholdValue: 5000,
        abstainCountsTowardQuorum: false,
        revealPolicy: 0,
        fhe: { enabled: true },
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress
      });

      const finalVotings = await privateProposalFactory.getUserVotings(this.signers.user1.address);
      expect(finalVotings.length).to.equal(initialCount + 1);
    });

    it("Should only allow valid voting contracts to record votes", async function () {
      const invalidAddress = this.signers.user1.address; // Not a voting contract

      await expect(
        privateProposalFactory.connect(this.signers.user1).recordUserVote(this.signers.user2.address, invalidAddress)
      ).to.be.revertedWithCustomError(privateProposalFactory, "OnlyValid");
    });
  });

  describe("Proposal Creation with Spaces", function () {
    it("Should reject proposals for non-existent spaces", async function () {
      const invalidSpaceId = ethers.encodeBytes32String("non-existent");
      const invalidParams: CreateProposalParamsStruct = {
        spaceId: invalidSpaceId,
        title: "Invalid Proposal",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No"],
        start: 0,
        end: 300,
        quorumMode: 0,
        quorumValue: 1,
        thresholdMode: 0,
        thresholdValue: 5000,
        abstainCountsTowardQuorum: false,
        revealPolicy: 0,
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress,
        fhe: { enabled: true }
      };

      await expect(
        privateProposalFactory.createProposal(invalidParams)
      ).to.be.revertedWithCustomError(privateProposalFactory, "SpaceNotExist");
    });

    it("Should reject proposals for inactive spaces", async function () {
      const { mockENS, spaceRegistry, privateProposalFactory: testFactory } = await deployProposalCreationFixture(this.signers.owner, this.signers.user1, this.signers.user2);

      // Create and deactivate space
      const ensName = "temp.eth";
      const tempSpaceId = ethers.keccak256(ethers.toUtf8Bytes(ensName));

      const node = await spaceRegistry.namehash(ensName);
      await mockENS.setNodeOwner(node, this.signers.owner.address);

      await spaceRegistry.createSpace(ensName, "Temp Space");
      await spaceRegistry.deactivateSpace(tempSpaceId);

      const invalidParams: CreateProposalParamsStruct = {
        spaceId: tempSpaceId,
        title: "Invalid Proposal",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No"],
        start: 0,
        end: 300,
        quorumMode: 0,
        quorumValue: 1,
        thresholdMode: 0,
        thresholdValue: 5000,
        abstainCountsTowardQuorum: false,
        revealPolicy: 0,
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress,
        fhe: { enabled: true }
      };

      await expect(
        testFactory.createProposal(invalidParams)
      ).to.be.revertedWithCustomError(testFactory, "SpaceNotExist");
    });

    it("Should allow space owners to create proposals", async function () {
      const { mockENS, spaceRegistry, privateProposalFactory: testFactory } = await deployProposalCreationFixture(this.signers.owner, this.signers.user1, this.signers.user2);

      // user1 creates their own space
      const ensName = "user.eth";
      const userSpaceId = ethers.keccak256(ethers.toUtf8Bytes(ensName));

      const node = await spaceRegistry.namehash(ensName);
      await mockENS.setNodeOwner(node, this.signers.user1.address);

      await spaceRegistry.connect(this.signers.user1).createSpace(ensName, "User Space");

      // Whitelist user1 for creating proposals
      await testFactory.updateWhitelist(this.signers.user1.address, true);

      const userParams: CreateProposalParamsStruct = {
        spaceId: userSpaceId,
        title: "User Proposal",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No"],
        start: 0,
        end: 300,
        quorumMode: 0,
        quorumValue: 1,
        thresholdMode: 0,
        thresholdValue: 5000,
        abstainCountsTowardQuorum: false,
        revealPolicy: 0,
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress,
        fhe: { enabled: true }
      };

      await expect(testFactory.connect(this.signers.user1).createProposal(userParams))
        .to.emit(testFactory, "VotingCreated");
    });

    it("Should reject non-space-owners from creating proposals without whitelist", async function () {
      const { mockENS, spaceRegistry, privateProposalFactory: testFactory } = await deployProposalCreationFixture(this.signers.owner, this.signers.user1, this.signers.user2);

      // user2 tries to create proposal in user1's space
      const ensName = "user.eth";
      const userSpaceId = ethers.keccak256(ethers.toUtf8Bytes(ensName));

      const node = await spaceRegistry.namehash(ensName);
      await mockENS.setNodeOwner(node, this.signers.user1.address);

      await spaceRegistry.connect(this.signers.user1).createSpace(ensName, "User Space");

      // Whitelist owner for creating proposals
      await testFactory.updateWhitelist(this.signers.owner.address, true);

      const invalidParams: CreateProposalParamsStruct = {
        spaceId: userSpaceId,
        title: "Invalid Proposal",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No"],
        start: 0,
        end: 300,
        quorumMode: 0,
        quorumValue: 1,
        thresholdMode: 0,
        thresholdValue: 5000,
        abstainCountsTowardQuorum: false,
        revealPolicy: 0,
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress,
        fhe: { enabled: true }
      };

      try {
        await testFactory.connect(this.signers.user2).createProposal(invalidParams);
        expect.fail("Should have thrown Fhevm assertion failed");
      } catch (error) {
        expect((error as Error).message).to.include("Fhevm assertion failed");
      }
    });
  });

  describe("Deployment", function () {
    it("Should deploy factory with correct initial state", async function () {
      expect(await privateProposalFactory.owner()).to.equal(this.signers.owner.address);
      expect(await privateProposalFactory.votingCount()).to.equal(0);
      expect(await privateProposalFactory.isWhitelisted(this.signers.owner.address)).to.be.true;
    });
  });

  describe("Whitelist Management", function () {
    it("Should allow owner to add addresses to whitelist", async function () {
      expect(await privateProposalFactory.isWhitelisted(this.signers.user1.address)).to.be.false;

      await expect(privateProposalFactory.updateWhitelist(this.signers.user1.address, true))
        .to.emit(privateProposalFactory, "WhitelistUpdated")
        .withArgs(this.signers.user1.address, true);

      expect(await privateProposalFactory.isWhitelisted(this.signers.user1.address)).to.be.true;
    });

    it("Should allow owner to remove addresses from whitelist", async function () {
      // First add user1
      await privateProposalFactory.updateWhitelist(this.signers.user1.address, true);
      expect(await privateProposalFactory.isWhitelisted(this.signers.user1.address)).to.be.true;

      // Then remove
      await expect(privateProposalFactory.updateWhitelist(this.signers.user1.address, false))
        .to.emit(privateProposalFactory, "WhitelistUpdated")
        .withArgs(this.signers.user1.address, false);

      expect(await privateProposalFactory.isWhitelisted(this.signers.user1.address)).to.be.false;
    });

    it("Should allow batch whitelist updates", async function () {
      const addresses = [this.signers.user1.address, this.signers.user2.address, this.signers.user3.address];

      // Add multiple addresses
      await privateProposalFactory.batchUpdateWhitelist(addresses, true);

      expect(await privateProposalFactory.isWhitelisted(this.signers.user1.address)).to.be.true;
      expect(await privateProposalFactory.isWhitelisted(this.signers.user2.address)).to.be.true;
      expect(await privateProposalFactory.isWhitelisted(this.signers.user3.address)).to.be.true;

      // Remove multiple addresses
      await privateProposalFactory.batchUpdateWhitelist(addresses, false);

      expect(await privateProposalFactory.isWhitelisted(this.signers.user1.address)).to.be.false;
      expect(await privateProposalFactory.isWhitelisted(this.signers.user2.address)).to.be.false;
      expect(await privateProposalFactory.isWhitelisted(this.signers.user3.address)).to.be.false;
    });

    it("Should prevent non-owners from removing from whitelist", async function () {
      // First add user1 to whitelist as owner
      await privateProposalFactory.updateWhitelist(this.signers.user1.address, true);

      try {
        await privateProposalFactory.connect(this.signers.user1).updateWhitelist(this.signers.user1.address, false);
        expect.fail("Should have thrown Fhevm assertion failed");
      } catch (error) {
        expect((error as Error).message).to.include("Fhevm assertion failed");
      }

      // Check that user1 is still whitelisted
      expect(await privateProposalFactory.isWhitelisted(this.signers.user1.address)).to.be.true;
    });

    it("Should reject zero address in whitelist updates", async function () {
      await expect(
        privateProposalFactory.updateWhitelist(ethers.ZeroAddress, true)
      ).to.be.revertedWithCustomError(privateProposalFactory, "ZeroAddr");
    });

    it("Should initialize owner as whitelisted", async function () {
      expect(await privateProposalFactory.isWhitelisted(this.signers.owner.address)).to.be.true;
    });
  });

  describe("Proposal Creation", function () {
    let createParams: CreateProposalParamsStruct;

    beforeEach(async function () {
      // Ensure the test space exists (Space Management tests may have redeployed spaceRegistry)
      try {
        await spaceRegistry.createSpace("test.eth", "Test Space");
      } catch (error) {
        // Space might already exist, ignore error
      }

      createParams = {
        spaceId: testSpaceId,
        title: "Test Proposal",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0, // ProposalType.SingleChoice
        choices: ["Yes", "No"],
        start: 0,
        end: 300,
        quorumMode: 0, // QuorumMode.Absolute
        quorumValue: 1,
        thresholdMode: 0, // ThresholdMode.SimpleMajority
        thresholdValue: 5000,
        abstainCountsTowardQuorum: false,
        revealPolicy: 0, // RevealPolicy.TotalsOnly
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress,
        fhe: { enabled: true }
      };
    });

    it("Should allow owner to create proposals", async function () {
      const initialCount = await privateProposalFactory.votingCount();

      await privateProposalFactory.createProposal(createParams);

      const finalCount = await privateProposalFactory.votingCount();
      expect(finalCount).to.equal(initialCount + 1n);

      const proposals = await privateProposalFactory.getAllVotings();
      expect(proposals.length).to.equal(1);
    });

    it("Should allow whitelisted addresses to create proposals", async function () {
      // Add user1 to whitelist
      await privateProposalFactory.updateWhitelist(this.signers.user1.address, true);

      const initialCount = await privateProposalFactory.votingCount();

      await expect(privateProposalFactory.connect(this.signers.user1).createProposal(createParams))
        .to.emit(privateProposalFactory, "VotingCreated");

      const finalCount = await privateProposalFactory.votingCount();
      expect(finalCount).to.equal(initialCount + 1n);
    });

    it("Should prevent non-whitelisted addresses from creating proposals", async function () {
      try {
        await privateProposalFactory.connect(this.signers.user2).createProposal(createParams);
        expect.fail("Should have thrown Fhevm assertion failed");
      } catch (error) {
        expect((error as Error).message).to.include("Fhevm assertion failed");
      }
    });

    it("Should reject proposals with empty title", async function () {
      const invalidParams = { ...createParams, title: "" };

      await expect(
        privateProposalFactory.createProposal(invalidParams)
      ).to.be.revertedWithCustomError(privateProposalFactory, "EmptyName");
    });

    it("Should reject proposals with title too long", async function () {
      const longTitle = "a".repeat(201);
      const invalidParams = { ...createParams, title: longTitle };

      await expect(
        privateProposalFactory.createProposal(invalidParams)
      ).to.be.revertedWithCustomError(privateProposalFactory, "NameTooLong");
    });

    it("Should reject duplicate proposal titles", async function () {
      await privateProposalFactory.createProposal(createParams);

      await expect(
        privateProposalFactory.createProposal(createParams)
      ).to.be.revertedWithCustomError(privateProposalFactory, "NameUsed");
    });

    it("Should store proposal by name", async function () {
      await privateProposalFactory.createProposal(createParams);

      const proposals = await privateProposalFactory.getAllVotings();
      const storedAddress = await privateProposalFactory.votingByName("Test Proposal");

      expect(storedAddress).to.equal(proposals[0]);
      expect(await privateProposalFactory.isValidVoting(storedAddress)).to.be.true;
    });
  });

  describe("Proposal Cancellation", function () {
    it("Should allow cancelling proposals before they start", async function () {
      const currentBlock = await ethers.provider.getBlock('latest');
      const currentTime = currentBlock!.timestamp;

      const futureParams: CreateProposalParamsStruct = {
        spaceId: testSpaceId,
        title: "Future Proposal",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No"],
        start: currentTime + 3600, // Starts in 1 hour
        end: currentTime + 3900,
        quorumMode: 0,
        quorumValue: 1,
        thresholdMode: 0,
        thresholdValue: 5000,
        abstainCountsTowardQuorum: false,
        revealPolicy: 0,
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress,
        fhe: { enabled: true }
      };

      await privateProposalFactory.createProposal(futureParams);

      const proposals = await privateProposalFactory.getAllVotings();
      const proposalAddress = proposals[proposals.length - 1];

      // Creator (owner) can cancel
      await expect(privateProposalFactory.cancelVoting(proposalAddress))
        .to.emit(privateProposalFactory, "VotingCancelled");

      expect(await privateProposalFactory.isCancelled(proposalAddress)).to.be.true;
      expect(await privateProposalFactory.isValidVoting(proposalAddress)).to.be.false;
    });

    it("Should prevent cancelling proposals after they start", async function () {
      const immediateParams = {
        spaceId: testSpaceId,
        title: "Immediate Proposal",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No"],
        start: 0, // Starts immediately
        end: 300,
        quorumMode: 0,
        quorumValue: 1,
        thresholdMode: 0,
        thresholdValue: 5000,
        abstainCountsTowardQuorum: false,
        revealPolicy: 0,
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress,
        fhe: { enabled: true }
      };

      await privateProposalFactory.createProposal(immediateParams);

      const proposals = await privateProposalFactory.getAllVotings();
      const proposalAddress = proposals[proposals.length - 1];

    // Advance time so proposal starts
    await time.increase(120);      await expect(
        privateProposalFactory.cancelVoting(proposalAddress)
      ).to.be.revertedWithCustomError(privateProposalFactory, "Started");
    });

    it("Should only allow creator or owner to cancel", async function () {
      const currentBlock = await ethers.provider.getBlock('latest');
      const currentTime = currentBlock!.timestamp;

      const futureParams: CreateProposalParamsStruct = {
        spaceId: testSpaceId,
        title: "Creator Cancel Test",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No"],
        start: currentTime + 3600,
        end: currentTime + 3900,
        quorumMode: 0,
        quorumValue: 1,
        thresholdMode: 0,
        thresholdValue: 5000,
        abstainCountsTowardQuorum: false,
        revealPolicy: 0,
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress,
        fhe: { enabled: true }
      };

      // Create as user1 (after whitelisting)
      await privateProposalFactory.updateWhitelist(this.signers.user1.address, true);
      await privateProposalFactory.connect(this.signers.user1).createProposal(futureParams);

      const proposals = await privateProposalFactory.getAllVotings();
      const proposalAddress = proposals[proposals.length - 1];

      // user2 should not be able to cancel
      try {
        await privateProposalFactory.connect(this.signers.user2).cancelVoting(proposalAddress);
        expect.fail("Should have thrown Fhevm assertion failed");
      } catch (error) {
        expect((error as Error).message).to.include("Fhevm assertion failed");
      }

      // Verify proposal is still valid (not cancelled)
      expect(await privateProposalFactory.isValidVoting(proposalAddress)).to.be.true;
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const currentBlock = await ethers.provider.getBlock('latest');
      const currentTime = currentBlock!.timestamp;

      // Create some test proposals
      const baseParams: Omit<CreateProposalParamsStruct, "title" | "start" | "end"> = {
        spaceId: testSpaceId,
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No"],
        quorumMode: 0,
        quorumValue: 1,
        thresholdMode: 0,
        thresholdValue: 5000,
        abstainCountsTowardQuorum: false,
        revealPolicy: 0,
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress,
        fhe: { enabled: true }
      };

      // Future proposal
      await privateProposalFactory.createProposal({
        ...baseParams,
        title: "Future Proposal",
        start: currentTime + 3600, // Starts in 1 hour
        end: currentTime + 7200 // Ends in 2 hours
      });

      // Active proposal (starts immediately)
      await privateProposalFactory.createProposal({
        ...baseParams,
        title: "Active Proposal",
        start: 0, // Start immediately
        end: currentTime + 3600 // Ends in 1 hour
      });

      // Another active proposal for testing
      await privateProposalFactory.createProposal({
        ...baseParams,
        title: "Another Active Proposal",
        start: 0, // Start immediately
        end: currentTime + 7200 // Ends in 2 hours
      });
    });

    it("Should return correct voting counts", async function () {
      expect(await privateProposalFactory.votingCount()).to.equal(3);
    });

    it("Should return all votings", async function () {
      const allVotings = await privateProposalFactory.getAllVotings();
      expect(allVotings.length).to.equal(3);
    });

    it("Should filter upcoming votings", async function () {
      const upcoming = await privateProposalFactory.getUpcomingVotings();
      expect(upcoming.length).to.equal(1); // The future proposal
    });

    it("Should filter active votings", async function () {
      const active = await privateProposalFactory.getActiveVotings();
      expect(active.length).to.equal(2); // The two active proposals
    });

    it("Should filter ended votings", async function () {
      const ended = await privateProposalFactory.getEndedVotings();
      expect(ended.length).to.equal(0); // No ended proposals
    });

    it("Should return user votings", async function () {
      const userVotings = await privateProposalFactory.getUserVotings(this.signers.owner.address);
      expect(userVotings.length).to.equal(3); // Owner created 3 proposals
    });
  });

  describe("Chainlink Automation", function () {
    let activeProposalAddress: string;

    beforeEach(async function () {
      // Create an active proposal that will need upkeep
      const currentBlock = await ethers.provider.getBlock('latest');
      const currentTime = currentBlock!.timestamp;

      const createParams: CreateProposalParamsStruct = {
        spaceId: testSpaceId,
        title: "Automation Test Proposal",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No"],
        start: 0,
        end: currentTime + 300, // Will end in 5 minutes
        quorumMode: 0,
        quorumValue: 1,
        thresholdMode: 0,
        thresholdValue: 5000,
        abstainCountsTowardQuorum: false,
        revealPolicy: 0,
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress,
        fhe: { enabled: true }
      };

      await privateProposalFactory.createProposal(createParams);

      const proposals = await privateProposalFactory.getAllVotings();
      activeProposalAddress = proposals[0];

      // Vote to make it a valid proposal
      const proposal = await ethers.getContractAt("PrivateProposal", activeProposalAddress);
      const encryptedVote = await fhevm
        .createEncryptedInput(proposal.target.toString(), this.signers.user1.address)
        .add8(0)
        .encrypt();

      await proposal.connect(this.signers.user1).vote(encryptedVote.handles[0], encryptedVote.inputProof);

    // Advance time past proposal end
    await time.increase(400);
    });

    it("Should detect upkeep needed for ended proposals", async function () {
      const [upkeepNeeded, performData] = await privateProposalFactory.checkUpkeep("0x");

      expect(upkeepNeeded).to.be.true;
      expect(performData).to.not.equal("0x");
    });

    it("Should perform upkeep on ended proposals", async function () {
      const [upkeepNeeded, performData] = await privateProposalFactory.checkUpkeep("0x");
      expect(upkeepNeeded).to.be.true;

    await expect(privateProposalFactory.performUpkeep(performData))
      .to.emit(privateProposalFactory, "UpkeepPerformed");

    // Check that upkeep was performed
      const proposal = await ethers.getContractAt("PrivateProposal", activeProposalAddress);
      expect(await proposal.autoRevealTriggered()).to.be.true;
    });

    it("Should not need upkeep when no proposals are ready", async function () {
      // Perform upkeep first
      const [upkeepNeeded1, performData1] = await privateProposalFactory.checkUpkeep("0x");
      await privateProposalFactory.performUpkeep(performData1);

      // Check again - should not need upkeep
      const [upkeepNeeded2, performData2] = await privateProposalFactory.checkUpkeep("0x");

      expect(upkeepNeeded2).to.be.false;
    });

    it("Should handle multiple proposals needing upkeep", async function () {
      // Create another proposal
      const currentBlock = await ethers.provider.getBlock('latest');
      const currentTime = currentBlock!.timestamp;

      const createParams2: CreateProposalParamsStruct = {
        spaceId: testSpaceId,
        title: "Second Automation Proposal",
        bodyURI: "https://example.com/proposal2",
        discussionURI: "https://example.com/discussion2",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No"],
        start: 0,
        end: currentTime + 300,
        quorumMode: 0,
        quorumValue: 1,
        thresholdMode: 0,
        thresholdValue: 5000,
        abstainCountsTowardQuorum: false,
        revealPolicy: 0,
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress,
        fhe: { enabled: true }
      };

      await privateProposalFactory.createProposal(createParams2);

      const proposals = await privateProposalFactory.getAllVotings();
      const secondProposalAddress = proposals[1];

      // Vote on second proposal
      const proposal2 = await ethers.getContractAt("PrivateProposal", secondProposalAddress);
      const encryptedVote2 = await fhevm
        .createEncryptedInput(proposal2.target.toString(), this.signers.user2.address)
        .add8(0)
        .encrypt();

      await proposal2.connect(this.signers.user2).vote(encryptedVote2.handles[0], encryptedVote2.inputProof);

    // Advance time past both proposal ends
    await time.increase(400);      const [upkeepNeeded, performData] = await privateProposalFactory.checkUpkeep("0x");
      expect(upkeepNeeded).to.be.true;

      // Should perform upkeep on multiple proposals
      await privateProposalFactory.performUpkeep(performData);
    });
  });

  describe("Ownership", function () {
    it("Should allow ownership transfer", async function () {
      await expect(privateProposalFactory.transferOwnership(this.signers.user1.address))
        .to.emit(privateProposalFactory, "OwnershipTransferred")
        .withArgs(this.signers.owner.address, this.signers.user1.address);

      expect(await privateProposalFactory.owner()).to.equal(this.signers.user1.address);
    });

    it("Should prevent non-owners from transferring ownership", async function () {
      try {
        await privateProposalFactory.connect(this.signers.user1).transferOwnership(this.signers.user2.address);
        expect.fail("Should have thrown Fhevm assertion failed");
      } catch (error) {
        expect((error as Error).message).to.include("Fhevm assertion failed");
      }

      // Check that ownership didn't change
      expect(await privateProposalFactory.owner()).to.equal(this.signers.owner.address);
    });

    it("Should reject zero address ownership transfer", async function () {
      await expect(
        privateProposalFactory.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(privateProposalFactory, "ZeroAddr");
    });
  });
});