import React from 'react';
import { Mail, Zap, Shield, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/auth/google';
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#0b0f19] p-4">
      {/* Dynamic Ambient Glow Backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full max-w-md glass-panel rounded-3xl p-8 sm:p-10 border border-gray-800 shadow-2xl text-center z-10">
        {/* Brand Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-blue-500/30 mb-6">
          <Mail className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-blue-400 bg-clip-text text-transparent mb-2">
          ReachInbox
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          Full-Stack Email Job Scheduler & Rate Limiting Platform
        </p>

        {/* Feature Highlights */}
        <div className="space-y-3 text-left mb-8 text-xs text-gray-300 bg-gray-900/60 border border-gray-800 p-4 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>BullMQ Delayed Queue & Persistent Scheduling</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Redis Atomic Rate Limiting & Restart Resilience</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Elasticsearch Fast Search & Ethereal SMTP</span>
          </div>
        </div>

        {/* Real Google OAuth Login Button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all group"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
          <ArrowRight className="w-4 h-4 text-gray-500 group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="mt-6 text-[11px] text-gray-500">
          ReachInbox Hiring Assignment • TypeScript, Node, Express, BullMQ, Postgres, Redis, Elasticsearch
        </p>
      </div>
    </div>
  );
};
