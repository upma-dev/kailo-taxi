import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OfferStrip from '@/shared/components/OfferStageCard';
import { fetchHomeOffers, openOfferLink } from './homeOffersApi';

// Offer cards the admin puts on the home screen, under "Our Services" (Admin -> App Customization -> Home Offers).
// Shows nothing when there are none.
export default function HomeOffers({ plain = false }) {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchHomeOffers('top').then((list) => { if (!cancelled) setOffers(list); });
    return () => { cancelled = true; };
  }, []);

  if (!offers.length) return null;

  return (
    <section className={plain ? 'relative z-10 px-5' : 'relative w-full bg-[#F8FAF7] px-5 pt-4'}>
      <OfferStrip offers={offers} onSelect={(offer) => openOfferLink(offer, navigate)} />
    </section>
  );
}
