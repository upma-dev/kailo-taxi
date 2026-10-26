import React from 'react';

// Lightweight white-shadow skeleton base element
export function SkeletonPulse({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-gray-200/80 dark:bg-slate-800/80 rounded-xl ${className}`}
    />
  );
}

/**
 * 🚖 Taxi App Skeleton
 * Clean light white-shadow layout matching Taxi app
 */
export function TaxiAppSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#1A1A1A] flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto select-none space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonPulse className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <SkeletonPulse className="w-24 h-4" />
            <SkeletonPulse className="w-16 h-3" />
          </div>
        </div>
        <SkeletonPulse className="w-10 h-10 rounded-full" />
      </div>

      {/* Hero Destination Card */}
      <div className="bg-white dark:bg-[#222222] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] space-y-4 my-auto">
        <div className="flex items-center justify-between mb-1">
          <SkeletonPulse className="w-32 h-5" />
          <SkeletonPulse className="w-16 h-4 rounded-full" />
        </div>
        <SkeletonPulse className="w-full h-14 rounded-2xl" />
        <SkeletonPulse className="w-full h-14 rounded-2xl" />
        <div className="grid grid-cols-4 gap-2 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonPulse key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
        <SkeletonPulse className="w-full h-14 rounded-full mt-2" />
      </div>

      {/* Bottom Nav */}
      <div className="flex items-center justify-around bg-white dark:bg-[#222222] border border-gray-100 dark:border-gray-800 p-3 rounded-3xl shadow-sm">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonPulse key={i} className="w-10 h-10 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * 👑 Admin App Skeleton
 * Clean white-shadow card & table skeleton for Admin Dashboard
 */
export function AdminAppSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#1A1A1A] p-4 md:p-6 space-y-6 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
        <div className="space-y-2">
          <SkeletonPulse className="w-48 h-6" />
          <SkeletonPulse className="w-32 h-3" />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonPulse className="w-40 h-10 rounded-xl" />
          <SkeletonPulse className="w-10 h-10 rounded-full" />
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#222222] border border-gray-100 dark:border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <SkeletonPulse className="w-24 h-4" />
              <SkeletonPulse className="w-8 h-8 rounded-xl" />
            </div>
            <SkeletonPulse className="w-32 h-7" />
            <SkeletonPulse className="w-20 h-3" />
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-[#222222] border border-gray-100 dark:border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden space-y-3 p-4">
        <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800">
          <SkeletonPulse className="w-36 h-5" />
          <SkeletonPulse className="w-28 h-8 rounded-xl" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-2.5 border-b border-gray-50 dark:border-gray-800/50">
            <SkeletonPulse className="w-1/4 h-4" />
            <SkeletonPulse className="w-1/5 h-4" />
            <SkeletonPulse className="w-1/6 h-4" />
            <SkeletonPulse className="w-16 h-6 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 🔐 Auth App Skeleton
 * Clean white-shadow card container matching user login page
 */
export function AuthAppSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#1A1A1A] flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-white dark:bg-[#222222] border border-gray-100 dark:border-gray-800 p-8 rounded-[32px] space-y-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <div className="text-center space-y-3">
          <SkeletonPulse className="w-20 h-20 rounded-full mx-auto" />
          <SkeletonPulse className="w-44 h-6 mx-auto" />
          <SkeletonPulse className="w-60 h-4 mx-auto" />
        </div>
        <div className="space-y-4 pt-2">
          <SkeletonPulse className="w-full h-14 rounded-full" />
          <SkeletonPulse className="w-full h-14 rounded-full" />
          <SkeletonPulse className="w-full h-14 rounded-full mt-4" />
        </div>
      </div>
    </div>
  );
}
