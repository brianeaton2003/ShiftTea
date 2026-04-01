ShiftTea
Product Requirements Document
Version 1.0  ·  March 2026  ·  Confidential

Product	ShiftTea
Tagline	Spill the tea on your workplace. Anonymously.
Platform	Web application using NextJS and React
Launch Market	South Jersey — Cherry Hill, Deptford, Glassboro, Sicklerville
Revenue Model	Advertising (Google AdMob / AdSense)
Status	Pre-development — ideation complete

1. Product Overview
ShiftTea is a mobile-first review platform where hourly and shift workers anonymously rate their employers by location. Think RateMyProfessor, but for jobs. Workers create a free account to leave reviews. Anyone can read them — no account required.

The name has three layers of meaning: Shift (hourly work culture), Tea (spilling the truth), and Shifty (the vibe of a bad employer). The app exists to give a voice to the workers who need it most — minimum wage and hourly employees who often have no platform to warn others or hold employers accountable.

2. Problem Statement
Existing employer review platforms like Glassdoor skew heavily toward white-collar, salaried workers. They require work email verification (which hourly workers rarely have), prioritize corporate metrics like CEO approval ratings, and are desktop-first in a mobile-first world.

Hourly and shift workers — the people most vulnerable to toxic workplaces — have no trusted, accessible platform to share their experiences or warn others. When the pay is already low, a bad work environment hits harder. ShiftTea fills that gap.

3. Target Audience
Primary User
A recent job leaver — someone who just left (or was fired from) an hourly or shift job and wants to warn others about their experience. They are motivated, mobile-first, and want a fast, low-friction way to share their story anonymously.
Secondary User
A job seeker in South Jersey researching employers before applying. They want to know what it's actually like to work at a specific location — not the company's polished career page, but the real story from people who've been there.
Audience Characteristics
•	Mobile-first — smartphone is their primary or only device
•	Hourly / shift workers across retail, food service, warehouse, healthcare support
•	18–35 years old, South Jersey residents
•	Rowan University students and recent graduates (Glassboro beachhead)
•	Motivated by a recent negative experience at work

4. Goals & Success Metrics
Goal	Metric	6-Month Target
Build review density	Reviews per location	20+ reviews on top 50 South Jersey employers
Drive user signups	Registered accounts	1,000 active reviewers
Generate ad revenue	Monthly ad revenue	$500/month by month 6
Establish retention	Return visits	40% of readers return within 30 days
Word of mouth growth	Organic installs	60% of installs from referral / word of mouth

5. Features & Requirements
5.1 Review Submission (Account Required)
The core action of the app. Designed to take under 90 seconds on mobile. Workers must create an account to submit a review, but their identity is never shown publicly.

•	Search for employer by name or browse nearby locations
•	Select specific location (address-level, not just company-wide)
•	Star rating across key dimensions (see below)
•	Optional: hourly pay rate
•	Optional: length of employment
•	Optional: short written review (freeform text)
•	Anonymous submission — no name, username, or identifying info shown publicly

Star Rating Dimensions
Category	What it measures
Overall	General experience working here
Management	How management treats employees
Pay & Benefits	Fairness of pay relative to the work
Work-Life Balance	Schedule reliability, flexibility, last-minute changes
Break Policy	Whether breaks are actually given and respected
Would Recommend	Would you tell a friend to apply here?

5.2 Review Reading (No Account Required)
Anyone can browse and read reviews without signing up. This is intentional — friction kills readership, and readers become reviewers over time.

•	Browse by employer or location
•	See aggregate star ratings per category
•	Read individual written reviews
•	See optional pay and tenure data in aggregate (not per review, to protect anonymity)
•	Sort reviews by recency or rating

5.3 Employer Pages
Each physical location gets its own page — not just the company. A Wawa in Cherry Hill and a Wawa in Glassboro have separate pages with separate reviews.

•	Company name, location address, category (retail / food service / warehouse / etc.)
•	Aggregate star ratings per dimension
•	Wage range (from optional reviewer data)
•	Tenure range (from optional reviewer data)
•	All written reviews, sorted by date
•	If a location doesn't exist yet, any logged-in user can create it

5.4 Account & Authentication
Account creation is required to submit reviews. This deters spam and adds a layer of accountability without sacrificing anonymity — the reviewer's identity is never surfaced publicly.

•	Sign up via: Email + Password, Google OAuth, Apple Sign In, Phone number + SMS
•	Firebase Authentication handles all auth flows natively
•	No display name or profile is shown on submitted reviews
•	One account per phone number / email to limit abuse

5.5 Advertising
Ads are the primary and sole revenue source at launch. Ad placements are designed to feel native without disrupting the review reading experience.

•	Google AdMob on iOS and Android (banner + interstitial)
•	Google AdSense on web companion
•	Ad shown between reviews on employer pages
•	No ads on the review submission flow — friction here costs reviews
•	Future: local South Jersey business advertising (staffing agencies, trade schools)

6. Technical Stack
Layer	Technology	Rationale
Web	React	Web companion for SEO and desktop review reading. Shared logic with mobile.
Database	Firebase Firestore	Real-time, scalable NoSQL. Works seamlessly with React Native.
Authentication	Firebase Auth	Natively supports all four auth methods out of the box.
Backend Logic	Firebase Cloud Functions	Serverless functions for review validation, abuse detection, aggregation.
Ads (Mobile)	Google AdMob	Industry standard for mobile monetization. Easy Firebase integration.
Ads (Web)	Google AdSense	Standard web display advertising.
Maps / Location	Google Places API	Employer search, location lookup, and address verification.

7. Data Model (Simplified)
Users
•	uid, email, phone, auth_provider, created_at
•	No public profile — identity never exposed

Locations
•	location_id, company_name, address, city, state, zip, category, created_by, created_at
•	One document per physical address

Reviews
•	review_id, location_id, user_uid (hashed), created_at
•	ratings: { overall, management, pay, work_life_balance, breaks, recommend } — each 1–5
•	pay_rate (optional, numeric), tenure_months (optional, numeric)
•	body (optional, string, max 500 chars)
•	user_uid stored hashed — one review per user per location enforced

8. Launch Strategy
Phase 1 — South Jersey (Months 1–6)
•	Seed the app with the 50 most recognizable South Jersey employers pre-populated as location pages
•	Target Rowan University students in Glassboro as early adopters — mobile-first, have worked local jobs, motivated to share
•	Grassroots marketing: flyers in break rooms, Reddit (r/SouthJersey), local Facebook groups
•	Goal: 20+ reviews on each of the top 50 locations before any public launch announcement

Phase 2 — Greater South Jersey (Months 6–12)
•	Expand to neighboring markets: Camden County, Burlington County, Salem County
•	Introduce local business advertising — staffing agencies, trade schools, apprenticeship programs
•	Press outreach to local news (NJ.com, Courier-Post) around worker transparency angle

Phase 3 — Scale Decision (Month 12+)
•	Evaluate review density, DAU, and revenue metrics
•	If traction confirmed: expand to Philadelphia metro, then Mid-Atlantic region
•	If traction limited: double down on South Jersey density before expanding

9. Scope
In Scope — MVP
•	Anonymous employer reviews by location
•	Star ratings across 6 dimensions
•	Optional pay rate and tenure fields
•	Account creation (4 auth methods)
•	No-account review reading
•	Ad monetization (AdMob + AdSense)
•	iOS + Android + Web
•	South Jersey launch market

Out of Scope — v1
•	Community Q&A or forums
•	Employer response / claim page
•	Job listings
•	Push notifications
•	Review flagging or moderation UI (handled via Cloud Functions initially)
•	National launch

10. Risks & Mitigations
Risk	Mitigation
App Store naming conflict with existing 'MyShift' scheduling app	ShiftTea avoids this entirely. Confirm trademark availability via USPTO before filing.
Low review volume at launch (cold start problem)	Pre-seed 50 location pages. Partner with Rowan students early. Require account to write, not to read — lowers barrier to browsing.
Fake or malicious reviews	One review per user per location (enforced via hashed UID). Cloud Function flagging for suspicious patterns. Manual review queue.
Employer legal pressure to remove reviews	Reviews are opinions, protected speech. Establish clear ToS. No review removal except for ToS violations (hate speech, doxxing, false factual claims).
Ad revenue too low to sustain initially	AdMob CPMs improve with engaged, return audiences. Local advertiser direct deals (staffing, trade schools) supplement at scale.
