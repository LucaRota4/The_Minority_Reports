import { expect } from "chai";
import { ethers } from "hardhat";
import { VotingUtilsTest, PrivateProposalFactory, SpaceRegistry } from "../types";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import * as hre from "hardhat";

describe("VotingUtils", function () {
  let votingUtilsTest: VotingUtilsTest;
  let privateProposalFactory: PrivateProposalFactory;
  let spaceRegistry: SpaceRegistry;
  let owner: any;
  let spaceId: string = "";

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }
  });

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    // Deploy VotingUtils library first
    const VotingUtilsFactory = await ethers.getContractFactory("VotingUtils");
    const votingUtilsLib = await VotingUtilsFactory.deploy();

    // Deploy MockENS for testing
    const MockENSFactory = await ethers.getContractFactory("MockENS");
    const mockENS = await MockENSFactory.deploy();

    // Deploy SpaceRegistry with MockENS
    const SpaceRegistryFactory = await ethers.getContractFactory("SpaceRegistry");
    spaceRegistry = await SpaceRegistryFactory.deploy(mockENS.target);

    // Create a space with ENS name
    const ensName = "test.eth";
    spaceId = ethers.keccak256(ethers.toUtf8Bytes(ensName));

    // Set ENS ownership
    const node = await spaceRegistry.namehash(ensName);
    await mockENS.setNodeOwner(node, owner.address);

    // Create the space
    await spaceRegistry.createSpace(ensName, "Test Space");

    // Deploy factory with library linked
    const PrivateProposalFactoryFactory = await ethers.getContractFactory("PrivateProposalFactory", {
      libraries: {
        VotingUtils: votingUtilsLib.target,
      },
    });
    privateProposalFactory = await PrivateProposalFactoryFactory.deploy(spaceRegistry.target);

    // Deploy test contract with library linked
    const VotingUtilsTestFactory = await ethers.getContractFactory("VotingUtilsTest", {
      libraries: {
        VotingUtils: votingUtilsLib.target,
      },
    });
    votingUtilsTest = await VotingUtilsTestFactory.deploy();
  });

  describe("filterVotings", function () {
    it("Should filter votings by status correctly", async function () {
      const choices = ["Yes", "No"];

      // Get initial time
      const initialTime = await time.latest();

      // Create upcoming proposal (start in 2 hours)
      const upcomingParams = {
        spaceId: spaceId,
        title: "Upcoming Proposal",
        bodyURI: "https://example.com/upcoming",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0, // SingleChoice
        choices: choices,
        start: initialTime + 7200, // 2 hours from now
        end: initialTime + 10800, // 3 hours from now
        quorumMode: 0, // Absolute
        quorumValue: 1,
        thresholdMode: 0, // SimpleMajority
        thresholdValue: 5000,
        abstainCountsTowardQuorum: false,
        revealPolicy: 0, // TotalsOnly
        fhe: { enabled: true },
        execTargets: [],
        execValues: [],
        execCalldatas: [],
        execStrategy: ethers.ZeroAddress
      };

      await privateProposalFactory.createProposal(upcomingParams);
      const proposals = await privateProposalFactory.getAllVotings();
      const upcomingProposal = proposals[0];

      // Advance time to 2.5 hours from start (after upcoming starts, before it ends)
      await time.increaseTo(initialTime + 9000);

      // Create active proposal
      const activeParams = {
        spaceId: spaceId,
        title: "Active Proposal",
        bodyURI: "https://example.com/active",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: choices,
        start: 0, // Start immediately
        end: 3600, // End in 1 hour from now
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

      await privateProposalFactory.createProposal(activeParams);
      const proposalsAfterActive = await privateProposalFactory.getAllVotings();
      const activeProposal = proposalsAfterActive[1];

      // Advance time to 4 hours from start (after active ends)
      await time.increaseTo(initialTime + 14400);

      // Create ended proposal
      const endedParams = {
        spaceId: spaceId,
        title: "Ended Proposal",
        bodyURI: "https://example.com/ended",
        discussionURI: "https://example.com/discussion",
        app: "test-app",
        pType: 0,
        choices: choices,
        start: 0, // Start immediately
        end: 301, // End after 5 minutes + 1 second
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

      await privateProposalFactory.createProposal(endedParams);
      const allProposals = await privateProposalFactory.getAllVotings();
      const endedProposal = allProposals[2];

      // Advance time to after ended proposal ends but before active ends
      await time.increaseTo(initialTime + 15000);

      // Add all proposals to test contract
      for (const proposal of allProposals) {
        await votingUtilsTest.addVoting(proposal);
      }

      // Cancel one proposal (the active one)
      await votingUtilsTest.cancelVoting(activeProposal);

      // Test filtering
      const upcomingVotings = await votingUtilsTest.filterVotings(0); // upcoming
      const activeVotings = await votingUtilsTest.filterVotings(1); // active
      const endedVotings = await votingUtilsTest.filterVotings(2); // ended

      // Should have 0 upcoming
      expect(upcomingVotings.length).to.equal(0);

      // Should have 0 active (the active one is cancelled)
      expect(activeVotings.length).to.equal(0);

      // Should have 2 ended (upcoming and ended proposals, not cancelled)
      expect(endedVotings.length).to.equal(2);
      expect(endedVotings).to.include(upcomingProposal);
      expect(endedVotings).to.include(endedProposal);
    });

    it("Should return empty array when no votings match status", async function () {
      // No proposals created, should return empty arrays
      const upcomingVotings = await votingUtilsTest.filterVotings(0);
      const activeVotings = await votingUtilsTest.filterVotings(1);
      const endedVotings = await votingUtilsTest.filterVotings(2);

      expect(upcomingVotings.length).to.equal(0);
      expect(activeVotings.length).to.equal(0);
      expect(endedVotings.length).to.equal(0);
    });
  });
});