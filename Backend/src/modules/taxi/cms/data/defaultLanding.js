// Default content for the public landing site and the app login screens.
// Everything here can be overridden from Admin > Website & Pages > Landing Page.
export const DEFAULT_LANDING = {
  theme: { primary: '#0F766E', dark: '#052E2B', accent: '#C6F432', ink: '#14213D' },
  header: {
    brandName: 'Kailo Taxi',
    logo: '',
    links: [
      { label: 'About', target: '#about' },
      { label: 'Vision', target: '#vision' },
      { label: 'Partner', target: '#audiences' },
    ],
  },
  hero: {
    badge: 'SAFE, FAST & AFFORDABLE RIDES',
    title: 'Every ride,',
    highlight: 'under control.',
    subtitle: 'City rides, rentals, parcels and intercity trips in one app, with fair fares and verified drivers.',
    primaryText: 'Book a Ride',
    primaryTarget: '/taxi/user',
    secondaryText: 'Become a Driver',
    secondaryTarget: '#audiences',
    image: '',
    stats: [],
    background: '',
    // One slide per vehicle tab. `key` picks the bundled vehicle image (cab, bike, bus, parcel, outstation) when `image` is empty.
    slides: [
      {
        key: 'cab', tab: 'Cab', badge: 'CITY CAB RIDES', title: 'Move fast.', highlight: 'City cab rides.',
        subtitle: 'Comfortable cabs at fair, upfront fares, with a verified driver at your door in minutes.',
        ctaText: 'Book a Cab', ctaTarget: '/taxi/user', image: '', background: '',
      },
      {
        key: 'bike', tab: 'Bike & Auto', badge: 'BIKE AND AUTO', title: 'Beat the traffic.', highlight: 'Bike and auto rides.',
        subtitle: 'The quickest way across town. Low fares, short waits.',
        ctaText: 'Book a Bike', ctaTarget: '/taxi/user', image: '', background: '',
      },
      {
        key: 'bus', tab: 'Bus', badge: 'BUS AND POOLING', title: 'Travel together.', highlight: 'Save on every trip.',
        subtitle: 'Share rides and book bus seats on popular routes for the best price.',
        ctaText: 'Book a Seat', ctaTarget: '/taxi/user', image: '', background: '',
      },
      {
        key: 'parcel', tab: 'Parcel', badge: 'PARCEL DELIVERY', title: 'Send it today.', highlight: 'Parcels, delivered.',
        subtitle: 'Same-day courier across the city with live tracking from pickup to drop.',
        ctaText: 'Send a Parcel', ctaTarget: '/taxi/user', image: '', background: '',
      },
      {
        key: 'outstation', tab: 'Outstation', badge: 'INTERCITY AND RENTALS', title: 'Go the distance.', highlight: 'Outstation trips.',
        subtitle: 'One-way drops, round trips and hourly rentals with trusted drivers.',
        ctaText: 'Plan a Trip', ctaTarget: '/taxi/user', image: '', background: '',
      },
    ],
  },
  about: {
    title: 'About Kailo Taxi',
    description:
      'Kailo Taxi is a mobility platform that connects riders with verified drivers and vehicle owners. We keep fares transparent, trips safe and earnings fair for everyone on the road.',
    image: '',
    points: [
      { title: 'Transparent fares', description: 'See the price before you book. No hidden surge.' },
      { title: 'Verified drivers', description: 'Every driver and vehicle is document-checked.' },
      { title: 'Safety first', description: 'Live trip tracking and one-tap SOS on every ride.' },
    ],
  },
  rider: {
    enabled: true,
    eyebrow: 'For riders',
    title: 'Your ride,',
    highlight: 'one tap away.',
    description:
      'Pick a cab, auto or bike, see the fare upfront and watch your driver arrive on a live map. Share rides to save more, or rent a car by the hour.',
    bullets: ['Upfront fares, no surprises', 'Live tracking and one-tap SOS', 'Cab, auto, bike, rentals and intercity'],
    ctaText: 'Book a ride',
    ctaTarget: '/taxi/user',
    image: '',
    background: '',
    floatCards: [
      { label: 'Driver arriving', value: '2 min' },
      { label: 'Fare estimate', value: 'Rs 184' },
      { label: 'Trip safety', value: 'Live SOS on' },
    ],
  },
  vision: {
    title: 'Our vision',
    description: 'To make everyday travel simple, safe and fair, and to give every driver a dependable income.',
    mission: 'Build the most trusted taxi network in every city we serve.',
    values: [
      { title: 'Trust', description: 'Honest pricing and verified people.' },
      { title: 'Safety', description: 'Protection built into every trip.' },
      { title: 'Fairness', description: 'Riders save, drivers earn more.' },
    ],
  },
  audiences: {
    title: 'Made for everyone on the road',
    subtitle: 'Pick how you want to use Kailo Taxi.',
    items: [
      {
        key: 'user',
        name: 'Rider',
        description: 'Book cabs, autos and bikes in seconds. Share rides, rent by the hour or travel intercity.',
        bullets: ['Instant booking', 'Live tracking', 'Cashless payments'],
        ctaText: 'Open rider app',
        ctaTarget: '/taxi/user',
        image: '',
      },
      {
        key: 'driver',
        name: 'Driver',
        description: 'Drive on your schedule, keep more of every fare and get paid fast.',
        bullets: ['Flexible hours', 'Weekly payouts', '24/7 support'],
        ctaText: 'Drive with us',
        ctaTarget: '#audiences',
        image: '',
      },
      {
        key: 'owner',
        name: 'Fleet owner',
        description: 'Add your vehicles, assign drivers and track earnings from one dashboard.',
        bullets: ['Multi-vehicle control', 'Earnings reports', 'Driver management'],
        ctaText: 'Register your fleet',
        ctaTarget: '#audiences',
        image: '',
      },
    ],
  },
  download: {
    title: 'Get the Kailo Taxi app',
    subtitle: 'Scan the code or pick your store.',
    playStoreUrl: '',
    appStoreUrl: '',
    qrImage: '',
    qrUrl: '',
    showQr: true,
  },
  register: {
    enabled: true,
    title: 'Join Kailo Taxi',
    subtitle: 'Tell us about yourself and our team will get in touch.',
    successMessage: 'Thanks! We have received your details and will contact you soon.',
    roles: [
      { value: 'user', label: 'Rider' },
      { value: 'driver', label: 'Driver' },
      { value: 'owner', label: 'Fleet owner' },
    ],
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      { question: 'How do I book a ride?', answer: 'Download the app, enter your pickup and drop, choose a vehicle and confirm.' },
      { question: 'How do I become a driver?', answer: 'Use the registration form on this page or the driver app, upload your documents and get verified.' },
    ],
  },
  footer: {
    about: 'Safe, fast and affordable city rides, rentals, intercity trips and parcel delivery.',
    email: '',
    phone: '',
    address: '',
    columns: [
      {
        title: 'Company',
        links: [
          { label: 'About', target: '#about' },
          { label: 'Vision', target: '#vision' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { label: 'Terms', target: '/taxi/terms' },
          { label: 'Privacy Policy', target: '/taxi/privacy' },
        ],
      },
    ],
    social: [],
    copyright: '© Kailo Taxi. All rights reserved.',
  },
  appScreens: {
    user: { title: 'Move with', highlight: 'Safety & Style.', subtitle: 'Reliable, fast and always at your service.', image: '' },
    driver: { title: 'Drive more,', highlight: 'earn more.', subtitle: 'Sign in to accept rides and track your earnings.', image: '' },
    admin: { title: 'Every ride,', highlight: 'under control.', subtitle: 'Sign in to manage your fleet and operations.', image: '' },
  },
};
