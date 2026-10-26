import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  TaxiAppSkeleton,
  AdminAppSkeleton,
  AuthAppSkeleton,
} from './ModuleSkeletons';

export function getSkeletonForPath(pathStr = '') {
  const p = String(pathStr || '').toLowerCase();

  if (p.includes('/admin')) {
    return <AdminAppSkeleton />;
  }
  if (p.includes('/login') || p.includes('/auth')) {
    return <AuthAppSkeleton />;
  }

  return <TaxiAppSkeleton />;
}

export default function SmartRouteSkeleton() {
  let currentPath = '';

  if (typeof window !== 'undefined') {
    const hash = window.location.hash || '';
    const pathname = window.location.pathname || '';
    currentPath = hash ? hash.replace(/^#/, '') : pathname;
  }

  try {
    const location = useLocation();
    if (location && location.pathname) {
      currentPath = location.pathname;
    }
  } catch (_) {
    // If rendered outside Router context, use window location
  }

  return getSkeletonForPath(currentPath);
}
