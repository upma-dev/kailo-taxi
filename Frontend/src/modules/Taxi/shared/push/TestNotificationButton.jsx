import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { BellRing, Loader2 } from 'lucide-react';
import api from '../api/axiosInstance';
import { BACKEND_ORIGIN } from '../api/runtimeConfig';

const REGISTRATION_ERRORS = {
  'browser-unsupported': 'This browser does not support push notifications.',
  'firebase-web-config-missing': 'Firebase web config / VAPID key is missing in the frontend .env.',
  'missing-auth': 'Please login again, then retry.',
  'messaging-unsupported': 'Firebase messaging is not supported in this browser.',
  'permission-denied': 'Notifications are blocked. Allow them in the browser site settings.',
  'permission-not-granted': 'Notification permission was not granted.',
  'fcm-token-error': 'Could not get an FCM token. Check the VAPID key and Firebase project.',
  'missing-token': 'Firebase did not return a device token.',
};

const readErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Failed to send test notification';

const getAuthHeaders = (role) => {
  const normalized = String(role || '').toLowerCase();
  let token = null;
  if (normalized === 'driver' || normalized === 'owner') {
    token = localStorage.getItem('driverToken') || sessionStorage.getItem('driverToken') || localStorage.getItem('token');
  } else if (normalized === 'admin') {
    token = localStorage.getItem('admin_accessToken') || localStorage.getItem('adminToken');
  } else if (normalized === 'user') {
    token = localStorage.getItem('userToken') || localStorage.getItem('token');
  }
  if (!token) {
    token = localStorage.getItem('driverToken') || localStorage.getItem('token') || localStorage.getItem('userToken') || localStorage.getItem('admin_accessToken');
  }
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

/**
 * Registers this browser for push (asks permission if needed) and asks the backend
 * to send a test notification to the logged-in account.
 * role: 'user' | 'driver' | 'owner' | 'admin'
 */
const TestNotificationButton = ({ role, className = '', children }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async (event) => {
    event?.stopPropagation?.();
    if (loading) return;
    setLoading(true);

    try {
      const registration = await window.__registerBrowserFcmToken?.({ interactive: true, roles: [role] });
      if (!registration?.ok) {
        toast.error(REGISTRATION_ERRORS[registration?.reason] || 'Push registration failed.');
        return;
      }

      const response = await api.post(
        `${BACKEND_ORIGIN}/api/v1/fcm-tokens/test`,
        { platform: 'web' },
        getAuthHeaders(role)
      );
      const dataObj = response?.data || response || {};
      const successCount = Number(dataObj.successCount ?? dataObj.data?.successCount ?? 0);

      if (successCount > 0) {
        toast.success(`Test notification sent (${successCount} device${successCount > 1 ? 's' : ''}).`);
      } else {
        toast.error('Backend found no deliverable device token for this account.');
      }
    } catch (error) {
      toast.error(readErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={handleClick} disabled={loading} className={className}>
      {children || (
        <>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />}
          <span>{loading ? 'Sending...' : 'Send Test Notification'}</span>
        </>
      )}
    </button>
  );
};

export default TestNotificationButton;
