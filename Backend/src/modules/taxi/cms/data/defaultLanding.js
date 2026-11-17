// Default content for the public landing site and the app login screens.
// Everything here can be overridden from Admin > Website & Pages > Landing Page.
// Added in layout version 3; also appended to hero content that was saved earlier.
export const NEW_SLIDES = [
  {
    key: 'flight', tab: 'Flight', badge: 'FLIGHT BOOKING + AIRPORT RIDE', title: 'Book your flight,', highlight: 'get your ride.',
    subtitle: 'Plan your air travel in the same app. Book your flight, then book the airport pickup or drop with the fare shown upfront, so you reach on time.',
    ctaText: 'Book Airport Cab', ctaTarget: '/taxi/user/cab/airport', image: '', image2: '', video: '', background: '',
  },
  {
    key: 'hotel', tab: 'Hotel', badge: 'HOTEL BOOKING + RIDE', title: 'Book your stay,', highlight: 'ride to the door.',
    subtitle: 'Find and book a hotel in the app, then get a verified cab to or from it. Stay and ride, both from one place, with the fare shown upfront.',
    ctaText: 'Book a Cab', ctaTarget: '/taxi/user', image: '', image2: '', video: '', background: '',
  },
  {
    key: 'movers', tab: 'Packers & Movers', badge: 'PACKERS & MOVERS', title: 'Shifting house?', highlight: 'We move it.',
    subtitle: 'Book a truck with loaders for your home or office shifting, and track it on the map.',
    ctaText: 'Book Movers', ctaTarget: '/taxi/user/parcel/type', image: '', image2: '', video: '', background: '',
  },
];

// Layout version 10 split the old "Bike & Auto" slide into one slide per vehicle, each with its own picture.
export const BIKE_AUTO_SLIDES = [
  {
    key: 'bike', tab: 'Bike', badge: 'BIKE RIDES', title: 'Beat the traffic.', highlight: 'Bike rides.',
    subtitle: 'Hop on a bike and zip through the jam. The cheapest and quickest way across town, with a helmet for every rider.',
    ctaText: 'Book a Bike', ctaTarget: '/taxi/user', image: '', image2: '', video: '', background: '',
  },
  {
    key: 'auto', tab: 'Auto', badge: 'AUTO RICKSHAW', title: 'Hop in an auto.', highlight: 'Fixed fares, no haggling.',
    subtitle: 'Book an auto rickshaw at a fare shown before you confirm. No bargaining, no waiting at the corner.',
    ctaText: 'Book an Auto', ctaTarget: '/taxi/user', image: '', image2: '', video: '', background: '',
  },
];

export const DEFAULT_LANDING = {
  theme: { primary: '#0F766E', dark: '#052E2B', accent: '#C6F432', ink: '#14213D' },
  layoutVersion: 12,
  header: {
    brandName: 'Kailo Taxi',
    logo: '',
    links: [
      { label: 'About Us', target: '#about' },
      { label: 'Services', target: '#services' },
      { label: 'Why Kailo', target: '#vision' },
      { label: 'How It Works', target: '#how-it-works' },
      { label: 'For Partners', target: '#audiences' },
      { label: 'FAQ', target: '#faq' },
      { label: 'Contact', target: '#contact' },
    ],
    earnText: 'Earn with Us',
    earnTarget: '#audiences',
    ctaText: 'Get the App',
    storeSubtitle: 'Kailo Taxi App',
    languageEnabled: true,
    // `code` is a Google Translate language code; the whole page (including admin-edited text) is translated.
    languages: [
      { code: 'en', label: 'English', enabled: true },
      { code: 'hi', label: 'हिन्दी', enabled: true },
      { code: 'kn', label: 'ಕನ್ನಡ', enabled: true },
      { code: 'ta', label: 'தமிழ்', enabled: true },
      { code: 'te', label: 'తెలుగు', enabled: true },
      { code: 'mr', label: 'मराठी', enabled: true },
    ],
  },
  hero: {
    badge: 'SAFE, FAST & AFFORDABLE RIDES',
    title: 'Every ride,',
    highlight: 'under control.',
    subtitle: 'City cabs, bikes and autos, airport cabs for your flight, hotel transfers, bus seats, parcels and outstation trips in one app, with fair fares and verified drivers.',
    primaryText: 'Book a Ride',
    primaryTarget: '/taxi/user',
    secondaryText: 'Become a Driver',
    secondaryTarget: '#audiences',
    image: '',
    stats: [],
    background: '',
    // One slide per vehicle tab. `key` picks the bundled scene photo (cab, bike, auto, bus, parcel, outstation, flight, hotel, movers) when `background` is empty.
    slides: [
      {
        key: 'cab', tab: 'Cab', badge: 'CITY CAB RIDES', title: 'Move fast.', highlight: 'City cab rides.',
        subtitle: 'Comfortable cabs at fair, upfront fares, with a verified driver at your door in minutes.',
        ctaText: 'Book a Cab', ctaTarget: '/taxi/user', image: '', background: '',
      },
      ...BIKE_AUTO_SLIDES,
      {
        key: 'bus', tab: 'Bus', badge: 'BUS BOOKING + RIDE', title: 'Book your seat,', highlight: 'ride to the stop.',
        subtitle: 'Choose a route, pick your seat and pay in the app. Need to reach the bus stand? Book a cab or auto from the same app.',
        ctaText: 'Book a Seat', ctaTarget: '/taxi/user/bus', image: '', background: '',
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
      ...NEW_SLIDES,
    ],
  },
  about: {
    eyebrow: 'WHO WE ARE',
    title: 'About Kailo Taxi',
    description:
      'Kailo Taxi is a ride app made in Bangalore. You book a cab, auto or bike, see the fare before you confirm, and know who is driving you. The same app also books your airport cab for a flight, a hotel transfer, a bus seat on popular routes, parcel delivery and outstation trips. Drivers and vehicle owners get regular work and fair pay, and every driver is checked before their first trip.',
    image: '',
    cards: [
      { icon: 'shield', title: 'Checked drivers and cars', description: 'We verify the licence, ID and vehicle papers before a driver can take rides.' },
      { icon: 'userCheck', title: 'Background checks', description: 'Every partner goes through identity and background verification with our team.' },
      { icon: 'mapPin', title: 'Live trip tracking', description: 'Follow your ride on the map and share the trip with someone at home.' },
      { icon: 'receipt', title: 'Fare shown upfront', description: 'You see the price before you book. No bargaining when you get in.' },
      { icon: 'plane', title: 'Airport and flight rides', description: 'Book a cab to or from the airport around your flight time and reach with time to spare.' },
      { icon: 'hotel', title: 'Hotel transfers', description: 'Get picked up at your hotel or dropped at the door, with the fare fixed in advance.' },
      { icon: 'bus', title: 'Bus booking', description: 'Pick a route, choose your seat and pay in the app. Your ticket is saved in your profile.' },
      { icon: 'package', title: 'Parcels and movers', description: 'Send a parcel across the city, or book a truck with loaders when you shift house.' },
    ],
  },
  services: {
    enabled: true,
    eyebrow: 'WHAT WE OFFER',
    title: 'Everything you travel for',
    subtitle: 'Rides around the city, trips out of it, and a few things you would otherwise need three apps for.',
    items: [
      { icon: 'car', title: 'City cabs', description: 'Hatchback, sedan or SUV, with the fare shown before you book.' },
      { icon: 'bike', title: 'Bike and auto', description: 'Cheap and quick when the roads are jammed.' },
      { icon: 'bus', title: 'Pooling and bus', description: 'Share a ride or book a bus seat and split the cost.' },
      { icon: 'package', title: 'Parcels', description: 'Send a parcel across the city and track it till it reaches.' },
      { icon: 'route', title: 'Outstation', description: 'One-way drops and round trips with drivers who know the highway.' },
      { icon: 'clock', title: 'Rentals', description: 'Take a car with a driver for a few hours or the whole day.' },
      { icon: 'building', title: 'Airport rides', description: 'Pickup and drop for your flight, with the fare shown upfront.' },
      { icon: 'package', title: 'Packers and movers', description: 'Packing, loading and shifting for your home or office.' },
    ],
  },
  howItWorks: {
    enabled: true,
    eyebrow: 'SIMPLE WORKFLOW',
    title: 'How Kailo Taxi works',
    stepLabel: 'Step',
    tabs: [
      {
        label: 'Riders',
        steps: [
          { title: 'Sign up', description: 'Enter your phone number and the OTP we send. That is all it takes.' },
          { title: 'Pick your ride', description: 'Set pickup and drop, choose a vehicle and see the fare.' },
          { title: 'Watch it arrive', description: 'See your driver coming on the map. Share the trip if you want.' },
          { title: 'Pay and rate', description: 'Pay in cash, wallet or online, then rate the trip.' },
        ],
      },
      {
        label: 'Drivers',
        steps: [
          { title: 'Register', description: 'Sign up with your phone number, city and vehicle details.' },
          { title: 'Upload documents', description: 'Licence, ID and vehicle papers. Our team checks them.' },
          { title: 'Go online', description: 'Switch on, get ride requests nearby and accept the ones you like.' },
          { title: 'Get paid', description: 'Your earnings show in the app and you can withdraw to your bank.' },
        ],
      },
      {
        label: 'Owners',
        steps: [
          { title: 'Add your vehicles', description: 'Enter each vehicle with its papers and photos.' },
          { title: 'Assign a driver', description: 'Choose a verified driver for each vehicle. Change them anytime.' },
          { title: 'Keep an eye on trips', description: 'See which vehicle is on a trip and what it has earned.' },
          { title: 'Take your share', description: 'Check your payout statement and withdraw when you want.' },
        ],
      },
      {
        label: 'Fleet',
        steps: [
          { title: 'Tell us about your fleet', description: 'Share how many vehicles and drivers you have. We help you get set up.' },
          { title: 'Add drivers and vehicles', description: 'Onboard everyone from one dashboard instead of one by one.' },
          { title: 'Watch live activity', description: 'See which vehicles are free, on a trip or offline.' },
          { title: 'Download reports', description: 'Get earnings reports for every vehicle and driver, and receive payouts together.' },
        ],
      },
    ],
  },
  contact: {
    enabled: true,
    eyebrow: "WE'RE HERE FOR YOU",
    title: 'Contact Us',
    subtitle: 'Call, WhatsApp or drop us a message. We reply every day.',
    helpline: '',
    whatsapp: '',
    whatsappText: 'Chat Now',
    email: '',
    hours: 'Monday – Sunday: 24 x 7',
    address: 'Bengaluru, Karnataka, India',
    extraCards: [
      { icon: 'headset', title: 'Partner support', text: 'Help with sign-up, documents and payouts for drivers and owners.' },
      { icon: 'shield', title: 'Safety & SOS', text: 'Had a problem on a trip? Tell us and we will look into it the same day.' },
    ],
    formTitle: 'Send Us a Direct Message',
    formSubtitle: 'Ask us anything. We usually reply within a few hours.',
    nameLabel: 'Your Name',
    contactLabel: 'Phone / Email',
    topicLabel: 'I am a',
    topics: ['Rider', 'Driver', 'Fleet owner', 'Other'],
    messageLabel: 'Message',
    buttonText: 'Send Message',
    successMessage: 'Thanks, we got your message. We will get back to you soon.',
  },
  founder: {
    enabled: true,
    eyebrow: 'LEADERSHIP',
    title: 'Meet the Founder & Director',
    subtitle: 'The people behind Kailo Taxi.',
    people: [
      {
        name: 'Founder Name',
        role: 'Founder & Director',
        photo: '',
        bio: 'Add the founder profile here from Admin > Landing Page > Founder.',
        quote: 'A ride should be safe, easy and fair for everyone in the car.',
      },
    ],
    journeyTitle: 'Our journey',
    journey: [
      { year: 'The idea', title: 'Spotting the gap', description: 'Riders wanted a fair fare and a safe ride. Drivers wanted steady work. We started Kailo Taxi for both.' },
      { year: 'The build', title: 'Building the platform', description: 'We built the rider, driver and owner apps with document checks and live tracking from the start.' },
      { year: 'The launch', title: 'First rides', description: 'The first rides went live with cabs, autos and bikes at fixed fares.' },
      { year: 'Next', title: 'Growing across India', description: 'More cities, more services and more work for our drivers and owners.' },
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
    // Three folders (tabs). Admin can add, rename or remove folders and questions in Landing Page > FAQ.
    groups: [
      {
        label: 'Rider',
        items: [
          { question: 'How do I book a ride?', answer: 'Open the app, enter your pickup and drop, choose a cab, auto or bike and confirm. You see the fare before you book and can track your driver on the map.' },
          { question: 'Can I book a bus, hotel or flight in the app?', answer: 'Yes. Bus seats can be booked in the app, and hotel and flight bookings are available too. You can also book a cab for the airport, your hotel or the bus stand from the same app.' },
          { question: 'How can I pay for my trip?', answer: 'You can pay in cash, from your in-app wallet or online, depending on what is available in your city.' },
          { question: 'Is my ride safe?', answer: 'Every driver is checked before their first trip. You can follow the ride live, share the trip with someone at home and use the SOS button if you need help.' },
          { question: 'What if I need to cancel a ride?', answer: 'You can cancel from the ride screen before the driver arrives. Any cancellation charge is shown in the app and covered in our Refunds and Cancel policy.' },
        ],
      },
      {
        label: 'Driver',
        items: [
          { question: 'How do I become a driver?', answer: 'Sign up in the driver app with your phone number, add your city and vehicle details, and upload your documents. Our team checks them and you can go online once approved.' },
          { question: 'Which documents do I need?', answer: 'Your driving licence, an ID proof and the vehicle papers such as registration and insurance. Photos of the vehicle may also be asked for.' },
          { question: 'How and when do I get paid?', answer: 'Your earnings show in the app after every trip. You can withdraw them to your bank account from the wallet section.' },
          { question: 'Can I choose my working hours?', answer: 'Yes. Switch the app online when you want to drive and offline when you want to stop. You decide which ride requests to accept.' },
          { question: 'What if I have a problem during a trip?', answer: 'Use the support option in the app or call our helpline. Support is available every day, and the SOS button works during a trip.' },
        ],
      },
      {
        label: 'Fleet owner',
        items: [
          { question: 'What is a fleet owner account?', answer: 'It lets you add one or many vehicles, assign drivers to them and watch trips and earnings from a single dashboard.' },
          { question: 'How do I add my vehicles and drivers?', answer: 'Register as an owner, add each vehicle with its papers and photos, then assign a verified driver to every vehicle. You can change the driver anytime.' },
          { question: 'Can I see what each vehicle earns?', answer: 'Yes. The dashboard shows which vehicle is on a trip, free or offline, and the earnings of every vehicle and driver.' },
          { question: 'How do I receive my payouts?', answer: 'Your share is shown in the payout statement. You can check it and withdraw to your bank account whenever you want.' },
          { question: 'I run a large fleet. Can you help me get set up?', answer: 'Yes. Tell us how many vehicles and drivers you have using the contact form, and our team will help you onboard everyone together.' },
        ],
      },
    ],
  },
  footer: {
    companyName: 'Kailo Taxi',
    about:
      'Cabs, autos, bikes, rentals, outstation trips and parcels in one app. Made in Bangalore.',
    email: '',
    phone: '',
    address: 'Bengaluru, Karnataka, India',
    showStoreBadges: true,
    locationTitle: 'LOCATION',
    helplineLabel: 'Helpline',
    columns: [
      {
        title: 'EXPLORE',
        links: [
          { label: 'About Us', target: '#about' },
          { label: 'Services', target: '#services' },
          { label: 'How It Works', target: '#how-it-works' },
          { label: 'For Partners', target: '#audiences' },
          { label: 'About the Founder', target: '#founder' },
          { label: 'Our Journey', target: '#journey' },
          { label: 'FAQs', target: '#faq' },
          { label: 'Contact', target: '#contact' },
        ],
      },
      {
        title: 'LEGAL & SAFETY',
        links: [
          { label: 'Terms of Service', target: '/taxi/terms' },
          { label: 'Privacy Policy', target: '/taxi/privacy' },
          { label: 'Refunds & Cancel', target: '/taxi/refund' },
          { label: 'Partner Portal', target: '#audiences' },
        ],
      },
    ],
    social: [],
    copyright: '© {year} {company}. All rights reserved.',
    builtIn: 'Built in Bangalore, IN',
    tagline: 'Speed, Safety & Quality',
  },
  appScreens: {
    user: { title: 'Move with', highlight: 'Safety & Style.', subtitle: 'Reliable, fast and always at your service.', image: '' },
    driver: { title: 'Drive more,', highlight: 'earn more.', subtitle: 'Sign in to accept rides and track your earnings.', image: '' },
    admin: { title: 'Every ride,', highlight: 'under control.', subtitle: 'Sign in to manage your fleet and operations.', image: '' },
  },
};
