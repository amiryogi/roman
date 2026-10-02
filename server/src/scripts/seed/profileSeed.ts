import { profileInputSchema } from '@roman/shared';

/**
 * The initial profile, taken from Roman's CV and nothing else (plan §0.3, §26 rule 6).
 * Wording is kept as in the CV. Fields the CV doesn't cover stay empty for the owner to fill:
 * achievements, philosophy, socials and SEO. The phone number is deliberately not committed;
 * the owner can add it in the admin panel, and it stays hidden until they choose to show it.
 */
const CV_PROFILE =
  'Professional violinist and music educator with more than 15 years of experience in ' +
  'performance and music education. Experienced in teaching violin and music to primary and ' +
  'secondary students in international schools. Trained in IPC and IMYC music curriculum with ' +
  'a strong focus on creative learning, global competence, and student-centered teaching. ' +
  'Active performer in orchestras, studio recordings, films, and live events including weddings ' +
  'and concerts.';

const PRESENT = 'Present';

// Images are uploaded and attached by the seed script.
const profileTextSchema = profileInputSchema.omit({
  portrait: true,
  heroDesktop: true,
  heroMobile: true,
  ogImage: true,
});

export const PROFILE_SEED = profileTextSchema.parse({
  displayName: 'Roman Budhathoki',
  tagline: 'Violinist · Music Educator · Kathmandu',
  shortBio: CV_PROFILE,
  biography: [{ body: CV_PROFILE }],
  education: [
    {
      year: '2013',
      title: '4th Grade (Violin)',
      institution: 'Associated Board of the Royal Schools of Music (ABRSM)',
      location: 'London',
    },
    {
      year: '2013',
      title: 'Colourstrings Teacher Training Course',
      institution: 'Colourstrings Association',
      location: 'Finland',
    },
    {
      year: '2010',
      title: 'Advanced Violin Studies with Rajkumar Shrestha',
      institution: 'Narayan Gopal Music Trust',
    },
    {
      year: '2008 – 2009',
      title: 'Violin Studies with Surendra Maharjan',
      institution: 'Sol Fa Academy',
      location: 'Naradevi',
    },
  ],
  experience: [
    {
      period: `2023 – ${PRESENT}`,
      role: 'IPC Music Teacher (Primary)',
      organization: 'GEMS School',
      location: 'Kathmandu',
      category: 'teaching',
      highlights: [
        'Teaching music to primary level students using IPC curriculum',
        'Integrating creativity, rhythm, and instrumental learning',
        'Designing music lessons aligned with global competence and cross-curricular learning',
      ],
    },
    {
      period: '2019 – 2023',
      role: 'Violin Instructor',
      organization: 'Sanskrity International School',
      location: 'Swayambhu',
      category: 'teaching',
      highlights: [
        'Conducted violin classes for students of different skill levels',
        'Prepared students for school performances and concerts',
        'Focused on technique, musicality, and ensemble playing',
      ],
    },
    ...[
      ['2019', 'Lincoln School', 'Minbhawan'],
      ['2013', 'Trikaal Art Academy', 'Maharajgunj'],
      ['2013', 'Blood and Thunder Music Academy', 'Kumaripati'],
      ['2012', 'Sadhana Kala Kendra', 'Putalisadak'],
    ].map(([period, organization, location]) => ({
      period,
      role: 'Violin Instructor',
      organization,
      location,
      category: 'teaching',
      highlights: [],
    })),
    {
      period: `2012 – ${PRESENT}`,
      role: 'First Violinist',
      organization: 'Annapurna Orchestra',
      category: 'performance',
      highlights: [],
    },
    {
      period: `2011 – ${PRESENT}`,
      role: 'Concerts, musical collaborations and studio recordings',
      organization: 'Various bands, solo artists, and orchestras',
      category: 'performance',
      highlights: [
        'Performed in live concerts, cultural programs, and international music events',
        'Studio violinist for film soundtracks and recordings with multiple Nepali artists',
        'Performed violin for weddings, events, and private functions',
        'Session violinist for recording projects and original compositions',
      ],
    },
    {
      period: '2010',
      role: 'Concert Performance – International Music Day',
      organization: 'Nepal Music Center',
      category: 'performance',
      highlights: [],
    },
    {
      period: '2009',
      role: 'Member',
      organization: 'Kathmandu Youth Orchestra',
      category: 'performance',
      highlights: [],
    },
    {
      period: '2008',
      role: 'Performance – Fête de la Musique (International Music Day)',
      organization: 'Alliance Française Kathmandu',
      category: 'performance',
      highlights: [],
    },
    // Kept in the data but not shown publicly by default (plan ASM-6).
    {
      period: '2012',
      role: 'Intern Journalist',
      organization: 'Shram Magazine',
      category: 'other',
      highlights: [],
    },
  ],
  achievements: [],
  skills: [
    'Violin Performance (Solo, Orchestra, Ensemble)',
    'Music Education & Curriculum Development',
    'IPC / IMYC Music Teaching',
    'Studio Recording & Session Performance',
    'Music Arrangement and Composition',
    'Live Event & Wedding Performance',
  ],
  affiliations: [
    { name: 'Narayan Gopal Music Trust', since: '2010' },
    { name: 'Sol Fa Academy', since: '2010' },
  ],
  contact: {
    publicEmail: 'romanviolinktm@gmail.com',
    showPhone: false,
    location: 'Kathmandu, Nepal',
  },
  socials: [],
  seo: {},
});
