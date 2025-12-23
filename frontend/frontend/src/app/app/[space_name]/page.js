"use client";
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Calendar, Settings, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { ProposalTable } from '@/components/dashboard/ProposalTable';
import { CreateProposalDialog } from '@/components/dashboard/CreateProposalDialog';
import { SpaceDescriptionDisplay } from '@/components/dashboard/SpaceDescriptionDisplay';
import Link from 'next/link';
import { SepoliaNetworkGuard } from '@/components/ui/SepoliaNetworkGuard';

// Import the SpaceRegistry ABI
import spaceRegistryAbi from '@/abis/SpaceRegistry.json';
import { useSpaceByEns, useAdminSpaceIds, useLatestDisplayNameUpdates, useProposalsBySpace, useMemberCounts, useMemberSpaceIds } from '@/hooks/useSubgraph';
import { useSpaceDescription } from '@/hooks/useSpaceDescription';

// Contract addresses from environment
const SPACE_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_SPACE_REGISTRY_ADDRESS;  export default function SpacePage() {
    const params = useParams();
    const router = useRouter();
    const spaceName = params.space_name;
    const { address, isConnected } = useAccount();
    const [isOwner, setIsOwner] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isMember, setIsMember] = useState(false);
    const [manageMembersOpen, setManageMembersOpen] = useState(false);
  const [adminAddressInput, setAdminAddressInput] = useState('');
  const [newDisplayNameInput, setNewDisplayNameInput] = useState('');
  const [newOwnerAddressInput, setNewOwnerAddressInput] = useState('');
  const [newDescriptionInput, setNewDescriptionInput] = useState('');
  const [newLogoInput, setNewLogoInput] = useState('');
  const [descriptionUpdateSuccess, setDescriptionUpdateSuccess] = useState(false);
  const [showOverview, setShowOverview] = useState(true);
    const [showProposals, setShowProposals] = useState(true);
    const [showHeaderOverview, setShowHeaderOverview] = useState(false);
    // Local optimistic override to show the updated display name immediately
    const [displayNameOverride, setDisplayNameOverride] = useState('');
    const logoFileInputRef = useRef(null);
    const hasLoadedDescriptionRef = useRef(false);

  // Contract interaction (write)
  const { writeContract: writeContract, data: txHash, isPending: isTxPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Use centralized hooks for subgraph queries
  const { data, isLoading: loading, error } = useSpaceByEns(spaceName);
  const { data: adminSpaceIdsData, isLoading: adminSpaceIdsLoading, error: adminSpaceIdsError } = useAdminSpaceIds(address, isConnected);
  const { data: memberSpaceIdsData, isLoading: memberSpaceIdsLoading, error: memberSpaceIdsError } = useMemberSpaceIds(address, isConnected);

  const spaceData = data?.spaces?.[0];

  const { data: proposalsData, isLoading: proposalsLoading, error: proposalsError } = useProposalsBySpace(spaceData?.spaceId, !!spaceData?.spaceId);

  // Query the latest display name update for this space
  const { data: displayNameUpdateData } = useLatestDisplayNameUpdates(spaceData?.spaceId ? [spaceData.spaceId] : []);
  // Query member count for this space
  const { data: memberCountsData } = useMemberCounts(spaceData?.spaceId ? [spaceData.spaceId] : [], !!spaceData?.spaceId);

  // Fetch space description
  const { description: spaceDescription, loading: descriptionLoading } = useSpaceDescription(spaceName);

  // Calculate member count from subgraph data
  const displayMemberCount = memberCountsData?.[spaceData?.spaceId] || 0;

  // Compute the current display name: prefer optimistic override, then latest event, then space data
  const currentDisplayName = displayNameOverride ||
    (displayNameUpdateData?.spaceDisplayNameUpdateds?.find(update => update.spaceId === spaceData?.spaceId)?.newDisplayName) ||
    spaceData?.displayName ||
    '';

  // Set isOwner and isAdmin when we have space data
  useEffect(() => {
    if (!spaceData) return;
    setIsOwner(spaceData.owner.toLowerCase() === address?.toLowerCase());
  }, [spaceData, address]);

  // Set isAdmin when we have both space data and admin event data
  useEffect(() => {
    if (!data?.spaces?.[0] || !adminSpaceIdsData?.adminAddeds) return;
    const spaceId = data.spaces[0].spaceId;
    const isAdminNow = adminSpaceIdsData.adminAddeds.some(a => a.spaceId === spaceId);
    setIsAdmin(isAdminNow);
  }, [data, adminSpaceIdsData]);

  // Set isMember when we have space data and member space IDs
  useEffect(() => {
    if (!data?.spaces?.[0] || !memberSpaceIdsData?.memberJoineds) return;
    const spaceId = data.spaces[0].spaceId;
    const isMemberNow = memberSpaceIdsData.memberJoineds.some(m => m.spaceId === spaceId);
    setIsMember(isMemberNow);
  }, [data, memberSpaceIdsData]);
  // Set initial display name input when space data loads
  useEffect(() => {
    if (spaceData?.displayName && !newDisplayNameInput) {
      setNewDisplayNameInput(spaceData.displayName);
    }
  }, [spaceData, newDisplayNameInput]);

  // Set initial description input when space description loads
  useEffect(() => {
    // Only load initial values once when spaceDescription first becomes available
    if (spaceDescription && !hasLoadedDescriptionRef.current) {
      if (spaceDescription.description) {
        setNewDescriptionInput(spaceDescription.description);
      }
      if (spaceDescription.logo) {
        setNewLogoInput(spaceDescription.logo);
      }
      hasLoadedDescriptionRef.current = true;
    }
  }, [spaceDescription]);

  // Handle joining space
  // Handle joining space
  const handleJoinSpace = () => {
    if (!spaceData?.spaceId || !address) return;

    writeContract({
      address: SPACE_REGISTRY_ADDRESS,
      abi: spaceRegistryAbi.abi,
      functionName: 'joinSpace',
      args: [spaceData.spaceId],
    });
  };

  // Nominate (add) an admin
  const handleNominateAdmin = async () => {
    if (!adminAddressInput || !spaceData?.spaceId) return;
    writeContract({
      address: SPACE_REGISTRY_ADDRESS,
      abi: spaceRegistryAbi.abi,
      functionName: 'addSpaceAdmin',
      args: [spaceData.spaceId, adminAddressInput],
    });
  };

  // Revoke (remove) an admin
  const handleRevokeAdmin = async () => {
    if (!adminAddressInput || !spaceData?.spaceId) return;
    writeContract({
      address: SPACE_REGISTRY_ADDRESS,
      abi: spaceRegistryAbi.abi,
      functionName: 'removeSpaceAdmin',
      args: [spaceData.spaceId, adminAddressInput],
    });
  };

  // Update display name (owner or admin)
  const handleUpdateDisplayName = async () => {
    if (!newDisplayNameInput || !spaceData?.spaceId) return;
    writeContract({
      address: SPACE_REGISTRY_ADDRESS,
      abi: spaceRegistryAbi.abi,
      functionName: 'updateSpaceDisplayName',
      args: [spaceData.spaceId, newDisplayNameInput],
    });
  };
  // Update description (owner or admin)
  const handleUpdateDescription = async () => {
    if (!spaceData?.spaceId) return;
    
    try {
      const response = await fetch('/api/space-description', {
        method: spaceDescription?.description ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: spaceName,
          ensName: spaceData.ensName,
          description: newDescriptionInput.trim(),
          logo: newLogoInput || '', // Send empty string if logo is cleared
          createdBy: address,
        }),
      });
      if (response.ok) {
        console.log('✅ Description updated successfully');
        // Invalidate the description query to refetch
        queryClient.invalidateQueries(['spaceDescription', spaceName]);
        // Show success state
        setDescriptionUpdateSuccess(true);
        // Automatically expand the header to show the updated description
        setShowHeaderOverview(true);
        // Refresh the page to show updated description
        setTimeout(() => {
          router.refresh();
          // Force re-fetch by reloading
          window.location.reload();
        }, 500);
        // Hide success message after 3 seconds
        setTimeout(() => setDescriptionUpdateSuccess(false), 3000);
      } else {
        console.error('❌ Failed to update description');
      }
    } catch (error) {
      console.error('❌ Error updating description:', error);
    }
  };

  // Deactivate space (owner only)
  const handleDeactivateSpace = async () => {
    if (!spaceData?.spaceId) return;
    writeContract({
      address: SPACE_REGISTRY_ADDRESS,
      abi: spaceRegistryAbi.abi,
      functionName: 'deactivateSpace',
      args: [spaceData.spaceId],
    });
  };

  // Transfer ownership (owner only)
  const handleTransferOwnership = async () => {
    if (!newOwnerAddressInput || !spaceData?.spaceId) return;
    writeContract({
      address: SPACE_REGISTRY_ADDRESS,
      abi: spaceRegistryAbi.abi,
      functionName: 'transferOwnership',
      args: [spaceData.spaceId, newOwnerAddressInput],
    });
  };

  // Query client for invalidation
  const queryClient = useQueryClient();

  // Refresh data after successful transaction — invalidate the space query and apply an optimistic override
  useEffect(() => {
    if (txSuccess) {
      // Invalidate the space query so fresh data is fetched from the subgraph
      queryClient.invalidateQueries(['spaceByEns', spaceName]);
      // Also invalidate the display name update query
      queryClient.invalidateQueries(['latestDisplayNameUpdate', spaceData?.spaceId]);
      // Invalidate member count query to refresh after join/leave operations
      queryClient.invalidateQueries(['memberCounts']);

      // Optimistically update the UI with the new display name while the subgraph indexes the change
      if (newDisplayNameInput) {
        setDisplayNameOverride(newDisplayNameInput);
      }
    }
  }, [txSuccess, queryClient, spaceName, spaceData?.spaceId, newDisplayNameInput]);

  if (loading) {
    return (
      <SepoliaNetworkGuard>
        <div className="min-h-screen bg-gradient-to-br from-white via-[#E8DCC4]/20 to-white flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#4D89B0]" />
        </div>
      </SepoliaNetworkGuard>
    );
  }

  if (error || !spaceData) {
    return (
      <SepoliaNetworkGuard>
        <div className="min-h-screen bg-gradient-to-br from-white via-[#E8DCC4]/20 to-white">
          <div className="container mx-auto px-4 py-8">
            <Alert variant="destructive" className="bg-white/80 border-[#E8DCC4]/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-black">
                Space &quot;{spaceName}&quot; not found or does not exist.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </SepoliaNetworkGuard>
    );
  }

  return (
    <SepoliaNetworkGuard>
      <div className="min-h-screen bg-gradient-to-br from-white via-[#E8DCC4]/20 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Space Header */}
            <Card className="bg-white/80 border-[#E8DCC4]/30">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl text-black">{currentDisplayName}</CardTitle>
                    <CardDescription className="text-lg text-black">
                      {spaceData.ensName}
                    </CardDescription>
                  </div>
                  <div className="flex items-start gap-3">
                    {spaceDescription?.logo && (
                      <Image 
                        src={spaceDescription.logo} 
                        alt={`${currentDisplayName} logo`} 
                        width={80}
                        height={80}
                        className="object-contain [filter:brightness(0)_saturate(100%)_invert(42%)_sepia(18%)_saturate(1034%)_hue-rotate(163deg)_brightness(91%)_contrast(89%)]"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHeaderOverview(!showHeaderOverview)}
                      className="text-[#4D89B0] hover:bg-transparent p-1 h-6 w-6 cursor-pointer"
                    >
                      {showHeaderOverview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showHeaderOverview && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-[#4D89B0] mb-2">About This Space</h3>
                    {descriptionLoading ? (
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ) : spaceDescription?.description ? (
                      <p className="text-black whitespace-pre-wrap">
                        {spaceDescription.description}
                      </p>
                    ) : (
                      <p className="text-black italic">
                        No description provided. This governance space was created through the SpaceRegistry contract with ENS verification.
                      </p>
                    )}
                    {!isConnected && (
                      <p className="text-sm text-black mt-2">
                        Connect your wallet to interact with this space.
                      </p>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#4D89B0]/60" />
                    <span className="text-sm text-black">{displayMemberCount.toString()} members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[#4D89B0]/60" />
                    <span className="text-sm text-black">
                      Created: {new Date(Number(spaceData.createdAt) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Badge variant={spaceData.isActive ? "default" : "secondary"} className={spaceData.isActive ? "bg-[#4D89B0] text-white" : ""}>
                      {spaceData.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {(isOwner || isAdmin) ? (
                      <>
                        {isOwner ? (
                          <Badge variant="outline" className="border-[#4D89B0] text-[#4D89B0]">Owner</Badge>
                        ) : (
                          <Badge variant="outline" className="border-[#4D89B0] text-[#4D89B0]">Admin</Badge>
                        )}
                      </>
                    ) : isMember ? (
                      <Badge variant="outline" className="border-[#4D89B0] text-[#4D89B0]">Member</Badge>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Space Content */}
            <div className="space-y-6">
              {/* Proposals Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-black">All Proposals</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowProposals(!showProposals)}
                    className="text-[#4D89B0] hover:bg-[#4D89B0]/10 cursor-pointer"
                  >
                    {showProposals ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                {showProposals && (
                  <>
                    {(isMember || isAdmin || isOwner) ? (
                      <ProposalTable
                        proposals={proposalsData?.proposalCreateds || []}
                        loading={proposalsLoading}
                        error={proposalsError}
                        spaceName={spaceName}
                        title=""
                      />
                    ) : (
                      <Card className="bg-white/80 border-[#E8DCC4]/30">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <Users className="h-12 w-12 text-[#4D89B0]/60 mb-4" />
                          <h3 className="text-lg font-semibold text-black mb-2">Join Space to View Proposals</h3>
                          <p className="text-sm text-black/70 text-center mb-4">
                            You need to be a member of this space to view and participate in proposals.
                          </p>
                          {isConnected ? (
                            <Button
                              onClick={handleJoinSpace}
                              disabled={isTxPending || isConfirming}
                              className="bg-[#4D89B0] hover:bg-[#4D89B0]/90 text-white cursor-pointer"
                            >
                              {isTxPending || isConfirming ? 'Joining...' : 'Join Space'}
                            </Button>
                          ) : (
                            <p className="text-sm text-black/70">Connect your wallet to join this space.</p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>

              {(isOwner || isAdmin) ? (
                /* Owner/Admin View */
                <>
                  <Card className="bg-white/80 border-[#E8DCC4]/30">
                    <CardHeader>
                      <CardTitle className="text-black">Space Management</CardTitle>
                      <CardDescription className="text-black">
                        Manage your space settings and create governance proposals.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <CreateProposalDialog
                          spaceId={spaceData.spaceId}
                          spaceName={currentDisplayName}
                        />
                        <div className="flex items-center gap-2">
                          {isOwner && (
                            <Button variant="outline" className="flex items-center gap-2 border-[#4D89B0] text-black hover:bg-[#4D89B0] hover:text-white cursor-pointer" onClick={() => setManageMembersOpen(!manageMembersOpen)}>
                              <Users className="h-4 w-4" />
                              Manage Space
                            </Button>
                          )}
                        </div>
                      </div>
                      {manageMembersOpen && (
                        <div className="mt-6 space-y-4 border-t border-[#E8DCC4]/30 pt-4">
                          <div className="flex flex-col md:flex-row gap-2">
                            <input
                              type="text"
                              placeholder="0xAdminAddress"
                              value={adminAddressInput}
                              onChange={(e) => setAdminAddressInput(e.target.value)}
                              className="w-full md:w-2/3 border border-[#E8DCC4]/30 rounded px-3 py-2 bg-white/50"
                            />
                            <div className="flex gap-2">
                              <Button onClick={handleNominateAdmin} disabled={isTxPending || isConfirming} className="bg-[#4D89B0] hover:bg-[#4D89B0]/90 text-white cursor-pointer">Nominate Admin</Button>
                              <Button variant="ghost" onClick={handleRevokeAdmin} disabled={isTxPending || isConfirming} className="border-[#4D89B0] text-black hover:bg-[#4D89B0] hover:text-white cursor-pointer">Revoke Admin</Button>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-[#E8DCC4]/30">
                            <p className="text-sm text-black mb-2">Update space display name</p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Enter new display name"
                                value={newDisplayNameInput}
                                onChange={(e) => setNewDisplayNameInput(e.target.value)}
                                className="flex-1 border border-[#E8DCC4]/30 rounded px-3 py-2 bg-white/50"
                              />
                              <Button onClick={handleUpdateDisplayName} disabled={isTxPending || isConfirming || !spaceData || newDisplayNameInput === spaceData.displayName} className="bg-[#4D89B0] hover:bg-[#4D89B0]/90 text-white cursor-pointer">Update</Button>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-[#E8DCC4]/30">
                            <p className="text-sm text-black mb-2">Update space description</p>
                            {descriptionUpdateSuccess && (
                              <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                <p className="text-sm text-green-800">✓ Description updated successfully!</p>
                              </div>
                            )}
                            <div className="space-y-2">
                              <textarea
                                placeholder="Enter space description..."
                                value={newDescriptionInput}
                                onChange={(e) => setNewDescriptionInput(e.target.value)}
                                rows={4}
                                maxLength={500}
                                className="w-full px-3 py-2 rounded-md bg-white/50 border border-[#E8DCC4]/30 text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#4D89B0] focus:border-transparent"
                              />
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-black/60">{newDescriptionInput.length}/500 characters</span>
                              </div>
                              <div className="mt-2">
                                <label className="block text-sm text-black mb-1">Logo Image (optional)</label>
                                <input
                                  ref={logoFileInputRef}
                                  type="file"
                                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      if (file.size > 2 * 1024 * 1024) {
                                        alert('Image must be smaller than 2MB');
                                        return;
                                      }
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        setNewLogoInput(reader.result);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                  className="w-full px-3 py-2 rounded-md bg-white/50 border border-[#E8DCC4]/30 text-black text-sm file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-[#4D89B0] file:text-white hover:file:bg-[#4D89B0]/90 file:cursor-pointer"
                                />
                                {newLogoInput && (
                                  <div className="mt-2 p-2 border border-[#E8DCC4]/30 rounded-md bg-white">
                                    <div className="flex items-start justify-between mb-1">
                                      <p className="text-xs text-black">Preview:</p>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          console.log('Clear Logo clicked - current logo:', newLogoInput);
                                          setNewLogoInput('');
                                          if (logoFileInputRef.current) {
                                            logoFileInputRef.current.value = '';
                                            console.log('File input cleared');
                                          }
                                          console.log('Logo should now be empty');
                                        }}
                                        className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                      >
                                        Clear Logo
                                      </Button>
                                    </div>
                                    <Image src={newLogoInput} alt="Logo preview" width={64} height={64} className="object-contain [filter:brightness(0)_saturate(100%)_invert(42%)_sepia(18%)_saturate(1034%)_hue-rotate(163deg)_brightness(91%)_contrast(89%)]" onError={(e) => e.target.style.display = 'none'} />
                                  </div>
                                )}
                              </div>
                              <div className="mt-4">
                                <Button 
                                  onClick={handleUpdateDescription} 
                                  disabled={isTxPending || isConfirming || (newDescriptionInput === spaceDescription?.description && newLogoInput === spaceDescription?.logo)}
                                  className="w-full bg-[#4D89B0] hover:bg-[#4D89B0]/90 text-white cursor-pointer"
                                >
                                  Update Description & Logo
                                </Button>
                              </div>
                            </div>
                          </div>

                          {isOwner && (
                            <>
                              <div className="pt-4 border-t border-[#E8DCC4]/30">
                                <p className="text-sm text-black mb-2">Transfer ownership</p>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="0xNewOwnerAddress"
                                    value={newOwnerAddressInput}
                                    onChange={(e) => setNewOwnerAddressInput(e.target.value)}
                                    className="flex-1 border border-[#E8DCC4]/30 rounded px-3 py-2 bg-white/50"
                                  />
                                  <Button onClick={handleTransferOwnership} disabled={isTxPending || isConfirming} className="bg-[#4D89B0] hover:bg-[#4D89B0]/90 text-white cursor-pointer">Transfer</Button>
                                </div>
                              </div>

                              <div className="pt-4 border-t border-[#9e0e40]">
                                <p className="text-sm text-black mb-2">Deactivate space</p>
                                <Button onClick={handleDeactivateSpace} disabled={isTxPending || isConfirming} variant="destructive" className="bg-[#9e0e40] hover:bg-[#9e0e40]/90 text-white cursor-pointer">Deactivate Space</Button>
                              </div>
                            </>
                          )}

                          {writeError && (
                            <div className="text-sm text-red-600">{writeError.message}</div>
                          )}
                          {isTxPending && (
                            <div className="text-sm text-black">Transaction pending...</div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                /* Public View - No additional content */
                null
              )}
            </div>
          </div>
        </div>
      </div>
    </SepoliaNetworkGuard>
  );
}