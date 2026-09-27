import React from 'react';
import { User } from '../types';
import { LogOut, Mail, Search, ExternalLink, Slack, CheckCircle2, XCircle } from 'lucide-react';
import { authService, slackService } from '../services/api';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSlackStatusChange: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  searchQuery,
  setSearchQuery,
  onSlackStatusChange,
}) => {
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);

  const handleSlackConnect = () => {
    // Redirect to backend Slack OAuth — the backend will pick up the JWT cookie
    // and embed it into the OAuth state parameter to tie the callback to this user.
    window.location.href = 'http://localhost:5000/auth/slack';
  };

  const handleSlackDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      await slackService.disconnect();
      onSlackStatusChange();
    } catch (err) {
      console.error('Failed to disconnect Slack', err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-gray-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Brand & Bull Board Link */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white via-gray-200 to-blue-400 bg-clip-text text-transparent">
              ReachInbox
            </h1>
            <p className="text-xs text-gray-400">Full-Stack Email Job Scheduler</p>
          </div>
        </div>

        <a
          href="http://localhost:5000/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-950/60 border border-blue-800/60 rounded-lg hover:bg-blue-900/60 transition-colors"
        >
          <span>Bull Board Dashboard</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Search Input Bar */}
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search emails by recipient, subject, body via Elasticsearch..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-900/80 border border-gray-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Right side: Slack Connect & User Profile */}
      <div className="flex items-center gap-4">
        {/* Slack Connection Button */}
        {user.slackConnected ? (
          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Slack Connected</span>
            <button
              onClick={handleSlackDisconnect}
              disabled={isDisconnecting}
              className="ml-1 text-xs text-gray-400 hover:text-red-400 underline transition-colors"
              title="Disconnect Slack"
            >
              {isDisconnecting ? '...' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleSlackConnect}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
          >
            <Slack className="w-4 h-4 text-amber-400" />
            <span>Connect Slack</span>
          </button>
        )}

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-2 border-l border-gray-800">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-9 h-9 rounded-full border border-blue-500/30 object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-gray-200 leading-none">{user.name}</p>
            <p className="text-xs text-gray-400 truncate max-w-[150px]">{user.email}</p>
          </div>

          <button
            onClick={onLogout}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
