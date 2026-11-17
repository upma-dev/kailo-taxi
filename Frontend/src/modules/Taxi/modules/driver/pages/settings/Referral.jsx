import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Copy, Gift, Loader2, Share2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurrentDriver, getMyDriverReferrals } from '../../services/registrationService';
import MyReferralsList, { describeReferralProgram, unwrapMyReferrals } from '../../../shared/components/MyReferralsList';

const AUDIENCE = 'driver friend';
import {
  getReferralSettingsContent,
  getReferralTranslationContent,
} from '../../../shared/services/referralTranslationService';
import {
  applyReferralSettingPlaceholders,
  buildReferralPreviewBlocks,
  DRIVER_REFERRAL_TRANSLATION_FIELDS,
  getStoredReferralLanguageCode,
} from '../../../shared/utils/referralTranslationFields';
import { useSettings } from '../../../../shared/context/SettingsContext';

const readStoredDriverInfo = () => {
  try {
    return JSON.parse(localStorage.getItem('driverInfo') || '{}');
  } catch {
    return {};
  }
};

const LEGACY_BRAND_REGEX = /\bzyder\b/gi;

const replaceLegacyReferralBrand = (value, appName) => {
  const safeAppName = String(appName || '').trim() || 'App';
  return String(value || '').replace(LEGACY_BRAND_REGEX, safeAppName);
};

const DriverReferral = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const routePrefix = location.pathname.startsWith('/taxi/owner') ? '/taxi/owner' : '/taxi/driver';
  const [activeTab, setActiveTab] = useState('refer');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myReferrals, setMyReferrals] = useState(null);
  const [driverProfile, setDriverProfile] = useState(() => {
    const stored = readStoredDriverInfo();
    return {
      referralCode: stored.referralCode || '',
    };
  });
  const [translation, setTranslation] = useState({
    language_code: 'en',
    driver_referral: {
      instant_referrer_user: '',
      instant_referrer_user_and_new_user: '',
      conditional_referrer_user_ride_count: '',
      conditional_referrer_user_earnings: '',
      dual_conditional_referrer_user_and_new_user_ride_count: '',
      dual_conditional_referrer_user_and_new_user_earnings: '',
      banner_text: '',
    },
  });

  useEffect(() => {
    const loadDriverReferral = async () => {
      setLoading(true);
      const languageCode = getStoredReferralLanguageCode('driver');
      const stored = readStoredDriverInfo();
      const fallbackDriverSection = {
        instant_referrer_user: '',
        instant_referrer_user_and_new_user: '',
        conditional_referrer_user_ride_count: '',
        conditional_referrer_user_earnings: '',
        dual_conditional_referrer_user_and_new_user_ride_count: '',
        dual_conditional_referrer_user_and_new_user_earnings: '',
        banner_text: '',
      };

      // The live list and count (drivers who really joined with my code).
      getMyDriverReferrals()
        .then((response) => setMyReferrals(unwrapMyReferrals(response)))
        .catch(() => setMyReferrals(null));

      try {
        const [driverResponse, translationResponse, settingsResponse] = await Promise.all([
          getCurrentDriver(),
          getReferralTranslationContent(languageCode),
          getReferralSettingsContent('driver'),
        ]);

        const driver = driverResponse?.data || {};
        const translationData = translationResponse?.data || {};
        const settingsData = settingsResponse?.data || {};
        const hydratedDriverReferral = applyReferralSettingPlaceholders(
          translationData.driver_referral || fallbackDriverSection,
          settingsData,
        );

        setDriverProfile({
          referralCode: driver.referralCode || stored.referralCode || '',
        });
        setTranslation({
          language_code: translationData.language_code || languageCode,
          driver_referral: hydratedDriverReferral,
        });

        localStorage.setItem(
          'driverInfo',
          JSON.stringify({
            ...stored,
            referralCode: driver.referralCode || '',
          }),
        );
      } catch {
        try {
          const [translationResponse, settingsResponse] = await Promise.all([
            getReferralTranslationContent(languageCode),
            getReferralSettingsContent('driver'),
          ]);
          setTranslation({
            language_code: translationResponse?.data?.language_code || languageCode,
            driver_referral: applyReferralSettingPlaceholders(
              translationResponse?.data?.driver_referral || fallbackDriverSection,
              settingsResponse?.data || {},
            ),
          });
        } catch {
          // Keep local fallback state.
        }
      } finally {
        setLoading(false);
      }
    };

    loadDriverReferral();
  }, []);

  const appName = settings.general?.app_name || 'App';
  const referralCode = driverProfile.referralCode || '';
  const normalizedDriverReferral = Object.fromEntries(
    Object.entries(translation.driver_referral || {}).map(([key, value]) => [
      key,
      replaceLegacyReferralBrand(value, appName),
    ]),
  );
  const bannerText = normalizedDriverReferral.banner_text || `${appName} Refer and Earn`;
  const infoBlocks = buildReferralPreviewBlocks(
    normalizedDriverReferral,
    DRIVER_REFERRAL_TRANSLATION_FIELDS,
  );
  const referralShareLink = referralCode
    ? `${window.location.origin}/taxi/driver/reg-phone?ref=${encodeURIComponent(referralCode)}`
    : '';

  const handleCopy = async () => {
    if (!referralCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures silently.
    }
  };

  const handleShare = async () => {
    if (!referralCode) {
      return;
    }
    const shareText = `${bannerText}\nJoin as a driver with my referral link and code ${referralCode}.\n${referralShareLink}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: bannerText,
          text: shareText,
          url: referralShareLink,
        });
        return;
      }
    } catch {
      // Fall through to desktop-friendly sharing options.
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures and continue to WhatsApp fallback.
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] font-sans p-5 pt-8 pb-10">
      <header className="mb-5 flex items-center gap-3">
        <button
          onClick={() => navigate(routePrefix === "/taxi/owner" ? "/taxi/owner/home" : `${routePrefix}/profile`)}
          className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-sm"
        >
          <ArrowLeft size={18} className="text-gray-900" strokeWidth={2.3} />
        </button>
        <h1 className="text-[19px] font-semibold text-gray-900">Referrals</h1>
      </header>

      <div className="rounded-[28px] border border-gray-200 bg-white shadow-sm overflow-hidden max-w-md mx-auto">
        <div className="flex items-center justify-between gap-3 bg-gradient-to-br from-[#E6F7EE] to-[#EEFBE0] px-5 py-5">
          <div className="min-w-0">
            <p className="text-[22px] font-semibold leading-tight text-[#14213D]">{bannerText}</p>
            <p className="mt-1 text-[11px] font-medium text-[#0F766E]">{myReferrals ? `${myReferrals.count} joined with your code` : ' '}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#C6F432] text-[#14213D]">
            <Gift size={22} />
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="rounded-2xl border border-dashed border-[#0F766E]/40 bg-[#F4FBF8] px-4 py-3 text-center">
            <p className="text-[11px] font-medium text-gray-500">Your referral code</p>
            <p className="mt-0.5 break-all text-[20px] font-semibold tracking-wide text-[#14213D]">
              {referralCode || 'Not available'}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!referralCode}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#C6F432] text-sm font-semibold text-[#14213D] disabled:opacity-50"
            >
              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={!referralCode}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#0F766E]/30 bg-[#E6F7EE] text-sm font-semibold text-[#0F766E] disabled:opacity-50"
            >
              <Share2 size={16} /> Share
            </button>
          </div>

          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Share link</p>
            <p className="mt-1 break-all text-[12px] text-gray-700">
              {referralShareLink || 'Share link will appear once your referral code is ready.'}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
            {[['refer', 'Refer and earn'], ['history', 'Referral history']].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`rounded-lg py-2 text-xs font-semibold transition ${
                  activeTab === key ? 'bg-white text-[#0F766E] shadow-sm' : 'text-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4 min-h-[340px]">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-[#0F766E]" size={26} />
            </div>
          ) : activeTab === 'refer' ? (
<div className="space-y-4">
              <h2 className="text-[18px] font-semibold text-gray-900">How it works?</h2>
              <ol className="space-y-2">
                {describeReferralProgram(myReferrals?.program, { audience: AUDIENCE }).map((line, index) => (
                  <li key={line} className="flex gap-3 text-[14px] leading-6 text-gray-800">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600">{index + 1}</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <MyReferralsList data={myReferrals} accent="#0F766E" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {copied ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 rounded-2xl bg-gray-900 text-white px-4 py-3 text-xs font-semibold shadow-xl"
          >
            Referral code copied
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default DriverReferral;
