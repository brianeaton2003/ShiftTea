/**
 * Emulator seed script — populates Auth + Firestore with realistic South Jersey data.
 *
 * Prerequisites:
 *   firebase emulators:start   (from the firebase/ directory)
 *
 * Usage:
 *   cd firebase/functions
 *   npm run seed
 */

import { createHash } from 'crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Must be set BEFORE firebase-admin initializes
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

const app = initializeApp({ projectId: 'shifttea-dev' });
const auth = getAuth(app);
const db = getFirestore(app);

function hashUid(uid) {
  return createHash('sha256').update(uid).digest('hex');
}

function deterministicReviewId(uidHash, locationId) {
  return createHash('sha256').update(`${uidHash}:${locationId}`).digest('hex').slice(0, 20);
}

function avg(...nums) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function ts(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return Timestamp.fromDate(d);
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------
const LOCATIONS = [
  {
    id: 'wawa-cherry-hill-rt70',
    company_name: 'Wawa',
    address: '2100 Route 70 W',
    city: 'Cherry Hill',
    zip: '08002',
    category: 'food service',
    geo_point: { latitude: 39.9223, longitude: -75.0164 },
  },
  {
    id: 'shoprite-deptford',
    company_name: 'ShopRite',
    address: '1750 Deptford Center Rd',
    city: 'Deptford',
    zip: '08096',
    category: 'retail',
    geo_point: { latitude: 39.8239, longitude: -75.0956 },
  },
  {
    id: 'amazon-bellmawr',
    company_name: 'Amazon Fulfillment Center',
    address: '600 Benigno Blvd',
    city: 'Bellmawr',
    zip: '08031',
    category: 'warehouse',
    geo_point: { latitude: 39.8677, longitude: -75.0965 },
  },
  {
    id: 'mcdonalds-glassboro-delsea',
    company_name: "McDonald's",
    address: '501 Delsea Dr',
    city: 'Glassboro',
    zip: '08028',
    category: 'food service',
    geo_point: { latitude: 39.7020, longitude: -75.1137 },
  },
  {
    id: 'target-deptford',
    company_name: 'Target',
    address: '1500 Clements Bridge Rd',
    city: 'Deptford',
    zip: '08096',
    category: 'retail',
    geo_point: { latitude: 39.8198, longitude: -75.1002 },
  },
];

// ---------------------------------------------------------------------------
// Reviews — keyed by location id
// Each review: {
//   uid, ratings: {overall,management,pay,worklife,breaks,recommend},
//   pay_rate?, tenure_months?, body?, daysAgo, nsfw?, helpful_count?
// }
// ---------------------------------------------------------------------------

// Ghost UIDs (fake, never in Auth — only used to populate reviews)
const GHOST1 = 'ghost-user-001-south-jersey';
const GHOST2 = 'ghost-user-002-south-jersey';
const GHOST3 = 'ghost-user-003-south-jersey';

const REVIEWS_BY_LOCATION = {
  'wawa-cherry-hill-rt70': [
    {
      uid: '__DEMO__', // replaced at runtime with demo user uid
      ratings: { overall: 3, management: 2, pay: 3, worklife: 3, breaks: 2, recommend: 3 },
      pay_rate: 14.50,
      tenure_months: 8,
      body: "Fast paced and usually understaffed on weekends. Management is inconsistent — some shift leads are great, others disappear when it gets busy. Pay is okay for the area but nothing special.",
      daysAgo: 5,
      helpful_count: 4,
    },
    {
      uid: GHOST2,
      ratings: { overall: 4, management: 4, pay: 3, worklife: 4, breaks: 4, recommend: 4 },
      pay_rate: 15.00,
      tenure_months: 14,
      body: "Honestly not a bad gig. They're pretty flexible with scheduling if you ask ahead of time. The hoagie rush hours are brutal but the team usually pulls together.",
      daysAgo: 18,
      helpful_count: 12,
    },
    {
      uid: GHOST3,
      ratings: { overall: 5, management: 5, pay: 4, worklife: 4, breaks: 5, recommend: 5 },
      pay_rate: 15.50,
      tenure_months: 24,
      body: "Best Wawa I've worked at. Store manager actually knows your name. They've always honored my break times and are pretty upfront about raises.",
      daysAgo: 42,
      helpful_count: 33,
    },
  ],

  'shoprite-deptford': [
    {
      uid: GHOST1,
      ratings: { overall: 2, management: 1, pay: 2, worklife: 2, breaks: 2, recommend: 2 },
      pay_rate: 13.00,
      tenure_months: 5,
      body: "Department managers play favorites hard. I watched someone get written up for taking a 5-minute bathroom break during a busy shift. Are you fucking kidding me?This place can be toxic as hell when leads are in a bad mood.",
      daysAgo: 12,
      nsfw: true,
      helpful_count: 41,
    },
    {
      uid: GHOST3,
      ratings: { overall: 3, management: 3, pay: 3, worklife: 3, breaks: 3, recommend: 3 },
      pay_rate: 13.50,
      tenure_months: 11,
      body: "It's a job. Not great, not terrible. Union keeps things from getting too wild. Worth it if you need steady hours.",
      daysAgo: 30,
      helpful_count: 6,
    },
  ],

  'amazon-bellmawr': [
    {
      uid: GHOST2,
      ratings: { overall: 2, management: 2, pay: 4, worklife: 1, breaks: 2, recommend: 2 },
      pay_rate: 19.00,
      tenure_months: 3,
      body: "Pay is the only reason anyone stays. The rate quotas are brutal — they track every second of your downtime. Breaks feel like they barely exist by the time you walk to the break room and back. Burned out after 3 months.",
      daysAgo: 8,
      helpful_count: 29,
    },
    {
      uid: GHOST1,
      ratings: { overall: 3, management: 3, pay: 4, worklife: 2, breaks: 3, recommend: 3 },
      pay_rate: 19.50,
      tenure_months: 9,
      body: "Good money if you can handle the grind. A4 facility so it's not the most intense but you're on your feet all 10 hours. Some shifts are a sh*tshow but the team leads on my line were decent.",
      daysAgo: 55,
      nsfw: true,
      helpful_count: 18,
    },
  ],

  'mcdonalds-glassboro-delsea': [
    {
      uid: '__DEMO__',
      ratings: { overall: 4, management: 4, pay: 3, worklife: 4, breaks: 4, recommend: 4 },
      pay_rate: 13.50,
      tenure_months: 6,
      body: "Solid first job vibes. Manager actually cares — they worked the line with us on busy Friday nights. Rowan students get flexible scheduling which is huge.",
      daysAgo: 3,
      helpful_count: 15,
    },
    {
      uid: GHOST2,
      ratings: { overall: 3, management: 3, pay: 2, worklife: 3, breaks: 3, recommend: 3 },
      pay_rate: 12.50,
      tenure_months: 4,
      body: "Pays minimum and the lobby rush at lunch is something else. But honestly the crew made it bearable. Nothing special, nothing awful.",
      daysAgo: 22,
      helpful_count: 3,
    },
  ],

  'target-deptford': [
    {
      uid: GHOST1,
      ratings: { overall: 4, management: 4, pay: 3, worklife: 4, breaks: 5, recommend: 4 },
      pay_rate: 15.00,
      tenure_months: 16,
      body: "Target actually respects break policy, which is rare in retail. Team leads are generally professional. Pay could be better but the environment is clean and organized.",
      daysAgo: 7,
      helpful_count: 24,
    },
    {
      uid: GHOST3,
      ratings: { overall: 2, management: 2, pay: 3, worklife: 2, breaks: 3, recommend: 2 },
      pay_rate: 15.00,
      tenure_months: 3,
      body: "Seasonal hire turned into ghost shifts. They cut my hours to zero without telling me. Absolute bullsh*t communication from scheduling.",
      daysAgo: 16,
      nsfw: true,
      helpful_count: 57,
    },
  ],
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function seed() {
  console.log('🌱 Seeding emulator...\n');

  // 1. Create demo Auth user (idempotent: delete if exists, then recreate)
  let demoUid;
  try {
    const existing = await auth.getUserByEmail('demo@shifttea.dev');
    await auth.deleteUser(existing.uid);
    console.log('  ↺  Removed existing demo user');
  } catch {
    // didn't exist, that's fine
  }

  const demoUser = await auth.createUser({
    email: 'demo@shifttea.dev',
    password: 'ShiftTea123!',
    emailVerified: true,
    displayName: 'Demo User',
  });
  demoUid = demoUser.uid;
  const demoHash = hashUid(demoUid);
  console.log(`  ✓  Demo user created  uid=${demoUid}`);
  console.log(`     email: demo@shifttea.dev`);
  console.log(`     password: ShiftTea123!\n`);

  const batch = db.batch();
  let totalReviews = 0;

  const demoMyReviews = [];

  // 2. Seed each location and its reviews
  for (const loc of LOCATIONS) {
    // Ensure seed is idempotent: clear old review docs so reruns don't stack duplicates.
    const existingReviewSnap = await db.collection('locations').doc(loc.id).collection('reviews').get();
    if (!existingReviewSnap.empty) {
      const cleanup = db.batch();
      existingReviewSnap.docs.forEach((d) => cleanup.delete(d.ref));
      await cleanup.commit();
    }

    const rawReviews = REVIEWS_BY_LOCATION[loc.id] ?? [];

    // Resolve real UIDs
    const resolved = rawReviews.map((r) => ({
      ...r,
      uid: r.uid === '__DEMO__' ? demoUid : r.uid,
    }));

    // Compute aggregates
    const count = resolved.length;
    const fields = ['overall', 'management', 'pay', 'worklife', 'breaks', 'recommend'];
    const avgs = {};
    for (const f of fields) {
      avgs[f] = avg(...resolved.map((r) => r.ratings[f]));
    }

    const payRates = resolved.filter((r) => r.pay_rate).map((r) => r.pay_rate);

    // Location doc
    const locRef = db.collection('locations').doc(loc.id);
    batch.set(locRef, {
      location_id: loc.id,
      company_name: loc.company_name,
      company_name_lower: loc.company_name.toLowerCase(),
      address: loc.address,
      city: loc.city,
      zip: loc.zip,
      category: loc.category,
      geo_point: loc.geo_point,
      review_count: count,
      avg_rating: avgs.overall,
      avg_management: avgs.management,
      avg_pay: avgs.pay,
      avg_worklife: avgs.worklife,
      avg_breaks: avgs.breaks,
      avg_recommend: avgs.recommend,
      ...(payRates.length > 0 && {
        min_pay: Math.min(...payRates),
        max_pay: Math.max(...payRates),
      }),
      created_at: ts(90),
      created_by: 'seed',
    });

    // Review docs
    for (const r of resolved) {
      const uid = r.uid;
      const uidHash = hashUid(uid);
      const rid = deterministicReviewId(uidHash, loc.id);

      const reviewRef = locRef.collection('reviews').doc(rid);
      const reviewData = {
        uid_hash: uidHash,
        created_at: ts(r.daysAgo),
        rating_overall: r.ratings.overall,
        rating_management: r.ratings.management,
        rating_pay: r.ratings.pay,
        rating_worklife: r.ratings.worklife,
        rating_breaks: r.ratings.breaks,
        rating_recommend: r.ratings.recommend,
        company_name: loc.company_name,
        city: loc.city,
        location_id: loc.id,
        helpful_count: Number(r.helpful_count ?? 0),
        nsfw: Boolean(r.nsfw ?? false),
        ...(r.pay_rate && { pay_rate: r.pay_rate }),
        ...(r.tenure_months && { tenure_months: r.tenure_months }),
        ...(r.body && { body: r.body }),
      };
      batch.set(reviewRef, reviewData);

      // user_reviews sentinel (prevents duplicate reviews)
      const urRef = db.collection('user_reviews').doc(`${uidHash}_${loc.id}`);
      batch.set(urRef, {
        uid_hash: uidHash,
        location_id: loc.id,
        review_id: rid,
        created_at: ts(r.daysAgo),
      });

      // Track demo user's reviews for their user doc
      if (uid === demoUid) {
        demoMyReviews.push({ location_id: loc.id, review_id: rid, company_name: loc.company_name });
      }

      totalReviews++;
    }

    console.log(`  ✓  ${loc.company_name} (${loc.city}) — ${count} reviews`);
  }

  // 3. Demo user doc
  const userRef = db.collection('users').doc(demoUid);
  batch.set(userRef, {
    uid: demoUid,
    email: 'demo@shifttea.dev',
    auth_provider: 'email',
    uid_hash: demoHash,
    review_count: demoMyReviews.length,
    my_reviews: demoMyReviews,
    created_at: ts(60),
  });

  // 4. App stats
  const statsRef = db.collection('app_stats').doc('global');
  batch.set(statsRef, {
    total_reviews: totalReviews,
    total_locations: LOCATIONS.length,
    updated_at: ts(0),
  });

  await batch.commit();

  console.log(`\n✅ Done — ${LOCATIONS.length} locations, ${totalReviews} reviews\n`);
  console.log('   Firestore UI → http://localhost:4000/firestore');
  console.log('   Auth UI      → http://localhost:4000/auth\n');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
