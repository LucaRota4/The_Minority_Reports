"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import {
  Users,
  Vote,
  Clock,
  TrendingUp,
  AlertCircle,
  Calendar,
  BarChart3,
  MessageSquare,
  ArrowRight,
  Settings,
  Plus,
  Edit,
  ArrowRightLeft,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCategorizedSpaces, useUserVotes, useProposalsBySpaces, useUserActivity } from '@/hooks/useSubgraph';

export function UserDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const { address } = useAccount();
  const router = useRouter();

  const { categorizedSpaces, loading: spacesLoading } = useCategorizedSpaces(address);
  const allSpaces = React.useMemo(() => {
    if (!categorizedSpaces) return [];
    return [
      ...categorizedSpaces.owned,
      ...categorizedSpaces.admin,
      ...categorizedSpaces.member
    ];
  }, [categorizedSpaces]);
  const spaceIds = allSpaces?.map(space => space.spaceId) || [];
  
  // Limit proposals query to recent/active ones only
  const { data: proposalsData, isLoading: proposalsLoading } = useProposalsBySpaces(
    spaceIds.slice(0, 10), // Limit to first 10 spaces for performance
    !!address && spaceIds.length > 0
  );
  
  // Limit votes to recent ones
  const { data: votesData, isLoading: votesLoading } = useUserVotes(address);

  // Get comprehensive user activity
  const { data: activityData, isLoading: activityLoading } = useUserActivity(address);

  // Compute user stats (show available data)
  const userStats = {
    joinedSpaces: allSpaces?.length || 0,
    activeProposals: proposalsLoading ? '...' : (proposalsData?.proposalCreateds?.filter(p => {
      const now = Math.floor(Date.now() / 1000);
      return p.p_start <= now && p.p_end > now;
    }).length || 0),
    spacesCreated: categorizedSpaces?.owned?.length || 0
  };

  // Joined spaces
  const joinedSpaces = allSpaces?.slice(0, 5).map(space => {
    // Prioritize ENS name with .agora for navigation
    const spaceName = space.ensName ? 
      (space.ensName.endsWith('.agora') ? space.ensName : `${space.ensName}.agora`) : 
      (space.displayName || `Space ${space.spaceId.slice(0, 8)}`);
    
    return {
      id: space.spaceId,
      name: spaceName,
      displayName: space.displayName || space.ensName || `Space ${space.spaceId.slice(0, 8)}`,
      role: space.role === 'owner' ? 'Owner' : space.role === 'admin' ? 'Admin' : 'Member',
      activeProposals: proposalsLoading ? '...' : (proposalsData?.proposalCreateds?.filter(p => 
        p.spaceId === space.spaceId && 
        p.p_start <= Math.floor(Date.now() / 1000) && 
        p.p_end > Math.floor(Date.now() / 1000)
      ).length || 0),
      lastActivity: 'Recent'
    };
  }) || [];

  // Active proposals
  const activeProposals = proposalsLoading ? [] : (proposalsData?.proposalCreateds?.filter(p => {
    const now = Math.floor(Date.now() / 1000);
    return p.p_start <= now && p.p_end > now;
  }).slice(0, 10).map(p => {  // Limit to 10 active proposals
    const space = allSpaces?.find(s => s.spaceId === p.spaceId);
    return {
      id: p.proposalId,
      spaceName: space?.displayName || space?.ensName || `Space ${p.spaceId.slice(0, 8)}`,
      title: p.p_title,
      status: 'active',
      timeLeft: `${Math.ceil((p.p_end - Math.floor(Date.now() / 1000)) / 86400)} days`,
      userVote: null,
      totalVotes: 0
    };
  }) || []);

  // Recent activity from comprehensive activity data and votes
  const recentActivity = activityLoading || votesLoading ? [] : (() => {
    const activities = [];
    
    // Add activities from the combined query
    activityData?.activities?.forEach(activity => {
      // Find space name for this activity
      let spaceName = "Unknown Space";
      let space = null;
      
      if (activity.data.spaceId) {
        space = allSpaces?.find(s => s.spaceId === activity.data.spaceId);
        spaceName = space?.displayName || space?.ensName || `Space ${activity.data.spaceId.slice(0, 8)}`;
      } else if (activity.type === 'vote') {
        // For votes without spaceId, show a generic message
        spaceName = "Governance Activity";
      }
      
      let description = "";
      
      switch (activity.type) {
        case 'vote':
          description = `Participated in governance voting`;
          break;
        case 'join':
          description = `Joined space`;
          break;
        case 'admin':
          description = `Became admin of space`;
          break;
        case 'space_created':
          description = `Created space`;
          break;
        case 'display_name_updated':
          description = `Updated space display name to "${activity.data.newDisplayName}"`;
          break;
        case 'space_transferred':
          description = `Transferred space ownership`;
          break;
        case 'space_deactivated':
          description = `Deactivated space`;
          break;
        default:
          description = `${activity.type.replace('_', ' ')} activity`;
      }
      
      activities.push({
        id: activity.id,
        type: activity.type,
        spaceName,
        description,
        time: new Date(activity.timestamp * 1000).toLocaleString(),
        spaceId: activity.data.spaceId
      });
    });
    
    // Add any additional votes that might not be in the combined query
    votesData?.votes?.forEach(vote => {
      // Check if this vote is already in activities
      const exists = activities.some(a => a.id === vote.id);
      if (!exists) {
        activities.push({
          id: vote.id,
          type: 'vote',
          spaceName: "Governance Activity",
          description: `Participated in governance voting`,
          time: new Date(vote.blockTimestamp * 1000).toLocaleString()
        });
      }
    });
    
    // Sort by time descending
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    return activities.slice(0, 10);
  })();

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'proposals', label: 'Active Report' },
    { id: 'activity', label: 'Recent Activity' }
  ];

  if (spacesLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-6"
      >
        <div className="bg-white/80 rounded-lg border border-[#E8DCC4]/30 p-6">
          <p className="text-white">Loading your governance activity...</p>
        </div>
      </motion.div>
    );
  }

  // Show partial data even if proposals/votes are still loading
  const showPartialData = !spacesLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-slate-900/50 rounded-lg border border-cyan-500/30 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Users className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{userStats.joinedSpaces}</p>
              <p className="text-sm text-slate-300">Joined Report</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-slate-900/50 rounded-lg border border-cyan-500/30 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Vote className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{userStats.activeProposals}</p>
              <p className="text-sm text-slate-300">Active Report</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-slate-900/50 rounded-lg border border-cyan-500/30 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{userStats.spacesCreated}</p>
              <p className="text-sm text-slate-300">Report Created</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-lg w-fit border border-cyan-500/20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-cyan-500/20 shadow-sm text-cyan-300 border border-cyan-500/50'
                : 'text-slate-300 hover:text-cyan-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Spaces */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-slate-900/50 rounded-lg border border-cyan-500/30 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">My Report</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-cyan-400 hover:text-white border border-cyan-500/50 hover:bg-cyan-500/20"
                onClick={() => router.push('/app/reports/my')}
              >
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {joinedSpaces.map((space) => (
                <div key={space.id} className="flex items-center justify-between p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                  <div>
                    <p className="font-medium text-white">{space.displayName}</p>
                    <p className="text-sm text-slate-400">{space.role} • {space.activeProposals} active proposals</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300"
                    onClick={() => router.push(`/app/${encodeURIComponent(space.name)}`)}
                  >
                    Enter
                  </Button>
                </div>
              ))}
              {proposalsLoading && joinedSpaces.length > 0 && (
                <div className="text-center py-2 text-slate-300 text-sm">
                  Loading proposal counts...
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-slate-900/50 rounded-lg border border-cyan-500/30 p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.slice(0, 5).map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-start gap-4 group"
                >
                  <div className="flex flex-col items-center">
                    <div className="p-2 rounded-full bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors duration-200">
                      {activity.type === 'vote' && <Vote className="h-3 w-3 text-cyan-400" />}
                      {activity.type === 'join' && <Users className="h-3 w-3 text-cyan-400" />}
                      {activity.type === 'admin' && <Settings className="h-3 w-3 text-cyan-400" />}
                      {activity.type === 'space_created' && <Plus className="h-3 w-3 text-cyan-400" />}
                      {activity.type === 'display_name_updated' && <Edit className="h-3 w-3 text-cyan-400" />}
                      {activity.type === 'space_transferred' && <ArrowRightLeft className="h-3 w-3 text-cyan-400" />}
                      {activity.type === 'space_deactivated' && <X className="h-3 w-3 text-cyan-400" />}
                    </div>
                    {index < recentActivity.slice(0, 5).length - 1 && (
                      <div className="w-px h-6 bg-gradient-to-b from-cyan-500/30 to-transparent mt-2"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="text-sm text-white font-medium leading-relaxed">{activity.description}</p>
                    <p className="text-xs text-slate-400 mt-1">{activity.spaceName} • {activity.time}</p>
                  </div>
                </motion.div>
              ))}
              {votesLoading && (
                <div className="text-center py-4 text-slate-300 text-sm">
                  Loading recent activity...
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {activeTab === 'proposals' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          {activeProposals.map((proposal, index) => (
            <motion.div
              key={proposal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-slate-900/50 rounded-lg border border-cyan-500/30 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-sm text-slate-400 mb-1">{proposal.spaceName}</p>
                  <h3 className="text-lg font-semibold text-white">{proposal.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-400/60" />
                  <span className="text-sm text-slate-300">{proposal.timeLeft} left</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Vote className="h-4 w-4 text-cyan-400/60" />
                    <span className="text-sm text-slate-300">{proposal.totalVotes} votes</span>
                  </div>
                  {proposal.userVote && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm text-cyan-400">Voted {proposal.userVote}</span>
                    </div>
                  )}
                </div>

                {proposal.userVote ? (
                  <Button size="sm" variant="outline" disabled>
                    Vote Submitted
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    className="bg-[#4D89B0] hover:bg-[#4D89B0]/90 text-white cursor-pointer"
                    onClick={() => router.push(`/app/${encodeURIComponent(proposal.spaceName)}/${proposal.id}`)}
                  >
                    Cast Vote
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
          {proposalsLoading && activeProposals.length === 0 && (
            <div className="text-center py-8 text-black">
              Loading active report...
            </div>
          )}
          {proposalsLoading && activeProposals.length > 0 && (
            <div className="text-center py-4 text-black text-sm">
              Loading more proposals...
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'activity' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-slate-900/50 rounded-lg border border-cyan-500/30 p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-6">Activity Timeline</h2>
          <div className="space-y-6">
            {recentActivity.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="flex items-start gap-4 group"
              >
                <div className="flex flex-col items-center">
                  <div className="p-3 rounded-full bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-all duration-300 group-hover:scale-110">
                    {activity.type === 'vote' && <Vote className="h-4 w-4 text-cyan-400" />}
                    {activity.type === 'join' && <Users className="h-4 w-4 text-cyan-400" />}
                    {activity.type === 'admin' && <Settings className="h-4 w-4 text-cyan-400" />}
                    {activity.type === 'space_created' && <Plus className="h-4 w-4 text-cyan-400" />}
                    {activity.type === 'display_name_updated' && <Edit className="h-4 w-4 text-cyan-400" />}
                    {activity.type === 'space_transferred' && <ArrowRightLeft className="h-4 w-4 text-cyan-400" />}
                    {activity.type === 'space_deactivated' && <X className="h-4 w-4 text-cyan-400" />}
                  </div>
                  {index < recentActivity.length - 1 && (
                    <div className="w-px h-10 bg-gradient-to-b from-cyan-500/40 via-cyan-500/20 to-transparent mt-3 group-hover:from-cyan-500/60 transition-colors duration-300"></div>
                  )}
                </div>
                <div className="flex-1 pb-8 group-hover:translate-x-1 transition-transform duration-300">
                  <p className="text-white font-medium leading-relaxed group-hover:text-cyan-300 transition-colors duration-300">{activity.description}</p>
                  <p className="text-sm text-slate-400 mt-2 group-hover:text-slate-300 transition-colors duration-300">
                    {activity.spaceName} • {activity.time}
                  </p>
                </div>
              </motion.div>
            ))}
            {activityLoading && recentActivity.length === 0 && (
              <div className="text-center py-8 text-slate-300">
                Loading activity timeline...
              </div>
            )}
            {activityLoading && recentActivity.length > 0 && (
              <div className="text-center py-4 text-slate-300 text-sm">
                Loading more activity...
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}