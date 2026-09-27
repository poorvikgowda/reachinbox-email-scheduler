import React, { useState, useEffect } from 'react';
import { X, Upload, Send, AlertCircle, CheckCircle2, Users, Clock, ShieldAlert } from 'lucide-react';
import Papa from 'papaparse';
import { emailService } from '../services/api';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [manualEmailInput, setManualEmailInput] = useState('');
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 2); // default 2 mins in future (local time)
    const tzOffsetMs = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  });
  const [delayBetweenEmails, setDelayBetweenEmails] = useState<number>(2000);
  const [hourlyLimit, setHourlyLimit] = useState<number>(200);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const d = new Date();
      d.setMinutes(d.getMinutes() + 2);
      const tzOffsetMs = d.getTimezoneOffset() * 60000;
      setStartTime(new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const foundEmails: string[] = [];
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

        results.data.forEach((row: any) => {
          const rowStr = JSON.stringify(row);
          const matches = rowStr.match(emailRegex);
          if (matches) {
            matches.forEach((email) => {
              if (!foundEmails.includes(email.toLowerCase())) {
                foundEmails.push(email.toLowerCase());
              }
            });
          }
        });

        setRecipients(foundEmails);
        setErrorMsg(null);
      },
      error: (err) => {
        setErrorMsg(`Failed to parse CSV file: ${err.message}`);
      },
    });
  };

  const handleAddManualEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmed = manualEmailInput.trim().toLowerCase();
    if (trimmed && emailRegex.test(trimmed) && !recipients.includes(trimmed)) {
      setRecipients([...recipients, trimmed]);
      setManualEmailInput('');
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!subject.trim()) {
      setErrorMsg('Please enter an email subject');
      return;
    }

    if (!body.trim()) {
      setErrorMsg('Please enter an email body');
      return;
    }

    if (recipients.length === 0) {
      setErrorMsg('Please upload a CSV or add at least one recipient email address');
      return;
    }

    try {
      setIsLoading(true);

      const targetIsoDate = new Date(startTime).toISOString();

      await emailService.schedule({
        subject,
        body,
        recipients,
        startTime: targetIsoDate,
        delayBetweenEmails,
        hourlyLimit,
      });

      setSuccessMsg(`Successfully scheduled ${recipients.length} email(s)!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to schedule emails');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl glass-modal rounded-2xl p-6 sm:p-8 shadow-2xl border border-gray-700/80 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-500" />
              Compose New Email Campaign
            </h2>
            <p className="text-xs text-gray-400">
              Schedule emails using BullMQ delayed jobs with Redis rate limiting
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleScheduleSubmit} className="mt-6 space-y-5">
          {/* Status Banners */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Subject Line *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Accelerate your cold outreach with ReachInbox"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* CSV File Upload & Recipients */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Recipients CSV Upload / Lead List *
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <label className="flex-1 w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-700 hover:border-blue-500 bg-gray-900/60 hover:bg-gray-900 rounded-xl p-4 cursor-pointer transition-all">
                <Upload className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-medium text-gray-300">
                  {recipients.length > 0 ? 'Upload another CSV file' : 'Click to Upload CSV Lead File'}
                </span>
                <input
                  type="file"
                  accept=".csv, .txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Manual Email Input */}
              <div className="w-full sm:w-auto flex items-center gap-2">
                <input
                  type="email"
                  placeholder="Or enter email address..."
                  value={manualEmailInput}
                  onChange={(e) => setManualEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddManualEmail())}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddManualEmail}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 font-medium rounded-xl transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Recipient Count Indicator */}
            {recipients.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-blue-400 bg-blue-950/40 border border-blue-900/60 rounded-lg px-3 py-1.5 w-fit">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="font-semibold">{recipients.length} email addresses detected</span>
              </div>
            )}
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Email Body *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Write your email content here (HTML supported)..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Scheduling Configuration Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" /> Start Time
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-200 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" /> Min Delay (ms)
              </label>
              <input
                type="number"
                min={0}
                value={delayBetweenEmails}
                onChange={(e) => setDelayBetweenEmails(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-200 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Hourly Limit
              </label>
              <input
                type="number"
                min={1}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-200 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Scheduling Jobs...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Schedule Email Campaign</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
