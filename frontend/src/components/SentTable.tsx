import React from 'react';
import { EmailItem } from '../types';
import { CheckCircle2, XCircle, RefreshCw, AlertCircle, Send } from 'lucide-react';

interface SentTableProps {
  emails: EmailItem[];
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
}

export const SentTable: React.FC<SentTableProps> = ({
  emails,
  isLoading,
  isError,
  onRefresh,
}) => {
  return (
    <div className="w-full glass-panel rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Sent & Failed Delivery Logs ({emails.length})
          </h3>
          <p className="text-xs text-gray-400">Completed Ethereal SMTP delivery logs</p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-900/80 text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-800">
            <tr>
              <th className="px-6 py-3">Recipient Email</th>
              <th className="px-6 py-3">Subject</th>
              <th className="px-6 py-3">Sent / Attempt Time</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Message ID / Error Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 text-gray-200">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-48" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-64" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-36" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-20" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-36" /></td>
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-red-400">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <span>Failed to fetch sent email logs from backend</span>
                  </div>
                </td>
              </tr>
            ) : emails.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Send className="w-8 h-8 text-gray-600" />
                    <span className="text-sm font-medium">No sent emails recorded yet</span>
                    <span className="text-xs text-gray-600">Delivered emails will appear here automatically.</span>
                  </div>
                </td>
              </tr>
            ) : (
              emails.map((email) => (
                <tr key={email.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{email.recipient}</td>
                  <td className="px-6 py-4 max-w-xs truncate text-gray-300">{email.subject}</td>
                  <td className="px-6 py-4 text-gray-400">
                    {email.sentAt
                      ? new Date(email.sentAt).toLocaleString()
                      : new Date(email.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {email.status === 'sent' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-950/60 text-red-400 border border-red-800/60">
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-[11px] text-gray-400 max-w-xs truncate">
                    {email.status === 'sent'
                      ? email.messageId || 'Delivered (Ethereal)'
                      : email.errorMessage || 'Failed to deliver'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
