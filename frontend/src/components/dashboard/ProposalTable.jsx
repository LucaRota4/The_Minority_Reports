"use client";
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import {
  Search,
  Filter,
  ChevronDown,
  Eye,
  Calendar,
  Users,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react';

function getStatusBadge(status) {
  const variants = {
    active: 'default',
    closed: 'secondary'
  };

  const icons = {
    active: <Clock className="h-3 w-3" />,
    closed: <CheckCircle className="h-3 w-3" />
  };

  return (
    <Badge variant={variants[status] || 'outline'} className="flex items-center gap-1">
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function ProposalRow({ proposal, spaceName }) {
  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const getProposalStatus = (proposal) => {
    const now = Math.floor(Date.now() / 1000);
    if (proposal.p_start <= now && proposal.p_end > now) {
      return 'active';
    }
    return 'closed';
  };

  const status = getProposalStatus(proposal);

  return (
    <tr className="hover:bg-[#4D89B0]/5">
      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-black line-clamp-2 max-w-xs">
            {proposal.p_title}
          </div>
          <div className="text-sm text-[#4D89B0]/70">
            ID: {proposal.proposalId.slice(0, 10)}...{proposal.proposalId.slice(-6)}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge(status)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-[#4D89B0]/60" />
          {proposal.p_choices?.length || 0} choices
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-[#4D89B0]/60" />
          {formatDate(proposal.p_end)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-2">
          <Link href={`/app/${spaceName}/${proposal.proposalId}`}>
            <Button variant="ghost" size="sm" className="text-black hover:text-white border border-[#4D89B0] hover:bg-[#4D89B0]">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </td>
    </tr>
  );
}

export function ProposalTable({ proposals, loading, error, spaceName, title = "Proposals" }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('end');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [hoveredFilter, setHoveredFilter] = useState(null);
  const [hideTimeout, setHideTimeout] = useState(null);

  // Define colors for consistency
  const colors = {
    primary: '#4D89B0', // Zama blue
    white: '#ffffff',
    black: '#000000',
    hoverBg: 'rgba(77, 137, 176, 0.1)',
  };

  // Filter configuration
  const filterItems = [
    {
      name: 'Status',
      current: statusFilter,
      options: [
        { value: 'all', label: 'All Proposals' },
        { value: 'active', label: 'Active' },
        { value: 'closed', label: 'Closed' },
      ],
      onChange: setStatusFilter
    },
    {
      name: 'Sort',
      current: sortBy,
      options: [
        { value: 'end', label: 'End Date' },
        { value: 'title', label: 'Title' },
        { value: 'choices', label: 'Choices' },
      ],
      onChange: setSortBy
    },
    {
      name: 'Order',
      current: sortOrder,
      options: [
        { value: 'desc', label: 'Newest First' },
        { value: 'asc', label: 'Oldest First' },
      ],
      onChange: setSortOrder
    },
    {
      name: 'Display',
      current: pageSize.toString(),
      options: [
        { value: '10', label: '10 per page' },
        { value: '25', label: '25 per page' },
        { value: '50', label: '50 per page' },
      ],
      onChange: (value) => setPageSize(Number(value))
    }
  ];

  const handleMouseEnter = (filterName) => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }
    setHoveredFilter(filterName);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setHoveredFilter(null);
    }, 300); // 300ms delay before hiding
    setHideTimeout(timeout);
  };

  // Process proposals
  const processedProposals = useMemo(() => {
    if (!proposals) return [];

    return proposals.map(proposal => ({
      ...proposal,
      id: proposal.proposalId || proposal.id
    }));
  }, [proposals]);

  // Filter and sort proposals
  const filteredAndSortedProposals = useMemo(() => {
    let filtered = processedProposals.filter(proposal => {
      const matchesSearch = proposal.p_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          proposal.proposalId.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesFilter = true;
      if (statusFilter !== 'all') {
        const now = Math.floor(Date.now() / 1000);
        const isActive = proposal.p_start <= now && proposal.p_end > now;
        const proposalStatus = isActive ? 'active' : 'closed';
        matchesFilter = proposalStatus === statusFilter;
      }

      return matchesSearch && matchesFilter;
    });

    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'title':
          aValue = a.p_title.toLowerCase();
          bValue = b.p_title.toLowerCase();
          break;
        case 'end':
          aValue = Number(a.p_end);
          bValue = Number(b.p_end);
          break;
        case 'choices':
          aValue = a.p_choices?.length || 0;
          bValue = b.p_choices?.length || 0;
          break;
        default:
          aValue = Number(a.p_end);
          bValue = Number(b.p_end);
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [processedProposals, searchTerm, statusFilter, sortBy, sortOrder]);

  // Paginate proposals
  const paginatedProposals = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedProposals.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedProposals, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedProposals.length / pageSize);

  if (loading) {
    return (
      <Card className="bg-white/80 border-[#E8DCC4]/30">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4D89B0] mx-auto mb-4"></div>
            <p className="text-black">Loading proposals...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="bg-white/80 border-[#E8DCC4]/30">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-black">
          Error loading proposals: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="bg-white/80 border-[#E8DCC4]/30">
      <CardHeader>
        <CardTitle className="text-black">{title}</CardTitle>
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          <div className="relative flex-1 w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#4D89B0]/60 h-4 w-4" />
            <Input
              placeholder="Search proposals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto relative">
            {filterItems.map((filter) => (
              <div
                key={filter.name}
                className="relative"
                onMouseEnter={() => handleMouseEnter(filter.name)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors duration-200 font-medium text-sm"
                  style={{
                    color: colors.black,
                    backgroundColor: hoveredFilter === filter.name ? colors.hoverBg : 'transparent'
                  }}
                >
                  {filter.name}
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* Dropdown */}
                {hoveredFilter === filter.name && (
                  <div
                    className="absolute top-full left-0 mt-1 w-48 rounded-md shadow-lg z-50 animate-in fade-in-0 zoom-in-95"
                    style={{ backgroundColor: colors.white, border: `1px solid ${colors.primary}20` }}
                    onMouseEnter={() => handleMouseEnter(filter.name)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="py-1">
                      {filter.options.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            filter.onChange(option.value);
                            setHoveredFilter(null);
                          }}
                          className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#E8DCC4]/20 transition-colors duration-150 w-full text-left"
                          style={{ color: colors.black }}
                        >
                          {option.label}
                          {filter.current === option.value && (
                            <div className="w-2 h-2 rounded-full ml-auto" style={{ backgroundColor: colors.primary }}></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-[#E8DCC4]/30">
              <thead className="bg-[#E8DCC4]/10">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider min-w-0">
                    <div className="max-w-xs lg:max-w-none">Proposal</div>
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Choices
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-black uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#E8DCC4]/30">
                {paginatedProposals.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-black">
                      No proposals found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedProposals.map((proposal) => (
                    <ProposalRow
                      key={proposal.id}
                      proposal={proposal}
                      spaceName={spaceName}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 lg:px-6 py-3 bg-[#E8DCC4]/10 border-t border-[#E8DCC4]/30">
            <div className="text-sm text-black text-center sm:text-left">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAndSortedProposals.length)} of {filteredAndSortedProposals.length} proposals
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex-shrink-0 border-[#4D89B0] text-black hover:bg-[#4D89B0] hover:text-white"
              >
                Previous
              </Button>
              <span className="text-sm text-black whitespace-nowrap px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex-shrink-0 border-[#4D89B0] text-black hover:bg-[#4D89B0] hover:text-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}