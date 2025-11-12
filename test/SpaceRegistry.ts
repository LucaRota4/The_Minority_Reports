import { expect } from "chai";
import { ethers } from "hardhat";
import { SpaceRegistry } from "../types/contracts/SpaceRegistry.sol";
import { MockENS } from "../types/contracts/MockENS";

describe("SpaceRegistry", function () {
  let spaceRegistry: SpaceRegistry;
  let mockENS: MockENS;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock ENS
    const MockENSFactory = await ethers.getContractFactory("MockENS");
    mockENS = await MockENSFactory.deploy();
    await mockENS.waitForDeployment();

    const SpaceRegistryFactory = await ethers.getContractFactory("SpaceRegistry");
    spaceRegistry = (await SpaceRegistryFactory.deploy(mockENS.target)) as SpaceRegistry;
    await spaceRegistry.waitForDeployment();
  });

  describe("createSpace", function () {
    it("should create a new space", async function () {
      const ensName = "testspace.eth";
      const displayName = "Test Space";

      // Set ENS ownership
      const node = await spaceRegistry.namehash(ensName);
      await mockENS.setNodeOwner(node, owner.address);

      const spaceId = ethers.keccak256(ethers.toUtf8Bytes(ensName));

      await expect(spaceRegistry.createSpace(ensName, displayName))
        .to.emit(spaceRegistry, "SpaceCreated")
        .withArgs(spaceId, ensName, displayName, owner.address);

      expect(await spaceRegistry.spaceExists(spaceId)).to.be.true;
      const space = await spaceRegistry.spaces(spaceId);
      expect(space.ensName).to.equal(ensName);
      expect(space.displayName).to.equal(displayName);
      expect(space.owner).to.equal(owner.address);
      expect(space.active).to.be.true;
    });

    it("should revert if space already exists", async function () {
      const ensName = "testspace.eth";
      const displayName = "Test Space";

      // Set ENS ownership
      const node = await spaceRegistry.namehash(ensName);
      await mockENS.setNodeOwner(node, owner.address);

      await spaceRegistry.createSpace(ensName, displayName);
      await expect(spaceRegistry.createSpace(ensName, displayName)).to.be.revertedWithCustomError(spaceRegistry, "SpaceAlreadyExists");
    });

    it("should revert if name is not a valid ENS name", async function () {
      const ensName = "invalidname";
      const displayName = "Test Space";

      await expect(spaceRegistry.createSpace(ensName, displayName)).to.be.revertedWithCustomError(spaceRegistry, "InvalidENSName");
    });

    it("should revert if display name is too long", async function () {
      const ensName = "testspace.eth";
      const displayName = "This display name is way too long and exceeds the 30 character limit";

      // Set ENS ownership
      const node = await spaceRegistry.namehash(ensName);
      await mockENS.setNodeOwner(node, owner.address);

      await expect(spaceRegistry.createSpace(ensName, displayName)).to.be.revertedWithCustomError(spaceRegistry, "InvalidDisplayName");
    });

    it("should revert if not ENS owner", async function () {
      const ensName = "testspace.eth";
      const displayName = "Test Space";

      // Don't set ownership
      await expect(spaceRegistry.createSpace(ensName, displayName)).to.be.revertedWithCustomError(spaceRegistry, "NotENSOwner");
    });
  });

  describe("transferSpaceOwnership", function () {
    let spaceId: string;

    beforeEach(async function () {
      const ensName = "testspace.eth";
      spaceId = ethers.keccak256(ethers.toUtf8Bytes(ensName));
      
      // Set ENS ownership
      const node = await spaceRegistry.namehash(ensName);
      await mockENS.setNodeOwner(node, owner.address);
      
      await spaceRegistry.createSpace(ensName, "Test Space");
    });

    it("should transfer ownership", async function () {
      await expect(spaceRegistry.transferSpaceOwnership(spaceId, addr1.address))
        .to.emit(spaceRegistry, "SpaceTransferred")
        .withArgs(spaceId, owner.address, addr1.address);

      const space = await spaceRegistry.spaces(spaceId);
      expect(space.owner).to.equal(addr1.address);
    });

    it("should revert if space does not exist", async function () {
      const nonExistentSpaceId = ethers.keccak256(ethers.toUtf8Bytes("nonExistent"));
      await expect(spaceRegistry.transferSpaceOwnership(nonExistentSpaceId, addr1.address)).to.be.revertedWithCustomError(spaceRegistry, "SpaceDoesNotExist");
    });

    it("should revert if not owner", async function () {
      await expect(spaceRegistry.connect(addr1).transferSpaceOwnership(spaceId, addr2.address)).to.be.revertedWithCustomError(spaceRegistry, "NotSpaceOwner");
    });

    it("should revert if new owner is zero address", async function () {
      await expect(spaceRegistry.transferSpaceOwnership(spaceId, ethers.ZeroAddress)).to.be.revertedWithCustomError(spaceRegistry, "ZeroAddress");
    });
  });

  describe("deactivateSpace", function () {
    let spaceId: string;

    beforeEach(async function () {
      const ensName = "testspace.eth";
      spaceId = ethers.keccak256(ethers.toUtf8Bytes(ensName));
      
      // Set ENS ownership
      const node = await spaceRegistry.namehash(ensName);
      await mockENS.setNodeOwner(node, owner.address);
      
      await spaceRegistry.createSpace(ensName, "Test Space");
    });

    it("should deactivate space", async function () {
      await expect(spaceRegistry.deactivateSpace(spaceId))
        .to.emit(spaceRegistry, "SpaceDeactivated")
        .withArgs(spaceId);

      const space = await spaceRegistry.spaces(spaceId);
      expect(space.active).to.be.false;
    });

    it("should revert if space does not exist", async function () {
      const nonExistentSpaceId = ethers.keccak256(ethers.toUtf8Bytes("nonExistent"));
      await expect(spaceRegistry.deactivateSpace(nonExistentSpaceId)).to.be.revertedWithCustomError(spaceRegistry, "SpaceDoesNotExist");
    });

    it("should revert if not owner", async function () {
      await expect(spaceRegistry.connect(addr1).deactivateSpace(spaceId)).to.be.revertedWithCustomError(spaceRegistry, "NotSpaceOwner");
    });
  });

  describe("isSpaceOwner", function () {
    let spaceId: string;

    beforeEach(async function () {
      const ensName = "testspace.eth";
      spaceId = ethers.keccak256(ethers.toUtf8Bytes(ensName));
      
      // Set ENS ownership
      const node = await spaceRegistry.namehash(ensName);
      await mockENS.setNodeOwner(node, owner.address);
      
      await spaceRegistry.createSpace(ensName, "Test Space");
    });

    it("should return true for owner of active space", async function () {
      expect(await spaceRegistry.isSpaceOwner(spaceId, owner.address)).to.be.true;
    });

    it("should return false for non-owner", async function () {
      expect(await spaceRegistry.isSpaceOwner(spaceId, addr1.address)).to.be.false;
    });

    it("should return false for inactive space", async function () {
      await spaceRegistry.deactivateSpace(spaceId);
      expect(await spaceRegistry.isSpaceOwner(spaceId, owner.address)).to.be.false;
    });

    it("should return false for non-existent space", async function () {
      const nonExistentSpaceId = ethers.keccak256(ethers.toUtf8Bytes("nonExistent"));
      expect(await spaceRegistry.isSpaceOwner(nonExistentSpaceId, owner.address)).to.be.false;
    });
  });

  describe("spaceIsActive", function () {
    let spaceId: string;

    beforeEach(async function () {
      const ensName = "testspace.eth";
      spaceId = ethers.keccak256(ethers.toUtf8Bytes(ensName));
      
      // Set ENS ownership
      const node = await spaceRegistry.namehash(ensName);
      await mockENS.setNodeOwner(node, owner.address);
      
      await spaceRegistry.createSpace(ensName, "Test Space");
    });

    it("should return true for active space", async function () {
      expect(await spaceRegistry.spaceIsActive(spaceId)).to.be.true;
    });

    it("should return false for inactive space", async function () {
      await spaceRegistry.deactivateSpace(spaceId);
      expect(await spaceRegistry.spaceIsActive(spaceId)).to.be.false;
    });

    it("should return false for non-existent space", async function () {
      const nonExistentSpaceId = ethers.keccak256(ethers.toUtf8Bytes("nonExistent"));
      expect(await spaceRegistry.spaceIsActive(nonExistentSpaceId)).to.be.false;
    });
  });

  describe("getOwnerSpaces", function () {
    it("should return spaces owned by address", async function () {
      const ensName1 = "testspace1.eth";
      const ensName2 = "testspace2.eth";
      const spaceId1 = ethers.keccak256(ethers.toUtf8Bytes(ensName1));
      const spaceId2 = ethers.keccak256(ethers.toUtf8Bytes(ensName2));

      // Set ENS ownership
      const node1 = await spaceRegistry.namehash(ensName1);
      const node2 = await spaceRegistry.namehash(ensName2);
      await mockENS.setNodeOwner(node1, owner.address);
      await mockENS.setNodeOwner(node2, owner.address);

      await spaceRegistry.createSpace(ensName1, "Test Space 1");
      await spaceRegistry.createSpace(ensName2, "Test Space 2");

      const ownerSpaces = await spaceRegistry.getOwnerSpaces(owner.address);
      expect(ownerSpaces).to.have.lengthOf(2);
      expect(ownerSpaces).to.include(spaceId1);
      expect(ownerSpaces).to.include(spaceId2);
    });

    it("should return empty array for address with no spaces", async function () {
      const ownerSpaces = await spaceRegistry.getOwnerSpaces(addr1.address);
      expect(ownerSpaces).to.have.lengthOf(0);
    });
  });

  describe("getSpace", function () {
    it("should return space details", async function () {
      const ensName = "testspace.eth";
      const displayName = "Test Space";
      const spaceId = ethers.keccak256(ethers.toUtf8Bytes(ensName));

      // Set ENS ownership
      const node = await spaceRegistry.namehash(ensName);
      await mockENS.setNodeOwner(node, owner.address);

      await spaceRegistry.createSpace(ensName, displayName);

      const space = await spaceRegistry.getSpace(spaceId);
      const [ensNameResult, displayNameResult, ownerResult, createdAt, active] = await spaceRegistry.getSpace(spaceId);
      expect(ensNameResult).to.equal(ensName);
      expect(displayNameResult).to.equal(displayName);
      expect(ownerResult).to.equal(owner.address);
      expect(active).to.be.true;
    });
  });

  describe("updateSpaceDisplayName", function () {
    it("should update display name", async function () {
      const ensName = "testspace.eth";
      const initialDisplayName = "Test Space";
      const newDisplayName = "Updated Space";
      const spaceId = ethers.keccak256(ethers.toUtf8Bytes(ensName));

      // Set ENS ownership
      const node = await spaceRegistry.namehash(ensName);
      await mockENS.setNodeOwner(node, owner.address);

      await spaceRegistry.createSpace(ensName, initialDisplayName);

      await expect(spaceRegistry.updateSpaceDisplayName(spaceId, newDisplayName))
        .to.emit(spaceRegistry, "SpaceDisplayNameUpdated")
        .withArgs(spaceId, newDisplayName, owner.address);

      const [ensNameResult, displayNameResult] = await spaceRegistry.getSpace(spaceId);
      expect(displayNameResult).to.equal(newDisplayName);
    });

    it("should revert if not owner", async function () {
      const ensName = "testspace.eth";
      const displayName = "Test Space";
      const newDisplayName = "Hacked Space";
      const spaceId = ethers.keccak256(ethers.toUtf8Bytes(ensName));

      // Set ENS ownership
      const node = await spaceRegistry.namehash(ensName);
      await mockENS.setNodeOwner(node, owner.address);

      await spaceRegistry.createSpace(ensName, displayName);

      await expect(spaceRegistry.connect(addr1).updateSpaceDisplayName(spaceId, newDisplayName))
        .to.be.revertedWithCustomError(spaceRegistry, "NotSpaceOwner");
    });

    it("should revert if display name too long", async function () {
      const ensName = "testspace.eth";
      const displayName = "Test Space";
      const longDisplayName = "A".repeat(31); // 31 characters
      const spaceId = ethers.keccak256(ethers.toUtf8Bytes(ensName));

      // Set ENS ownership
      const node = await spaceRegistry.namehash(ensName);
      await mockENS.setNodeOwner(node, owner.address);

      await spaceRegistry.createSpace(ensName, displayName);

      await expect(spaceRegistry.updateSpaceDisplayName(spaceId, longDisplayName))
        .to.be.revertedWithCustomError(spaceRegistry, "InvalidDisplayName");
    });
  });

  describe("namehash", function () {
    it("should compute correct namehash for .eth domain", async function () {
      const ensName = "test.eth";
      const expectedNode = ethers.namehash(ensName);
      const computedNode = await spaceRegistry.namehash(ensName);
      expect(computedNode).to.equal(expectedNode);
    });
  });
});