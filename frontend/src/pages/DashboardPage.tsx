import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, EmailItem } from '../types';
import { Header } from '../components/Header';
import { ComposeModal } from '../components/ComposeModal';
import { ScheduledTable } from '../components/ScheduledTable';
import { SentTable } from '../components/SentTable';
import { emailService, authService } from '../services/api';
import { Plus, Clock, CheckCircle2, Search, Zap, ExternalLink } from 'lucide-react';

interface DashboardPageProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  onLogout,
  onUserUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Scheduled Emails with 3s refetch interval for live queue updates
  const {
    data: scheduledEmails = [],
    isLoading: isScheduledLoading,
    isError: isScheduledError,
    refetch: refetchScheduled,
  } = useQuery({
    queryKey: ['scheduledEmails'],
    queryFn: emailService.getScheduled,
    refetchInterval: 3000,
  });

  // 2. Fetch Sent Emails with 3s refetch interval
  const {
    data: sentEmails = [],
    isLoading: isSentLoading,
    isError: isSentError,
    refetch: refetchSent,
  } = useQuery({
    queryKey: ['sentEmails'],
    queryFn: emailService.getSent,
    refetchInterval: 3000,
  });

  // 3. Search query results via Elasticsearch
  const {
    data: searchResults,
    isLoading: isSearchLoading,
    isError: isSearchError,
  } = useQuery({
    queryKey: ['searchEmails', searchQuery],
    queryFn: () => emailService.search(searchQuery),
    enabled: searchQuery.trim().length > 0,
  });


  const handleCampaignCreated = () => {
    refetchScheduled();
    refetchSent();
  };

  // Handle Slack OAuth redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slackStatus = params.get('slack');
    const slackError = params.get('slack_error');

    if (slackStatus === 'connected') {
      alert('✅ Slack connected successfully! You will now receive rate-limit notifications in Slack.');
      onUserUpdate();
    } else if (slackError === 'no_client_id') {
      alert('⚠️ Slack is not configured.\n\nYou need to:\n1. Create a Slack App at https://api.slack.com/apps\n2. Copy your Client ID and Client Secret\n3. Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in backend/.env\n4. Restart the backend\n\nSee the setup guide for exact steps.');
    } else if (slackError) {
      alert(`❌ Slack connection failed: ${slackError}\n\nCheck the backend logs for details.`);
    }

    // Clean URL params
    if (slackStatus || slackError) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col text-gray-100">
      {/* Top Header */}
      <Header
        user={user}
        onLogout={onLogout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSlackStatusChange={onUserUpdate}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        {/* Banner Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              Email Outbound Pipeline
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Manage scheduled delay queues, rate limits, and Ethereal SMTP delivery logs
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:5000/admin/queues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 rounded-xl text-xs font-semibold transition-colors"
            >
              <span>Bull Board</span>
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            </a>

            <button
              onClick={() => setIsComposeOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Compose New Email</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation or Search Mode */}
        {searchQuery.trim().length > 0 ? (
          /* Search Results Mode */
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-blue-950/40 border border-blue-800/60 p-4 rounded-xl text-xs text-blue-300">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400" />
                <span>
                  Showing Elasticsearch search results for: <strong className="text-white">"{searchQuery}"</strong>
                </span>
                {searchResults?.source && (
                  <span className="ml-2 px-2 py-0.5 rounded bg-blue-900/80 text-[10px] font-mono text-blue-200">
                    Source: {searchResults.source}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-gray-400 hover:text-white underline"
              >
                Exit Search Mode
              </button>
            </div>

            {/* Render Search Results Table */}
            <div className="w-full glass-panel rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900/80 text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-3">Recipient Email</th>
                    <th className="px-6 py-3">Subject</th>
                    <th className="px-6 py-3">Body Preview</th>
                    <th className="px-6 py-3">Scheduled / Sent Time</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-gray-200">
                  {isSearchLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        Searching Elasticsearch index...
                      </td>
                    </tr>
                  ) : !searchResults?.data || searchResults.data.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        No matching emails found for "{searchQuery}"
                      </td>
                    </tr>
                  ) : (
                    searchResults.data.map((email: EmailItem) => (
                      <tr key={email.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">{email.recipient}</td>
                        <td className="px-6 py-4 max-w-xs truncate text-gray-300">{email.subject}</td>
                        <td className="px-6 py-4 max-w-sm truncate text-gray-400">{email.body}</td>
                        <td className="px-6 py-4 text-gray-400">
                          {new Date(email.scheduledAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                              email.status === 'sent'
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                : email.status === 'failed'
                                ? 'bg-red-950/60 text-red-400 border-red-800/60'
                                : 'bg-blue-950/60 text-blue-400 border-blue-800/60'
                            }`}
                          >
                            {email.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Normal Tabbed View Mode */
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'scheduled'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Scheduled Emails ({scheduledEmails.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('sent')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'sent'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Sent & Failed Logs ({sentEmails.length})</span>
              </button>
            </div>

            {/* Active Table Display */}
            {activeTab === 'scheduled' ? (
              <ScheduledTable
                emails={scheduledEmails}
                isLoading={isScheduledLoading}
                isError={isScheduledError}
                onRefresh={refetchScheduled}
              />
            ) : (
              <SentTable
                emails={sentEmails}
                isLoading={isSentLoading}
                isError={isSentError}
                onRefresh={refetchSent}
              />
            )}
          </div>
        )}

        {/* Compose Modal Component */}
        <ComposeModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          onSuccess={handleCampaignCreated}
        />
      </main>
    </div>
  );
};
