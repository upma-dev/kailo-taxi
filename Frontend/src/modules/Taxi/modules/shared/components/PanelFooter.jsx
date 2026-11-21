import React from 'react';
import { Link } from 'react-router-dom';
import { useLandingContent } from '../../../shared/hooks/useLandingContent';

// Footer for the Rider and Driver apps. The admin edits it in Admin > Landing Page > Footer,
// one footer per panel. It only shows when the admin turns "Separate footer" on for that panel.
export const FOOTER_PANELS = [
  { id: 'website', label: 'Website' },
  { id: 'user', label: 'Rider app' },
  { id: 'driver', label: 'Driver app' },
];

const arr = (v) => (Array.isArray(v) ? v : []);

/** Returns the footer for a panel, or null when that panel has no footer of its own. */
export const resolvePanelFooter = (footer, panel) => {
  if (!footer || panel === 'website') return footer || null;
  const own = footer.panels?.[panel];
  return own && own.enabled ? own : null;
};

// Policy links open the version of the policy the admin wrote for this panel (Admin > Legal Pages).
const POLICY_RE = /^\/taxi\/(?:(?:driver|owner|user)\/)?(privacy|terms|refund|cancellation|shipping|dmv-compliance)(?:-policy|-and-conditions)?\/?$/;

function PanelLink({ link, tone, panel }) {
  const raw = String(link?.target || '').trim();
  if (!raw) return <span>{link?.label}</span>;
  const policy = raw.match(POLICY_RE);
  // "#about" style targets point at a section of the website.
  const t = policy ? `/taxi/legal/${panel}/${policy[1]}` : raw.startsWith('#') ? `/landing${raw}` : raw;
  const cls = `${tone} transition-colors hover:underline`;
  if (t.startsWith('/') && !t.startsWith('//')) {
    return (
      <Link to={t} className={cls}>
        {link.label}
      </Link>
    );
  }
  return (
    <a href={t} target="_blank" rel="noopener noreferrer" className={cls}>
      {link.label}
    </a>
  );
}

export default function PanelFooter({ panel = 'user', className = '' }) {
  const { content } = useLandingContent();
  const data = resolvePanelFooter(content?.footer, panel);
  if (!data) return null;

  const company = data.companyName || content?.header?.brandName || '';
  const copyright = String(data.copyright || '')
    .replace(/\{year\}/g, new Date().getFullYear())
    .replace(/\{company\}/g, company);
  const columns = arr(data.columns).filter((c) => c?.title || arr(c?.links).length);
  const social = arr(data.social).filter((s) => s?.label);
  const hasContact = data.address || data.phone || data.email;

  return (
    <footer className={`border-t border-slate-200 bg-slate-50 px-6 py-8 text-slate-600 ${className}`}>
      {data.about && <p className="text-[13px] leading-relaxed">{data.about}</p>}

      {columns.map((c, i) => (
        <div key={i} className="mt-6">
          <h4 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-900">{c.title}</h4>
          <ul className="mt-3 space-y-2 text-[13px] font-medium">
            {arr(c.links).map((l, j) => (
              <li key={j}>
                <PanelLink link={l} tone="text-slate-600" panel={panel} />
              </li>
            ))}
          </ul>
        </div>
      ))}

      {hasContact && (
        <div className="mt-6">
          <h4 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-900">{data.locationTitle || 'LOCATION'}</h4>
          <div className="mt-3 space-y-2 text-[13px]">
            {data.address && <p>{data.address}</p>}
            {data.phone && (
              <p>
                {data.helplineLabel || 'Helpline'}:{' '}
                <a href={`tel:${String(data.phone).replace(/\s/g, '')}`} className="font-bold text-slate-900">
                  {data.phone}
                </a>
              </p>
            )}
            {data.email && (
              <p>
                <a href={`mailto:${data.email}`} className="hover:underline">
                  {data.email}
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {social.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-bold">
          {social.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:underline">
              {s.label}
            </a>
          ))}
        </div>
      )}

      {(copyright || data.builtIn || data.tagline) && (
        <div className="mt-6 space-y-1 border-t border-slate-200 pt-4 text-[11px] text-slate-400">
          {copyright && <p>{copyright}</p>}
          {(data.builtIn || data.tagline) && <p>{[data.builtIn, data.tagline].filter(Boolean).join(' · ')}</p>}
        </div>
      )}
    </footer>
  );
}
