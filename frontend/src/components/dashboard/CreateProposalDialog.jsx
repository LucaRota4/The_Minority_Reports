"use client";
import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Loader2, ChevronDown } from 'lucide-react';

// Import the PrivateProposalFactory ABI
import privateProposalFactoryAbi from '@/abis/PrivateProposalFactory.json';

export function CreateProposalDialog({ spaceId, spaceName }) {
  const [open, setOpen] = useState(false);
  const [hoveredFilter, setHoveredFilter] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    bodyURI: '',
    pType: 0, // Default to NonWeightedSingleChoice
    choices: ['For', 'Against', 'Abstain'],
    start: '',
    end: '',
    eligibilityType: 0, // Default to Public
    eligibilityToken: process.env.NEXT_PUBLIC_MOCK_GOVERNANCE_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
    eligibilityThreshold: '1'
  });

  // Define colors for consistency
  const colors = {
    primary: '#4D89B0', // Zama blue
    white: '#ffffff',
    black: '#000000',
    hoverBg: 'rgba(77, 137, 176, 0.1)',
  };

  const eligibilityOptions = [
    { value: 0, label: 'Public' },
    { value: 1, label: 'Token Holder' },
  ];

  const proposalTypeOptions = [
    { value: 0, label: 'Non-Weighted Single Choice' },
    { value: 1, label: 'Weighted Single Choice' },
    { value: 2, label: 'Weighted Fractional' },
  ];

  const { address } = useAccount();
  const { writeContract, data: txHash, isPending: isTxPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'eligibilityType') {
        if (value === 0) {
          // Public: no restriction, only non-weighted, set token to zero, threshold to 0
          newData.pType = 0;
          newData.eligibilityToken = '0x0000000000000000000000000000000000000000';
          newData.eligibilityThreshold = '0';
        } else if (value === 1) {
          // Token Holder: allow weighted types, set default threshold to 1
          newData.eligibilityThreshold = '1';
        }
      }
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.bodyURI.trim() || !address) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate dates
    const startTimestamp = formData.start ? new Date(formData.start).getTime() : Date.now();
    const endTimestamp = formData.end ? new Date(formData.end).getTime() : Date.now() + 604800000; // Default 1 week

    if (endTimestamp <= startTimestamp) {
      alert('End date must be after start date');
      return;
    }

    if (endTimestamp <= Date.now()) {
      alert('End date must be in the future');
      return;
    }

    // Validate eligibility threshold
    if (formData.eligibilityType === 1 && (isNaN(formData.eligibilityThreshold) || parseFloat(formData.eligibilityThreshold) < 0)) {
      alert('Eligibility threshold must be a positive number for Token Holder eligibility');
      return;
    }

    const params = {
      spaceId: spaceId,
      title: formData.title,
      bodyURI: formData.bodyURI,
      pType: formData.pType,
      choices: formData.choices,
      start: Math.floor(startTimestamp / 1000),
      end: Math.floor(endTimestamp / 1000),
      eligibilityType: formData.eligibilityType,
      eligibilityToken: formData.eligibilityToken,
      eligibilityThreshold: BigInt(formData.eligibilityThreshold),
    };

    writeContract({
      address: process.env.NEXT_PUBLIC_PRIVATE_PROPOSAL_FACTORY_ADDRESS,
      abi: privateProposalFactoryAbi.abi,
      functionName: 'createProposal',
      args: [params],
    });
  };

  // Reset form and close dialog on success
  React.useEffect(() => {
    if (txSuccess) {
      setFormData({
        title: '',
        bodyURI: '',
        pType: 0,
        choices: ['For', 'Against', 'Abstain'],
        start: '',
        end: '',
        eligibilityType: 0,
        eligibilityToken: process.env.NEXT_PUBLIC_MOCK_GOVERNANCE_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
        eligibilityThreshold: '1'
      });
      setOpen(false);
      alert('Proposal created successfully!');
    }
  }, [txSuccess]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="flex-1" style={{ backgroundColor: '#4D89B0', color: 'white' }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Proposal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-gradient-to-br from-[#E8DCC4] via-white to-white ">
        <DialogHeader>
          <DialogTitle className="text-black">Create New Proposal</DialogTitle>
          <DialogDescription className="text-black">
            Create a governance proposal for {spaceName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-black">Proposal Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter proposal title"
              required
              className="bg-white/50 border-[#E8DCC4]/30"
            />
          </div>

          <div>
            <Label htmlFor="bodyURI" className="text-black">Description/Content URI *</Label>
            <Textarea
              id="bodyURI"
              value={formData.bodyURI}
              onChange={(e) => handleInputChange('bodyURI', e.target.value)}
              placeholder="IPFS URI or detailed description..."
              rows={3}
              required
              className="bg-white/50 border-[#E8DCC4]/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start" className="text-black">Start Date</Label>
              <Input
                id="start"
                type="datetime-local"
                value={formData.start}
                onChange={(e) => handleInputChange('start', e.target.value)}
                className="bg-white/50 border-[#E8DCC4]/30"
              />
            </div>
            <div>
              <Label htmlFor="end" className="text-black">End Date *</Label>
              <Input
                id="end"
                type="datetime-local"
                value={formData.end}
                onChange={(e) => handleInputChange('end', e.target.value)}
                required
                className="bg-white/50 border-[#E8DCC4]/30"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="eligibilityType" className="text-black">Eligibility Type</Label>
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 w-full px-3 py-2 rounded-md transition-colors duration-200 font-medium text-sm border border-[#E8DCC4]/30 bg-white/50"
                style={{
                  color: colors.black,
                  backgroundColor: hoveredFilter === 'eligibility' ? colors.hoverBg : 'rgba(255, 255, 255, 0.5)'
                }}
                onClick={() => {
                  if (hoveredFilter === 'eligibility') {
                    setHoveredFilter(null);
                  } else {
                    setHoveredFilter('eligibility');
                  }
                }}
              >
                {eligibilityOptions.find(opt => opt.value === formData.eligibilityType)?.label || 'Select eligibility type'}
                <ChevronDown className="h-4 w-4 ml-auto" />
              </button>

              {/* Dropdown */}
              {hoveredFilter === 'eligibility' && (
                <div
                  className="absolute top-full left-0 mt-1 w-full rounded-md shadow-lg z-50 animate-in fade-in-0 zoom-in-95"
                  style={{ backgroundColor: colors.white, border: `1px solid ${colors.primary}20` }}
                >
                  <div className="py-1">
                    {eligibilityOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          handleInputChange('eligibilityType', option.value);
                          setHoveredFilter(null);
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors duration-150 w-full text-left"
                        style={{ color: colors.black }}
                      >
                        {option.label}
                        {formData.eligibilityType === option.value && (
                          <div className="w-2 h-2 rounded-full ml-auto" style={{ backgroundColor: colors.primary }}></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="pType" className="text-black">Proposal Type</Label>
            <div className="relative">
              <button
                type="button"
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-md transition-colors duration-200 font-medium text-sm border border-[#E8DCC4]/30 ${formData.eligibilityType === 0 ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'bg-white/50'}`}
                style={{
                  color: formData.eligibilityType === 0 ? '#9CA3AF' : colors.black,
                  backgroundColor: formData.eligibilityType === 0 ? '#F3F4F6' : (hoveredFilter === 'proposalType' ? colors.hoverBg : 'rgba(255, 255, 255, 0.5)')
                }}
                disabled={formData.eligibilityType === 0}
                onClick={() => {
                  if (formData.eligibilityType !== 0) {
                    if (hoveredFilter === 'proposalType') {
                      setHoveredFilter(null);
                    } else {
                      setHoveredFilter('proposalType');
                    }
                  }
                }}
              >
                {proposalTypeOptions.find(opt => opt.value === formData.pType)?.label || 'Select proposal type'}
                <ChevronDown className="h-4 w-4 ml-auto" />
              </button>

              {/* Dropdown */}
              {hoveredFilter === 'proposalType' && formData.eligibilityType !== 0 && (
                <div
                  className="absolute top-full left-0 mt-1 w-full rounded-md shadow-lg z-50 animate-in fade-in-0 zoom-in-95"
                  style={{ backgroundColor: colors.white, border: `1px solid ${colors.primary}20` }}
                >
                  <div className="py-1">
                    {proposalTypeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          handleInputChange('pType', option.value);
                          setHoveredFilter(null);
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors duration-150 w-full text-left"
                        style={{ color: colors.black }}
                      >
                        {option.label}
                        {formData.pType === option.value && (
                          <div className="w-2 h-2 rounded-full ml-auto" style={{ backgroundColor: colors.primary }}></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {formData.eligibilityType === 1 && (
            <>
              <div>
                <Label htmlFor="eligibilityToken" className="text-black">Eligibility Token Address</Label>
                <Input
                  id="eligibilityToken"
                  value={formData.eligibilityToken}
                  onChange={(e) => handleInputChange('eligibilityToken', e.target.value)}
                  placeholder="Token contract address"
                  className="bg-white/50 border-[#E8DCC4]/30"
                />
              </div>

              <div>
                <Label htmlFor="eligibilityThreshold" className="text-black">Eligibility Threshold</Label>
                <Input
                  id="eligibilityThreshold"
                  type="number"
                  value={formData.eligibilityThreshold}
                  onChange={(e) => handleInputChange('eligibilityThreshold', e.target.value)}
                  placeholder="Minimum token balance"
                  className="bg-white/50 border-[#E8DCC4]/30"
                />
              </div>
            </>
          )}

          {writeError && (
            <div className="text-sm text-red-600 p-2 bg-red-50 rounded border border-red-200">
              Error: {writeError.message}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isTxPending || isConfirming || !formData.title.trim() || !formData.bodyURI.trim() || !formData.end}
              className="flex-1 bg-[#4D89B0] hover:bg-[#4D89B0]/90 text-white"
            >
              {isTxPending || isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Proposal'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-[#4D89B0] text-black hover:bg-[#4D89B0] hover:text-white"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}