import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { PrivateProposal, PrivateProposalFactory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import * as hre from "hardhat";

describe("PrivateProposal", function () {
  let privateProposal: PrivateProposal;
  let privateProposalFactory: PrivateProposalFactory;
  let owner: any, user1: any, user2: any, user3: any;
  let spaceId: string;

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }
  });

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy MockENS for testing
    const MockENSFactory = await ethers.getContractFactory("MockENS");
    const mockENS = await MockENSFactory.deploy();

    // Deploy SpaceRegistry with MockENS
    const SpaceRegistryFactory = await ethers.getContractFactory("SpaceRegistry");
    const spaceRegistry = await SpaceRegistryFactory.deploy(mockENS.target);

    // Create a test space
    const ensName = "test.eth";
    spaceId = ethers.keccak256(ethers.toUtf8Bytes(ensName));

    // Set ENS ownership for the test space
    const node = await spaceRegistry.namehash(ensName);
    await mockENS.setNodeOwner(node, owner.address);

    // Create the space in the registry
    await spaceRegistry.createSpace(ensName, "Test Space");

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

    // Create a proposal instance
    const choices = ["Option A", "Option B", "Option C"];
    const votingStartTime = 0; // Start immediately
    const votingDuration = 300; // 5 minutes
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTime = currentBlock!.timestamp;

    const createParams = {
      spaceId: spaceId,
      title: "Test Private Proposal",
      bodyURI: "https://example.com/proposal",
      discussionURI: "https://example.com/discussion",
      app: "test-app",
      pType: 0, // SingleChoice
      choices: choices,
      start: votingStartTime,
      end: currentTime + votingDuration, // End relative to current time
      quorumMode: 0, // Absolute
      quorumValue: 2, // Need at least 2 votes
      thresholdMode: 0, // SimpleMajority
      thresholdValue: 5000, // 50%
      abstainCountsTowardQuorum: false,
      revealPolicy: 0, // TotalsOnly
      fhe: { enabled: true },
      execTargets: [],
      execValues: [],
      execCalldatas: [],
      execStrategy: ethers.ZeroAddress
    };

    await privateProposalFactory.createProposal(createParams);

    const proposals = await privateProposalFactory.getAllVotings();
    const proposalAddress = proposals[0];
    privateProposal = await ethers.getContractAt("PrivateProposal", proposalAddress);
  });

  describe("Deployment", function () {
    it("Should deploy PrivateProposal with correct parameters", async function () {
      expect(await privateProposal.title()).to.equal("Test Private Proposal");
      expect(await privateProposal.choices(0)).to.equal("Option A");
      expect(await privateProposal.choices(1)).to.equal("Option B");
      expect(await privateProposal.choices(2)).to.equal("Option C");
      expect(await privateProposal.quorumValue()).to.equal(2);
      expect(await privateProposal.thresholdValue()).to.equal(5000);
    });
  });

  describe("Voting", function () {
    it("Should allow users to vote encryptedly", async function () {
      // User1 votes for option 0
      const encryptedVote0 = await fhevm
        .createEncryptedInput(privateProposal.target.toString(), user1.address)
        .add8(0)
        .encrypt();

      await privateProposal.connect(user1).vote(encryptedVote0.handles[0], encryptedVote0.inputProof);

      // User2 votes for option 1
      const encryptedVote1 = await fhevm
        .createEncryptedInput(privateProposal.target.toString(), user2.address)
        .add8(1)
        .encrypt();

      await privateProposal.connect(user2).vote(encryptedVote1.handles[0], encryptedVote1.inputProof);

      // User3 votes for option 2
      const encryptedVote2 = await fhevm
        .createEncryptedInput(privateProposal.target.toString(), user3.address)
        .add8(2)
        .encrypt();

      await privateProposal.connect(user3).vote(encryptedVote2.handles[0], encryptedVote2.inputProof);

      expect(await privateProposal.hasVoted(user1.address)).to.be.true;
      expect(await privateProposal.hasVoted(user2.address)).to.be.true;
      expect(await privateProposal.hasVoted(user3.address)).to.be.true;
    });

    it("Should prevent double voting", async function () {
      const encryptedVote = await fhevm
        .createEncryptedInput(privateProposal.target.toString(), user1.address)
        .add8(0)
        .encrypt();

      await privateProposal.connect(user1).vote(encryptedVote.handles[0], encryptedVote.inputProof);

      await expect(
        privateProposal.connect(user1).vote(encryptedVote.handles[0], encryptedVote.inputProof)
      ).to.be.revertedWith("Proposal: already voted");
    });

    it("Should prevent voting after proposal ends", async function () {
      // Advance time past voting end
      await ethers.provider.send("evm_increaseTime", [400]);
      await ethers.provider.send("evm_mine");

      const encryptedVote = await fhevm
        .createEncryptedInput(privateProposal.target.toString(), user1.address)
        .add8(0)
        .encrypt();

      await expect(
        privateProposal.connect(user1).vote(encryptedVote.handles[0], encryptedVote.inputProof)
      ).to.be.revertedWith("Proposal: proposal has ended");
    });

    it("Should prevent voting before proposal starts", async function () {
      // Create a proposal that starts in the future
      const futureStart = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const createParams = {
        spaceId: spaceId,
        title: "Future Proposal",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No"],
        start: futureStart,
        end: futureStart + 300,
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
      };

      await privateProposalFactory.createProposal(createParams);

      const proposals = await privateProposalFactory.getAllVotings();
      const futureProposalAddress = proposals[proposals.length - 1];
      const futureProposal = await ethers.getContractAt("PrivateProposal", futureProposalAddress);

      const encryptedVote = await fhevm
        .createEncryptedInput(futureProposal.target.toString(), user1.address)
        .add8(0)
        .encrypt();

      await expect(
        futureProposal.connect(user1).vote(encryptedVote.handles[0], encryptedVote.inputProof)
      ).to.be.revertedWith("Proposal: proposal not started yet");
    });
  });

  describe("Resolution and Upkeep", function () {
    beforeEach(async function () {
      // Advance to voting period (but don't end it yet)
      await ethers.provider.send("evm_increaseTime", [120]);
      await ethers.provider.send("evm_mine");
    });

    it("Should perform upkeep and decrypt all votes", async function () {
      // Users vote
      const encryptedVote0 = await fhevm
        .createEncryptedInput(privateProposal.target.toString(), user1.address)
        .add8(0)
        .encrypt();
      const encryptedVote1 = await fhevm
        .createEncryptedInput(privateProposal.target.toString(), user2.address)
        .add8(1)
        .encrypt();
      const encryptedVote2 = await fhevm
        .createEncryptedInput(privateProposal.target.toString(), user3.address)
        .add8(2)
        .encrypt();

      await privateProposal.connect(user1).vote(encryptedVote0.handles[0], encryptedVote0.inputProof);
      await privateProposal.connect(user2).vote(encryptedVote1.handles[0], encryptedVote1.inputProof);
      await privateProposal.connect(user3).vote(encryptedVote2.handles[0], encryptedVote2.inputProof);

      // Advance time past voting end
      await ethers.provider.send("evm_increaseTime", [400]);
      await ethers.provider.send("evm_mine");

      // Check upkeep needed and get performData
      const [upkeepNeeded, performData] = await privateProposalFactory.checkUpkeep("0x");
      expect(upkeepNeeded).to.be.true;

      // Perform upkeep with the correct performData
      await privateProposalFactory.performUpkeep(performData);

      // Check that upkeep was performed and autoRevealTriggered is true
      expect(await privateProposal.autoRevealTriggered()).to.be.true;
      expect(await privateProposal.resultsRevealed()).to.be.false; // Results not revealed until callback
    });

    it("Should resolve proposal correctly with majority winner", async function () {
      // Users vote
      const encryptedVote0 = await fhevm
        .createEncryptedInput(privateProposal.target.toString(), user1.address)
        .add8(0)
        .encrypt();
      const encryptedVote1 = await fhevm
        .createEncryptedInput(privateProposal.target.toString(), user2.address)
        .add8(0)
        .encrypt();
      const encryptedVote2 = await fhevm
        .createEncryptedInput(privateProposal.target.toString(), user3.address)
        .add8(1)
        .encrypt();

      await privateProposal.connect(user1).vote(encryptedVote0.handles[0], encryptedVote0.inputProof);
      await privateProposal.connect(user2).vote(encryptedVote1.handles[0], encryptedVote1.inputProof);
      await privateProposal.connect(user3).vote(encryptedVote2.handles[0], encryptedVote2.inputProof);

      // Advance time past voting end
      await ethers.provider.send("evm_increaseTime", [400]);
      await ethers.provider.send("evm_mine");

      // Check upkeep and perform
      const [upkeepNeeded, performData] = await privateProposalFactory.checkUpkeep("0x");
      await privateProposalFactory.performUpkeep(performData);

      // Check that upkeep was performed
      expect(await privateProposal.autoRevealTriggered()).to.be.true;
    });

    it("Should fail proposal when quorum not met", async function () {
      // Create a new proposal with higher quorum requirement
      const currentBlock = await ethers.provider.getBlock('latest');
      const currentTime = currentBlock!.timestamp;
      const createParams = {
        spaceId: spaceId,
        title: "High Quorum Proposal",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No"],
        start: 0,
        end: currentTime + 300,
        quorumMode: 0, // Absolute
        quorumValue: 10, // Need 10 votes, but only 3 users available
        thresholdMode: 0,
        thresholdValue: 5000,
        abstainCountsTowardQuorum: false,
        revealPolicy: 0,
        fhe: { enabled: true },
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress
      };

      await privateProposalFactory.createProposal(createParams);

      const proposals = await privateProposalFactory.getAllVotings();
      const highQuorumProposalAddress = proposals[proposals.length - 1];
      const highQuorumProposal = await ethers.getContractAt("PrivateProposal", highQuorumProposalAddress);

      // Vote on the high quorum proposal
      await ethers.provider.send("evm_increaseTime", [120]);
      await ethers.provider.send("evm_mine");

      const encryptedVote0 = await fhevm
        .createEncryptedInput(highQuorumProposal.target.toString(), user1.address)
        .add8(0)
        .encrypt();
      const encryptedVote1 = await fhevm
        .createEncryptedInput(highQuorumProposal.target.toString(), user2.address)
        .add8(0)
        .encrypt();

      await highQuorumProposal.connect(user1).vote(encryptedVote0.handles[0], encryptedVote0.inputProof);
      await highQuorumProposal.connect(user2).vote(encryptedVote1.handles[0], encryptedVote1.inputProof);

      // End voting
      await ethers.provider.send("evm_increaseTime", [400]);
      await ethers.provider.send("evm_mine");

      // Perform upkeep
      const [upkeepNeeded, performData] = await privateProposalFactory.checkUpkeep("0x");
      await privateProposalFactory.performUpkeep(performData);

      // Check that upkeep was performed
      expect(await highQuorumProposal.autoRevealTriggered()).to.be.true;
    });

    it("Should handle abstain votes correctly", async function () {
      // Create proposal with abstain option
      const currentBlock = await ethers.provider.getBlock('latest');
      const currentTime = currentBlock!.timestamp;
      const createParams = {
        spaceId: spaceId,
        title: "Abstain Test Proposal",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No", "Abstain"],
        start: 0,
        end: currentTime + 300,
        quorumMode: 0,
        quorumValue: 2,
        thresholdMode: 0,
        thresholdValue: 5000,
        abstainCountsTowardQuorum: false, // Abstain doesn't count toward quorum
        revealPolicy: 0,
        fhe: { enabled: true },
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress
      };

      await privateProposalFactory.createProposal(createParams);

      const proposals = await privateProposalFactory.getAllVotings();
      const abstainProposalAddress = proposals[proposals.length - 1];
      const abstainProposal = await ethers.getContractAt("PrivateProposal", abstainProposalAddress);

      // Vote
      await ethers.provider.send("evm_increaseTime", [120]);
      await ethers.provider.send("evm_mine");

      const encryptedVote0 = await fhevm
        .createEncryptedInput(abstainProposal.target.toString(), user1.address)
        .add8(0) // Yes
        .encrypt();
      const encryptedVote1 = await fhevm
        .createEncryptedInput(abstainProposal.target.toString(), user2.address)
        .add8(2) // Abstain
        .encrypt();
      const encryptedVote2 = await fhevm
        .createEncryptedInput(abstainProposal.target.toString(), user3.address)
        .add8(2) // Abstain
        .encrypt();

      await abstainProposal.connect(user1).vote(encryptedVote0.handles[0], encryptedVote0.inputProof);
      await abstainProposal.connect(user2).vote(encryptedVote1.handles[0], encryptedVote1.inputProof);
      await abstainProposal.connect(user3).vote(encryptedVote2.handles[0], encryptedVote2.inputProof);

      // End voting
      await ethers.provider.send("evm_increaseTime", [400]);
      await ethers.provider.send("evm_mine");

      // Perform upkeep
      const [upkeepNeeded, performData] = await privateProposalFactory.checkUpkeep("0x");
      await privateProposalFactory.performUpkeep(performData);

      // Check that upkeep was performed
      expect(await abstainProposal.autoRevealTriggered()).to.be.true;
    });
  });

  describe("Factory Management", function () {
    it("Should allow owner to create proposals", async function () {
      const initialCount = await privateProposalFactory.votingCount();

      const createParams = {
        spaceId: spaceId,
        title: "Owner Created Proposal",
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
      };

      await privateProposalFactory.createProposal(createParams);

      const finalCount = await privateProposalFactory.votingCount();
      expect(finalCount).to.equal(initialCount + 1n);
    });

    it("Should allow whitelisted addresses to create proposals", async function () {
      // Add user1 to whitelist
      await privateProposalFactory.updateWhitelist(user1.address, true);

      const createParams = {
        spaceId: spaceId,
        title: "Whitelisted User Proposal",
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
      };

      await expect(
        privateProposalFactory.connect(user1).createProposal(createParams)
      ).to.not.be.reverted;

      const votings = await privateProposalFactory.getAllVotings();
      expect(votings.length).to.be.greaterThan(1);
    });

    it("Should prevent non-whitelisted addresses from creating proposals", async function () {
      const initialCount = await privateProposalFactory.votingCount();

      const createParams = {
        spaceId: spaceId,
        title: "Non-whitelisted User Proposal",
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
      };

      // Try to create proposal as non-whitelisted user (should fail)
      try {
        await privateProposalFactory.connect(user2).createProposal(createParams);
      } catch (error) {
        // Expected to fail
      }

      // Check that no new voting was created
      const finalCount = await privateProposalFactory.votingCount();
      expect(finalCount).to.equal(initialCount);
    });

    it("Should allow owner to add and remove addresses from whitelist", async function () {
      expect(await privateProposalFactory.isWhitelisted(user1.address)).to.be.false;

      await privateProposalFactory.updateWhitelist(user1.address, true);
      expect(await privateProposalFactory.isWhitelisted(user1.address)).to.be.true;

      await privateProposalFactory.updateWhitelist(user1.address, false);
      expect(await privateProposalFactory.isWhitelisted(user1.address)).to.be.false;
    });

    it("Should allow batch whitelist updates", async function () {
      const addresses = [user1.address, user2.address, user3.address];

      await privateProposalFactory.batchUpdateWhitelist(addresses, true);

      expect(await privateProposalFactory.isWhitelisted(user1.address)).to.be.true;
      expect(await privateProposalFactory.isWhitelisted(user2.address)).to.be.true;
      expect(await privateProposalFactory.isWhitelisted(user3.address)).to.be.true;

      await privateProposalFactory.batchUpdateWhitelist(addresses, false);

      expect(await privateProposalFactory.isWhitelisted(user1.address)).to.be.false;
      expect(await privateProposalFactory.isWhitelisted(user2.address)).to.be.false;
      expect(await privateProposalFactory.isWhitelisted(user3.address)).to.be.false;
    });

    it("Should prevent non-owners from modifying whitelist", async function () {
      // Check initial state
      expect(await privateProposalFactory.isWhitelisted(user2.address)).to.be.false;

      // Try to modify whitelist as non-owner (should fail)
      try {
        await privateProposalFactory.connect(user1).updateWhitelist(user2.address, true);
      } catch (error) {
        // Expected to fail
      }

      // Check that whitelist wasn't modified
      expect(await privateProposalFactory.isWhitelisted(user2.address)).to.be.false;
    });

    it("Should initialize owner as whitelisted", async function () {
      expect(await privateProposalFactory.isWhitelisted(owner.address)).to.be.true;
    });

    it("Should allow cancelling proposals before they start", async function () {
      const createParams = {
        spaceId: spaceId,
        title: "Cancellable Proposal",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No"],
        start: Math.floor(Date.now() / 1000) + 3600, // Starts in 1 hour
        end: Math.floor(Date.now() / 1000) + 3900,
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
      };

      await privateProposalFactory.createProposal(createParams);

      const proposals = await privateProposalFactory.getAllVotings();
      const cancellableProposalAddress = proposals[proposals.length - 1];

      // Creator can cancel
      await privateProposalFactory.connect(owner).cancelVoting(cancellableProposalAddress);

      expect(await privateProposalFactory.isCancelled(cancellableProposalAddress)).to.be.true;
      expect(await privateProposalFactory.isValidVoting(cancellableProposalAddress)).to.be.false;
    });

    it("Should prevent cancelling proposals after they start", async function () {
      const createParams = {
        spaceId: spaceId,
        title: "Non-cancellable Proposal",
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
        fhe: { enabled: true },
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress
      };

      await privateProposalFactory.createProposal(createParams);

      const proposals = await privateProposalFactory.getAllVotings();
      const nonCancellableProposalAddress = proposals[proposals.length - 1];

      // Advance time so proposal starts
      await ethers.provider.send("evm_increaseTime", [120]);
      await ethers.provider.send("evm_mine");

      await expect(
        privateProposalFactory.cancelVoting(nonCancellableProposalAddress)
      ).to.be.revertedWithCustomError(privateProposalFactory, "Started");
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should reject proposals with invalid choice count", async function () {
      const createParams = {
        spaceId: spaceId,
        title: "Invalid Choices Proposal",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Only One Choice"], // Less than 2 choices
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
      };

      await expect(
        privateProposalFactory.createProposal(createParams)
      ).to.be.revertedWith("Proposal: invalid number of choices");
    });

    it("Should reject proposals with invalid timing", async function () {
      const createParams = {
        spaceId: spaceId,
        title: "Invalid Timing Proposal",
        bodyURI: "https://example.com/proposal",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: ["Yes", "No"],
        start: 1000,
        end: 500, // End before start
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
      };

      await expect(
        privateProposalFactory.createProposal(createParams)
      ).to.be.revertedWith("Proposal: invalid timing");
    });

    it("Should reject duplicate proposal titles", async function () {
      const createParams1 = {
        spaceId: spaceId,
        title: "Duplicate Title",
        bodyURI: "https://example.com/proposal1",
        discussionURI: "https://example.com/discussion1",
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
      };

      const createParams2 = {
        spaceId: spaceId,
        title: "Duplicate Title", // Same title
        bodyURI: "https://example.com/proposal2",
        discussionURI: "https://example.com/discussion2",
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
      };

      await privateProposalFactory.createProposal(createParams1);

      await expect(
        privateProposalFactory.createProposal(createParams2)
      ).to.be.revertedWithCustomError(privateProposalFactory, "NameUsed");
    });

    it("Should prevent invalid callback data", async function () {
      // Set up a proposal and trigger upkeep
      await ethers.provider.send("evm_increaseTime", [120]);
      await ethers.provider.send("evm_mine");

      const encryptedVote = await fhevm
        .createEncryptedInput(privateProposal.target.toString(), user1.address)
        .add8(0)
        .encrypt();

      await privateProposal.connect(user1).vote(encryptedVote.handles[0], encryptedVote.inputProof);

      await ethers.provider.send("evm_increaseTime", [400]);
      await ethers.provider.send("evm_mine");

      const [upkeepNeeded, performData] = await privateProposalFactory.checkUpkeep("0x");
      await privateProposalFactory.performUpkeep(performData);

      // Check that upkeep was performed
      expect(await privateProposal.autoRevealTriggered()).to.be.true;
    });

    it("Should prevent multiple upkeep calls", async function () {
      // Set up proposal and vote
      await ethers.provider.send("evm_increaseTime", [120]);
      await ethers.provider.send("evm_mine");

      const encryptedVote = await fhevm
        .createEncryptedInput(privateProposal.target.toString(), user1.address)
        .add8(0)
        .encrypt();

      await privateProposal.connect(user1).vote(encryptedVote.handles[0], encryptedVote.inputProof);

      await ethers.provider.send("evm_increaseTime", [400]);
      await ethers.provider.send("evm_mine");

      // First upkeep call
      const [upkeepNeeded1, performData1] = await privateProposalFactory.checkUpkeep("0x");
      await privateProposalFactory.performUpkeep(performData1);

      // Second upkeep call should not trigger again
      const [upkeepNeeded2, performData2] = await privateProposalFactory.checkUpkeep("0x");
      expect(upkeepNeeded2).to.be.false;
    });
  });
});
