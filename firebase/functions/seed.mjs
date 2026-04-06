/**
 * Emulator seed script — multi-profile edition
 *
 * Profiles:
 *   medium (default) — ~260 locations, ~3 000 reviews, 50 ghost users
 *   heavy            — ~2 000 locations, ~50 000 reviews, 500 ghost users
 *
 * Prerequisites:
 *   firebase emulators:start   (from the firebase/ directory)
 *
 * Usage:
 *   npm run seed            ← medium
 *   npm run seed:heavy      ← heavy
 */

import { createHash } from 'crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

const app = initializeApp({ projectId: 'shifttea-dev' });
const auth = getAuth(app);
const db = getFirestore(app);

const PROFILE = process.argv.includes('--heavy') ? 'heavy' : 'medium';

const CONFIG = {
  medium: { ghostCount: 50,  reviewRange: [8,  18] },
  heavy:  { ghostCount: 500, reviewRange: [20, 30] },
}[PROFILE];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashUid(uid) {
  return createHash('sha256').update(uid).digest('hex');
}

function deterministicReviewId(uidHash, locationId) {
  return createHash('sha256').update(`${uidHash}:${locationId}`).digest('hex').slice(0, 20);
}

function avg(...nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function ts(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return Timestamp.fromDate(d);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function generateAddress(brandSlug, cityName) {
  const streets = STREETS[cityName] ?? ['Main St'];
  const hash = createHash('md5').update(`${brandSlug}::${cityName}`).digest('hex');
  const streetIdx = parseInt(hash.slice(0, 2), 16) % streets.length;
  const num = 100 + (parseInt(hash.slice(2, 6), 16) % 9000);
  return `${num} ${streets[streetIdx]}`;
}

function generateGeoPoint(city, brandSlug) {
  const hash = createHash('md5').update(`geo::${brandSlug}::${city.name}`).digest('hex');
  const latOff = (parseInt(hash.slice(0, 4), 16) / 65535 - 0.5) * 0.012;
  const lngOff = (parseInt(hash.slice(4, 8), 16) / 65535 - 0.5) * 0.012;
  return { latitude: city.lat + latOff, longitude: city.lng + lngOff };
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function generateRatings(base) {
  const v = () => clamp(base + (Math.random() * 2.5 - 1.25), 1, 5);
  return {
    overall:    clamp(base + (Math.random() * 1.5 - 0.75), 1, 5),
    management: v(),
    pay:        v(),
    worklife:   v(),
    breaks:     v(),
    recommend:  clamp(base + (Math.random() * 2.0 - 1.0), 1, 5),
  };
}

// ---------------------------------------------------------------------------
// AutoBatch — flushes at 490 ops; commits in parallel groups for speed
// ---------------------------------------------------------------------------
class AutoBatch {
  constructor() {
    this._current = db.batch();
    this._batches = [this._current];
    this._count = 0;
  }

  set(ref, data) {
    if (this._count >= 490) {
      this._current = db.batch();
      this._batches.push(this._current);
      this._count = 0;
    }
    this._current.set(ref, data);
    this._count++;
  }

  get batchCount() { return this._batches.length; }

  async commitAll() {
    const groups = chunkArray(this._batches, 10);
    let done = 0;
    for (const group of groups) {
      await Promise.all(group.map((b) => b.commit()));
      done += group.length;
      process.stdout.write(`\r  committing… ${done}/${this._batches.length} batches`);
    }
    process.stdout.write('\n');
  }
}

// ---------------------------------------------------------------------------
// South Jersey cities (medium + heavy)
// ---------------------------------------------------------------------------
const CITIES_SJ = [
  { name: 'Cherry Hill',  zip: '08002', lat: 39.9225, lng: -75.0164 }, // 0
  { name: 'Deptford',     zip: '08096', lat: 39.8239, lng: -75.0956 }, // 1
  { name: 'Glassboro',    zip: '08028', lat: 39.7020, lng: -75.1137 }, // 2
  { name: 'Sicklerville', zip: '08081', lat: 39.7482, lng: -74.9882 }, // 3
  { name: 'Marlton',      zip: '08053', lat: 39.8931, lng: -74.9215 }, // 4
  { name: 'Moorestown',   zip: '08057', lat: 39.9707, lng: -74.9488 }, // 5
  { name: 'Voorhees',     zip: '08043', lat: 39.8551, lng: -74.9588 }, // 6
  { name: 'Turnersville', zip: '08012', lat: 39.7681, lng: -75.0609 }, // 7
  { name: 'Sewell',       zip: '08080', lat: 39.7520, lng: -75.0889 }, // 8
  { name: 'Blackwood',    zip: '08012', lat: 39.7985, lng: -75.0686 }, // 9
  { name: 'Collingswood', zip: '08108', lat: 39.9176, lng: -75.0704 }, // 10
  { name: 'Bellmawr',     zip: '08031', lat: 39.8679, lng: -75.0965 }, // 11
  { name: 'Woodbury',     zip: '08096', lat: 39.8376, lng: -75.1527 }, // 12
  { name: 'Pennsauken',   zip: '08109', lat: 39.9718, lng: -75.0357 }, // 13
  { name: 'Mount Laurel', zip: '08054', lat: 39.9451, lng: -74.9092 }, // 14
];

// Extra cities added for heavy profile
const CITIES_EXTRA = [
  // More South Jersey
  { name: 'Haddonfield',    zip: '08033', lat: 39.8984, lng: -75.0374 },
  { name: 'Medford',        zip: '08055', lat: 39.8695, lng: -74.8243 },
  { name: 'Vineland',       zip: '08360', lat: 39.4860, lng: -75.0254 },
  { name: 'Millville',      zip: '08332', lat: 39.4015, lng: -75.0571 },
  { name: 'Bridgeton',      zip: '08302', lat: 39.4276, lng: -75.2346 },
  { name: 'Pitman',         zip: '08071', lat: 39.7323, lng: -75.1316 },
  { name: 'Evesham',        zip: '08053', lat: 39.9173, lng: -74.8693 },
  { name: 'Cinnaminson',    zip: '08077', lat: 40.0026, lng: -74.9921 },
  { name: 'Delran',         zip: '08075', lat: 40.0126, lng: -74.9457 },
  { name: 'Lumberton',      zip: '08048', lat: 39.9637, lng: -74.8065 },
  { name: 'Mount Holly',    zip: '08060', lat: 39.9934, lng: -74.7893 },
  { name: 'Willingboro',    zip: '08046', lat: 40.0304, lng: -74.8916 },
  { name: 'Burlington',     zip: '08016', lat: 40.0723, lng: -74.8607 },
  { name: 'Bordentown',     zip: '08505', lat: 40.1440, lng: -74.7146 },
  // Central NJ
  { name: 'Toms River',     zip: '08753', lat: 39.9537, lng: -74.1979 },
  { name: 'Brick',          zip: '08724', lat: 40.0584, lng: -74.1132 },
  { name: 'Freehold',       zip: '07728', lat: 40.2593, lng: -74.2732 },
  { name: 'Lakewood',       zip: '08701', lat: 40.0979, lng: -74.2179 },
  { name: 'Jackson',        zip: '08527', lat: 40.1007, lng: -74.3568 },
  { name: 'Howell',         zip: '07731', lat: 40.1751, lng: -74.2023 },
  { name: 'Edison',         zip: '08817', lat: 40.5187, lng: -74.4121 },
  { name: 'New Brunswick',  zip: '08901', lat: 40.4862, lng: -74.4518 },
  { name: 'Piscataway',     zip: '08854', lat: 40.4990, lng: -74.3996 },
  { name: 'Woodbridge',     zip: '07095', lat: 40.5573, lng: -74.2846 },
  { name: 'Old Bridge',     zip: '08857', lat: 40.4151, lng: -74.2474 },
  { name: 'Hamilton',       zip: '08619', lat: 40.2260, lng: -74.6819 },
  { name: 'Trenton',        zip: '08608', lat: 40.2171, lng: -74.7429 },
  { name: 'Ewing',          zip: '08638', lat: 40.2690, lng: -74.7929 },
  { name: 'Marlboro',       zip: '07746', lat: 40.3134, lng: -74.2629 },
  { name: 'Barnegat',       zip: '08005', lat: 39.7568, lng: -74.2246 },
  // North NJ
  { name: 'Paramus',        zip: '07652', lat: 40.9440, lng: -74.0707 },
  { name: 'Hackensack',     zip: '07601', lat: 40.8859, lng: -74.0435 },
  { name: 'Wayne',          zip: '07470', lat: 40.9512, lng: -74.2418 },
  { name: 'Clifton',        zip: '07011', lat: 40.8584, lng: -74.1638 },
  { name: 'Paterson',       zip: '07501', lat: 40.9176, lng: -74.1719 },
  { name: 'Passaic',        zip: '07055', lat: 40.8568, lng: -74.1287 },
  { name: 'Bloomfield',     zip: '07003', lat: 40.8065, lng: -74.1887 },
  { name: 'East Orange',    zip: '07017', lat: 40.7676, lng: -74.2049 },
  { name: 'Newark',         zip: '07102', lat: 40.7357, lng: -74.1724 },
  { name: 'Elizabeth',      zip: '07201', lat: 40.6640, lng: -74.2107 },
  { name: 'Linden',         zip: '07036', lat: 40.6220, lng: -74.2446 },
];

// Active city list depends on profile
const CITIES = PROFILE === 'heavy' ? [...CITIES_SJ, ...CITIES_EXTRA] : CITIES_SJ;

// ---------------------------------------------------------------------------
// Street names per city
// ---------------------------------------------------------------------------
const STREETS = {
  // South Jersey
  'Cherry Hill':  ['Route 70 W', 'Marlton Pike E', 'Haddonfield Rd', 'Kings Hwy N', 'Route 38 E'],
  'Deptford':     ['Deptford Center Rd', 'Clements Bridge Rd', 'Sewell Rd', 'Hurffville-Cross Keys Rd'],
  'Glassboro':    ['Delsea Dr', 'Main St', 'High St', 'Mullica Hill Rd'],
  'Sicklerville': ['Berlin Rd', 'Sicklerville Rd', 'Cross Keys Rd', 'Williamstown Rd'],
  'Marlton':      ['Route 73 N', 'Marlton Pike', 'Tomlinson Mill Rd', 'Route 70'],
  'Moorestown':   ['Route 38 W', 'Lenola Rd', 'Hartford Rd', 'Main St'],
  'Voorhees':     ['Haddonfield-Berlin Rd', 'Burnt Mill Rd', 'White Horse Rd', 'Route 30'],
  'Turnersville': ['Black Horse Pike', 'Sewell Rd', 'Fries Mill Rd', 'Tuckahoe Rd'],
  'Sewell':       ['Mantua Pike', 'Woodbury-Glassboro Rd', 'Cedar Hollow Rd'],
  'Blackwood':    ['Black Horse Pike', 'Glassboro Rd', 'Route 42'],
  'Collingswood': ['Haddon Ave', 'White Horse Pike', 'Cuthbert Blvd'],
  'Bellmawr':     ['Benigno Blvd', 'Black Horse Pike', 'Creek Rd', 'Route 42'],
  'Woodbury':     ['Broad St', 'Cooper St', 'Route 45', 'Woodbury-Glassboro Rd'],
  'Pennsauken':   ['Route 130', 'Cove Rd', 'Merchantville Ave', 'Haddon Ave'],
  'Mount Laurel': ['Route 38', 'Centerton Rd', 'Briggs Rd', 'Ark Rd'],
  // More South Jersey
  'Haddonfield':  ['Kings Hwy', 'Haddon Ave', 'Ellis St'],
  'Medford':      ['Route 70', 'Taunton Blvd', 'Stokes Rd'],
  'Vineland':     ['Route 9 N', 'Landis Ave', 'Delsea Dr'],
  'Millville':    ['High St', 'Route 49', 'Wade Blvd'],
  'Bridgeton':    ['Irving Ave', 'Route 49', 'Atlantic St'],
  'Pitman':       ['Broadway', 'Route 553', 'Holly Ave'],
  'Evesham':      ['Route 73', 'Marlton Pike', 'Greentree Rd'],
  'Cinnaminson':  ['Route 130', 'Riverton Rd', 'Taylors Ln'],
  'Delran':       ['Route 130', 'Hartford Rd', 'Cooperstown Rd'],
  'Lumberton':    ['Route 38', 'Hainesport-Mt Holly Rd', 'Marne Hwy'],
  'Mount Holly':  ['Route 38', 'High St', 'Madison Ave'],
  'Willingboro':  ['Route 130', 'Burlington-Mt Holly Rd', 'John F Kennedy Way'],
  'Burlington':   ['Route 130', 'High St', 'Broad St'],
  'Bordentown':   ['Route 130', 'Farnsworth Ave', 'Route 206'],
  // Central NJ
  'Toms River':   ['Route 37', 'Hooper Ave', 'Fischer Blvd'],
  'Brick':        ['Route 70', 'Chambers Bridge Rd', 'Brick Blvd'],
  'Freehold':     ['Route 9', 'Route 33', 'Throckmorton St'],
  'Lakewood':     ['Route 9', 'Route 70', 'New Hampshire Ave'],
  'Jackson':      ['Route 571', 'Lakewood-Allenwood Rd', 'Toms River Rd'],
  'Howell':       ['Route 9', 'Aldrich Rd', 'Ramtown-Greenville Rd'],
  'Edison':       ['Route 1', 'Raritan Ave', 'Plainfield Ave'],
  'New Brunswick':['Route 1', 'Albany St', 'George St'],
  'Piscataway':   ['Stelton Rd', 'New Durham Rd', 'Centennial Ave'],
  'Woodbridge':   ['Route 1', 'Main St', 'Green St'],
  'Old Bridge':   ['Route 9', 'Route 18', 'Englishtown Rd'],
  'Hamilton':     ['Route 33', 'Klockner Rd', 'Nottingham Way'],
  'Trenton':      ['Route 1', 'Broad St', 'Hamilton Ave'],
  'Ewing':        ['Route 31', 'Parkway Ave', 'Olden Ave'],
  'Marlboro':     ['Route 9', 'Route 79', 'Tennent Rd'],
  'Barnegat':     ['Route 9', 'West Bay Ave', 'Barnegat Blvd'],
  // North NJ
  'Paramus':      ['Route 4', 'Route 17', 'Forest Ave'],
  'Hackensack':   ['Main St', 'Route 4', 'Passaic St'],
  'Wayne':        ['Route 23', 'Hamburg Tpke', 'Ratzer Rd'],
  'Clifton':      ['Route 3', 'Main Ave', 'Van Houten Ave'],
  'Paterson':     ['Market St', 'Main St', 'Broadway'],
  'Passaic':      ['Main Ave', 'Passaic Ave', 'Monroe St'],
  'Bloomfield':   ['Broad St', 'Franklin St', 'Bloomfield Ave'],
  'East Orange':  ['Central Ave', 'Main St', 'Springdale Ave'],
  'Newark':       ['Broad St', 'Market St', 'McCarter Hwy'],
  'Elizabeth':    ['Route 1', 'Broad St', 'Elizabeth Ave'],
  'Linden':       ['Route 1', 'Wood Ave', 'Elizabeth Ave'],
};

// ---------------------------------------------------------------------------
// Brands — cityIndices are for the 15-city MEDIUM set (indices 0–14)
// Heavy mode overrides these to all cities automatically
// ---------------------------------------------------------------------------
const BRANDS = [
  // ── Food service ──────────────────────────────────────────────────────────
  { name: "McDonald's",      slug: 'mcdonalds',    category: 'food service', payRange: [12.5, 14.5],
    cityIndices: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14] },
  { name: 'Wawa',            slug: 'wawa',         category: 'food service', payRange: [14.0, 16.0],
    cityIndices: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14] },
  { name: "Dunkin'",         slug: 'dunkin',       category: 'food service', payRange: [12.0, 14.5],
    cityIndices: [0,1,2,3,4,5,6,9,10,11,12,14] },
  { name: 'Burger King',     slug: 'burger-king',  category: 'food service', payRange: [12.0, 14.0],
    cityIndices: [0,1,2,3,4,6,7,8,9,13] },
  { name: 'Chick-fil-A',     slug: 'chick-fil-a',  category: 'food service', payRange: [14.0, 16.5],
    cityIndices: [0,1,4,5,6,14] },
  { name: "Wendy's",         slug: 'wendys',       category: 'food service', payRange: [12.0, 14.0],
    cityIndices: [0,1,2,3,7,8,9,11,12] },
  { name: 'Panera Bread',    slug: 'panera',       category: 'food service', payRange: [13.5, 16.0],
    cityIndices: [0,1,4,5,6,14] },
  { name: 'Chipotle',        slug: 'chipotle',     category: 'food service', payRange: [14.0, 16.5],
    cityIndices: [0,1,4,5,6,14] },
  { name: 'Taco Bell',       slug: 'taco-bell',    category: 'food service', payRange: [12.5, 14.5],
    cityIndices: [0,1,2,3,4,7,8,9,13] },
  { name: "Domino's",        slug: 'dominos',      category: 'food service', payRange: [12.0, 15.0],
    cityIndices: [0,1,2,3,5,7,9,11,12,13] },
  { name: "Jersey Mike's",   slug: 'jersey-mikes', category: 'food service', payRange: [12.5, 14.5],
    cityIndices: [0,1,4,5,6,14] },
  { name: 'Popeyes',         slug: 'popeyes',      category: 'food service', payRange: [12.0, 14.0],
    cityIndices: [0,1,3,7,11,13] },
  { name: 'Five Guys',       slug: 'five-guys',    category: 'food service', payRange: [13.5, 16.0],
    cityIndices: [0,1,4,6] },
  { name: 'Starbucks',       slug: 'starbucks',    category: 'food service', payRange: [14.5, 17.0],
    cityIndices: [0,1,4,5,6,14] },
  // ── Retail ────────────────────────────────────────────────────────────────
  { name: 'Target',          slug: 'target',       category: 'retail', payRange: [15.0, 17.0],
    cityIndices: [0,1,4,5,6,7,14] },
  { name: 'Walmart',         slug: 'walmart',      category: 'retail', payRange: [14.0, 16.0],
    cityIndices: [0,1,3,7,8,9,11,12,13] },
  { name: 'ShopRite',        slug: 'shoprite',     category: 'retail', payRange: [13.0, 16.0],
    cityIndices: [0,1,2,3,4,6,7,9,10,12] },
  { name: 'ALDI',            slug: 'aldi',         category: 'retail', payRange: [14.5, 16.5],
    cityIndices: [0,1,2,3,4,6,7,8,9,11] },
  { name: 'CVS Pharmacy',    slug: 'cvs',          category: 'retail', payRange: [13.0, 15.5],
    cityIndices: [0,1,2,3,4,5,6,7,8,9,10,11,14] },
  { name: 'Walgreens',       slug: 'walgreens',    category: 'retail', payRange: [13.0, 15.5],
    cityIndices: [0,1,3,4,5,6,9,10,11,14] },
  { name: 'Dollar Tree',     slug: 'dollar-tree',  category: 'retail', payRange: [12.0, 13.5],
    cityIndices: [0,1,2,3,4,6,7,8,9,10,12,13] },
  { name: 'TJ Maxx',         slug: 'tj-maxx',      category: 'retail', payRange: [13.5, 15.5],
    cityIndices: [0,1,4,5,6,14] },
  { name: 'Burlington',      slug: 'burlington',   category: 'retail', payRange: [13.5, 15.5],
    cityIndices: [0,1,4,7,13] },
  { name: 'HomeGoods',       slug: 'homegoods',    category: 'retail', payRange: [13.5, 15.5],
    cityIndices: [0,1,4,6] },
  { name: 'Ross Dress for Less', slug: 'ross',     category: 'retail', payRange: [13.0, 15.0],
    cityIndices: [0,1,3,7,8] },
  { name: "Kohl's",          slug: 'kohls',        category: 'retail', payRange: [13.5, 15.5],
    cityIndices: [0,1,4,5,6,7,14] },
  { name: "Lowe's",          slug: 'lowes',        category: 'retail', payRange: [14.0, 17.0],
    cityIndices: [0,1,4,7,14] },
  { name: 'Home Depot',      slug: 'home-depot',   category: 'retail', payRange: [14.0, 17.0],
    cityIndices: [0,1,4,7,13,14] },
  // ── Warehouse ─────────────────────────────────────────────────────────────
  { name: 'Amazon Fulfillment Center', slug: 'amazon-fc', category: 'warehouse', payRange: [19.0, 21.5],
    cityIndices: [1,11,13] },
  { name: 'UPS Supply Chain', slug: 'ups',         category: 'warehouse', payRange: [17.0, 20.0],
    cityIndices: [0,1,11] },
  { name: 'FedEx Ground',    slug: 'fedex',        category: 'warehouse', payRange: [17.0, 19.5],
    cityIndices: [0,11,13] },
  // ── Healthcare ────────────────────────────────────────────────────────────
  { name: 'Virtua Health',   slug: 'virtua',       category: 'healthcare', payRange: [16.0, 22.0],
    cityIndices: [0,1,6,14] },
  { name: 'RWJBarnabas Health', slug: 'rwjbarnabas', category: 'healthcare', payRange: [16.0, 22.0],
    cityIndices: [0,1,11,13] },
  { name: 'Jefferson Health', slug: 'jefferson',   category: 'healthcare', payRange: [16.0, 22.0],
    cityIndices: [0,10,11] },
  // ── Other ─────────────────────────────────────────────────────────────────
  { name: 'AMC Theaters',    slug: 'amc',          category: 'entertainment', payRange: [12.5, 14.5],
    cityIndices: [0,1,4] },
  { name: 'Planet Fitness',  slug: 'planet-fitness', category: 'fitness', payRange: [13.0, 15.0],
    cityIndices: [0,1,2,4,6,7,9] },
];

// ---------------------------------------------------------------------------
// Ghost users
// ---------------------------------------------------------------------------
const GHOST_UIDS = Array.from({ length: CONFIG.ghostCount }, (_, i) =>
  `ghost-seed-${String(i + 1).padStart(3, '0')}`,
);

// ---------------------------------------------------------------------------
// Review body templates
// ---------------------------------------------------------------------------
const REVIEW_BODIES = {
  'food service': [
    "Fast paced almost all the time. Rush hours are brutal — management needs to staff better.",
    "Good first job. The crew made it bearable, otherwise I'd have left after week one.",
    "They treat you like a number. When it's slow they send you home, when it's busy they act like you owe them your life.",
    "Management is really hit or miss here. Had one great shift lead and two awful ones.",
    "Breaks are a joke. You're lucky to get 10 minutes before someone needs you back on the line.",
    "Honestly not bad for what it is. Pay is okay, they work with your schedule if you ask ahead.",
    "The overnight crew is solid but day shift management is inconsistent. Had my hours cut twice out of nowhere.",
    "Clean store, decent coworkers. The job itself is fine — it's the scheduling that drives you crazy.",
    "Paid on time, breaks were respected, manager actually came in on her days off when we were short. Rare.",
    "Turnover is insane for a reason. Nobody lasts here longer than 6 months because they work you like a machine.",
    "Good for extra cash but don't expect a career. They promoted from within which I respected.",
    "Weekend rushes are something else. But the team usually pulls together. Pay could be better.",
    "They hire a lot of people and cut hours in the slow season without warning. Be ready for that.",
    "Schedule flexibility is the one thing they get right. Easy to swap shifts with coworkers.",
  ],
  'retail': [
    "Typical retail. Long shifts on your feet, managers playing favorites. Nothing special.",
    "Holiday season was brutal. They hire temps and then cut regular staff hours to compensate.",
    "Surprisingly good breaks policy here — they actually enforce it. Rare for retail.",
    "Hours get cut randomly with no warning. Had a bill to pay and they gave me 12 hours that week.",
    "The team is cool and the store stays clean. Pay is bottom of the barrel for what they ask.",
    "Good starting point. Learned how to work with all kinds of people. Wouldn't do it forever though.",
    "District management is totally out of touch. Store-level leads are doing their best with limited staff.",
    "They're flexible with scheduling if you tell them upfront. That alone makes it better than most places.",
    "Watched someone get written up for taking a bathroom break during a rush. That tells you everything.",
    "Inventory nights are the worst. They call people in last minute and act offended if you say no.",
    "Union makes a difference here. At least you have some protection. Without it this place would be chaos.",
    "The job is what you make it. Some departments treat you well, others are a total mess.",
    "Got good at customer service fast. Management recognized effort which was nice.",
    "They ask a lot for what they pay. But consistent hours and a clean environment keep it tolerable.",
  ],
  'warehouse': [
    "Pay is the only reason anyone stays. Rate quotas are brutal — every second is tracked.",
    "10-hour shifts on your feet. The overtime adds up but your body pays for it.",
    "Safety training is legit. They take it seriously which is more than I expected.",
    "Team leads on my line were solid but upper management is completely disconnected from the floor.",
    "Good money but the turnover tells you something. Most people don't make it past 90 days.",
    "Rate tracking is constant. You feel like a robot, not a person. The pay is hard to beat though.",
    "A/C in summer and heat in winter. At least they keep the building climate controlled.",
    "Bathroom break policy is genuinely stressful. You learn to time everything around production targets.",
    "Night shifts pay more and it's quieter. Worth it if you can adjust your sleep schedule.",
    "Good temporary job if you need cash fast. I wouldn't call it a career path.",
    "Onboarding is thorough. Management is less so once you're past your 90 days.",
    "The work itself is repetitive but straightforward. Just don't expect them to remember your name.",
  ],
  'healthcare': [
    "Long shifts, short breaks. Management is decent but you're always understaffed.",
    "They ask a lot for what they pay. The work is meaningful but the stress doesn't match the salary.",
    "Good training program. They actually invest in new hires which I appreciated.",
    "Scheduling is a nightmare. Last-minute changes are constant and they expect you to just deal.",
    "The patients and coworkers make it worth it. Administration is another story.",
    "Fair pay for the area. Benefits are decent if you're full-time. Part-time gets very little.",
    "Emotionally draining work. Management needs to do more to support staff during hard shifts.",
    "Hours are steady and pay is competitive for the region. Benefits take time to kick in.",
    "Team leads are knowledgeable and will actually help you. Makes a real difference day to day.",
    "High turnover because management doesn't listen to frontline staff. Same issues every quarter.",
    "They talk about work-life balance a lot. They practice it less than they preach.",
    "Good coworkers save this place. Without them it would be miserable.",
  ],
  'entertainment': [
    "Chill job for the most part. Weekend crowds can get wild but the team handles it.",
    "Good first job for students. Very flexible scheduling around classes.",
    "They promote from within which is actually nice to see.",
    "Management is young and not always consistent. Pay is low but you know what you're signing up for.",
    "Fun environment when it's not busy. Slow nights drag but it's not hard labor.",
    "Free perks make it worth it for a part-time gig.",
  ],
  'fitness': [
    "Laid back and low pressure. Mostly answering questions and keeping the floor clean.",
    "Good if you want to stay active on the job. Management is hands-off — both good and bad.",
    "Early morning shifts are dead quiet. Perfect if you want a low-stress environment.",
    "Members can be entitled but the regular crowd is mostly fine.",
    "Free membership is a real perk. Made the low pay sting less.",
    "Small team, you get to know everyone. Easy place to work if you're self-motivated.",
  ],
  default: [
    "Pretty chill job honestly. Not what I planned to do but it pays the bills.",
    "Management was decent. Nothing too crazy. Better than my last place.",
    "They're flexible if you ask for schedule changes early.",
    "Good coworkers, mediocre pay. The usual.",
    "Would recommend if you need steady hours. Just don't expect much more than that.",
    "Some days are better than others. Management could communicate more but it's manageable.",
    "Took forever to get a raise. Had to ask twice. Once I did, they made it right.",
    "Breaks are actually respected here. That shouldn't be rare but somehow it is.",
  ],
};

// ---------------------------------------------------------------------------
// Generate location list
// Heavy: every brand × every city. Medium: brand.cityIndices × CITIES_SJ.
// ---------------------------------------------------------------------------
const ALL_CITY_INDICES = CITIES.map((_, i) => i);

const LOCATIONS = [];
for (const brand of BRANDS) {
  const cityIndices = PROFILE === 'heavy' ? ALL_CITY_INDICES : brand.cityIndices;
  for (const ci of cityIndices) {
    const city     = CITIES[ci];
    const citySlug = city.name.toLowerCase().replace(/\s+/g, '-');
    LOCATIONS.push({
      id:           `${brand.slug}-${citySlug}`,
      company_name: brand.name,
      address:      generateAddress(brand.slug, city.name),
      city:         city.name,
      zip:          city.zip,
      category:     brand.category,
      geo_point:    generateGeoPoint(city, brand.slug),
      payRange:     brand.payRange,
    });
  }
}

// ---------------------------------------------------------------------------
// Generate review assignments
// ---------------------------------------------------------------------------
const REVIEW_PLAN = [];
const [minR, maxR] = CONFIG.reviewRange;

for (const loc of LOCATIONS) {
  const count      = randInt(minR, maxR);
  const baseRating = randFloat(1.8, 4.6);
  const bodies     = REVIEW_BODIES[loc.category] ?? REVIEW_BODIES.default;
  const ghosts     = shuffle(GHOST_UIDS).slice(0, count);

  for (const uid of ghosts) {
    REVIEW_PLAN.push({
      locationId:    loc.id,
      uid,
      ratings:       generateRatings(baseRating),
      pay_rate:      Math.random() < 0.78 ? randFloat(loc.payRange[0], loc.payRange[1]) : null,
      tenure_months: Math.random() < 0.73 ? randInt(1, 36) : null,
      body:          Math.random() < 0.68 ? pick(bodies) : null,
      daysAgo:       Math.max(1, Math.floor(Math.pow(Math.random(), 2) * 730)),
      helpful_count: randInt(0, 45),
    });
  }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------
async function clearExistingData() {
  console.log('  🧹  Clearing existing Firestore data…');

  const urSnap = await db.collection('user_reviews').get();
  for (const chunk of chunkArray(urSnap.docs, 490)) {
    const b = db.batch();
    chunk.forEach((d) => b.delete(d.ref));
    await b.commit();
  }

  const locSnap = await db.collection('locations').get();
  await Promise.all(
    locSnap.docs.map(async (locDoc) => {
      const revSnap = await locDoc.ref.collection('reviews').get();
      for (const chunk of chunkArray(revSnap.docs, 490)) {
        const b = db.batch();
        chunk.forEach((d) => b.delete(d.ref));
        await b.commit();
      }
      await locDoc.ref.delete();
    }),
  );

  console.log('  ✓  Cleared\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function seed() {
  console.log(`🌱  Profile: ${PROFILE.toUpperCase()}`);
  console.log(`    ${LOCATIONS.length} locations · ~${REVIEW_PLAN.length} reviews · ${CONFIG.ghostCount} ghost users\n`);

  // 1. Demo auth user
  let demoUid;
  try {
    const existing = await auth.getUserByEmail('demo@shifttea.dev');
    await auth.deleteUser(existing.uid);
    console.log('  ↺  Removed existing demo user');
  } catch { /* didn't exist */ }

  const demoUser = await auth.createUser({
    email:         'demo@shifttea.dev',
    password:      'ShiftTea123!',
    emailVerified: true,
    displayName:   'Demo User',
  });
  demoUid = demoUser.uid;
  console.log(`  ✓  Demo user  uid=${demoUid}`);
  console.log(`     email: demo@shifttea.dev  /  password: ShiftTea123!\n`);

  // 2. Wipe old data
  await clearExistingData();

  // 3. Index reviews by location
  const reviewsByLoc = {};
  for (const loc of LOCATIONS) reviewsByLoc[loc.id] = [];
  for (const r of REVIEW_PLAN)  reviewsByLoc[r.locationId].push(r);

  // 4. Queue all writes
  const batch = new AutoBatch();
  let totalReviews = 0;
  let locsDone = 0;

  for (const loc of LOCATIONS) {
    const locReviews = reviewsByLoc[loc.id];
    const count      = locReviews.length;

    const fields = ['overall', 'management', 'pay', 'worklife', 'breaks', 'recommend'];
    const avgs   = {};
    for (const f of fields) avgs[f] = avg(...locReviews.map((r) => r.ratings[f]));

    const payRates = locReviews.filter((r) => r.pay_rate).map((r) => r.pay_rate);

    const locRef = db.collection('locations').doc(loc.id);
    batch.set(locRef, {
      location_id:        loc.id,
      company_name:       loc.company_name,
      company_name_lower: loc.company_name.toLowerCase(),
      address:            loc.address,
      city:               loc.city,
      zip:                loc.zip,
      category:           loc.category,
      geo_point:          loc.geo_point,
      review_count:       count,
      avg_rating:         avgs.overall,
      avg_management:     avgs.management,
      avg_pay:            avgs.pay,
      avg_worklife:       avgs.worklife,
      avg_breaks:         avgs.breaks,
      avg_recommend:      avgs.recommend,
      ...(payRates.length > 0 && {
        min_pay: Math.min(...payRates),
        max_pay: Math.max(...payRates),
      }),
      created_at: ts(randInt(30, 180)),
      created_by: 'seed',
    });

    for (const r of locReviews) {
      const uidHash = hashUid(r.uid);
      const rid     = deterministicReviewId(uidHash, loc.id);

      batch.set(locRef.collection('reviews').doc(rid), {
        uid_hash:          uidHash,
        created_at:        ts(r.daysAgo),
        rating_overall:    r.ratings.overall,
        rating_management: r.ratings.management,
        rating_pay:        r.ratings.pay,
        rating_worklife:   r.ratings.worklife,
        rating_breaks:     r.ratings.breaks,
        rating_recommend:  r.ratings.recommend,
        company_name:      loc.company_name,
        city:              loc.city,
        location_id:       loc.id,
        helpful_count:     Number(r.helpful_count ?? 0),
        nsfw:              false,
        ...(r.pay_rate      && { pay_rate:      r.pay_rate }),
        ...(r.tenure_months && { tenure_months: r.tenure_months }),
        ...(r.body          && { body:          r.body }),
      });

      batch.set(db.collection('user_reviews').doc(`${uidHash}_${loc.id}`), {
        uid_hash:    uidHash,
        location_id: loc.id,
        review_id:   rid,
        created_at:  ts(r.daysAgo),
      });

      totalReviews++;
    }

    locsDone++;
    if (locsDone % 100 === 0 || locsDone === LOCATIONS.length) {
      process.stdout.write(`\r  queuing… ${locsDone}/${LOCATIONS.length} locations (${totalReviews} reviews)`);
    }
  }
  process.stdout.write('\n');

  // 5. Demo user doc
  batch.set(db.collection('users').doc(demoUid), {
    uid:           demoUid,
    email:         'demo@shifttea.dev',
    auth_provider: 'email',
    uid_hash:      hashUid(demoUid),
    review_count:  0,
    my_reviews:    [],
    created_at:    ts(60),
  });

  // 6. App stats
  batch.set(db.collection('app_stats').doc('global'), {
    total_reviews:   totalReviews,
    total_locations: LOCATIONS.length,
    updated_at:      ts(0),
  });

  // 7. Commit
  console.log(`\n  ✍️  Committing ${batch.batchCount} batches (in parallel groups of 10)…`);
  await batch.commitAll();

  console.log(`\n✅  Done — ${LOCATIONS.length} locations, ${totalReviews} reviews\n`);
  console.log('   Firestore UI → http://localhost:4000/firestore');
  console.log('   Auth UI      → http://localhost:4000/auth\n');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
