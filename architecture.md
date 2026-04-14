ShiftTea Architecture (Next.js App Router Valid)

Goals
- Keep route files valid for Next App Router.
- Separate concerns cleanly across route, feature, and shared layers.
- Improve SEO with clean URLs, metadata, and structured data.
- Support mobile/tablet/desktop without creating device-specific route files.

-------------------------------------------------------------------------------
1) Recommended Folder Structure
-------------------------------------------------------------------------------

shifttea/
  app/
    layout.tsx
    page.tsx                                  # Home
    sitemap.ts
    robots.ts

    (public)/
      locations/
        page.tsx                              # Location search / listing
        [locationSlug]/
          page.tsx                            # Individual location page
          loading.tsx
      terms/
        page.tsx
      privacy/
        page.tsx
      auth/
        login/
          page.tsx
        signup/
          page.tsx

    (authenticated)/
      account/
        page.tsx
      account/
        reviews/
          page.tsx
      review/
        select-location/
          page.tsx
        new/
          page.tsx
        thank-you/
          page.tsx

  features/
    locations/
      components/
        LocationPage.mobile.tsx
        LocationPage.tablet.tsx
        LocationPage.desktop.tsx
        LocationPage.tsx                      # Variant selector wrapper
      server/
        getLocationBySlug.ts
        getLocationReviews.ts
        searchLocations.ts
      seo/
        metadata.ts
        jsonld.ts
      utils/
        slug.ts

    reviews/
      components/
      server/
      seo/
      utils/

    account/
      components/
      server/

    auth/
      components/
      server/

  components/
    ui/                                       # Shared design system primitives
    layout/                                   # Shared layout shell components

  lib/
    firebase/
      firebase.ts
      authStore.ts
    places/
      placesService.ts
    analytics/

  constants/
    colors.ts
    launchRegion.ts

  types/
    index.ts

  utils/
    formatters.ts
    profanity.ts

Notes
- Route groups like (public) and (authenticated) do not change URL paths.
- App routes must use Next special files like page.tsx and layout.tsx.
- Avoid route files like home.mobile.tsx or review.desktop.tsx inside app/.

-------------------------------------------------------------------------------
2) Route List (Canonical URLs)
-------------------------------------------------------------------------------

Public
- /                                    Home
- /locations                           Search and browse locations
- /locations/[locationSlug]            Location detail and reviews
- /auth/login                          User login
- /auth/signup                         User signup
- /terms                               Terms of Service
- /privacy                             Privacy Policy

Authenticated
- /account                             Account overview
- /account/reviews                     User's submitted reviews
- /review/select-location              Step 1 of review flow
- /review/new                          Step 2 review form
- /review/thank-you                    Submission confirmation

Potential future routes
- /about
- /contact
- /report-content

-------------------------------------------------------------------------------
3) Device Strategy (Mobile/Tablet/Desktop)
-------------------------------------------------------------------------------

Use one canonical route per page and switch presentation in feature components.

Recommended approach
- Keep one route entry file (page.tsx) per URL.
- Keep data fetching and SEO metadata in server-side feature files.
- Use responsive CSS first for layout differences.
- Use variant components only when UX differs significantly:
  - Component.mobile.tsx
  - Component.tablet.tsx
  - Component.desktop.tsx
  - Component.tsx wrapper to choose or compose variants

Why this works
- Preserves a single URL per content page (good for SEO and analytics).
- Prevents duplicate content/canonical complexity.
- Reduces maintenance cost versus duplicating entire route files by device.

-------------------------------------------------------------------------------
4) SEO Checklist (Implementation)
-------------------------------------------------------------------------------

Routing and crawlability
- [ ] Keep one canonical URL per page (no separate mobile URLs).
- [ ] Use descriptive, stable slugs for location pages.
- [ ] Ensure /sitemap.xml is generated from sitemap.ts.
- [ ] Ensure /robots.txt is generated from robots.ts.

Metadata
- [ ] Add page-specific title and description via metadata or generateMetadata.
- [ ] Set canonical URL per route.
- [ ] Add Open Graph tags (title, description, image, url).
- [ ] Add Twitter card metadata.

Structured data
- [ ] Add JSON-LD for location pages (LocalBusiness, AggregateRating, Review).
- [ ] Validate structured data in Rich Results Test.

Content quality
- [ ] Ensure location pages contain indexable text (not only client-rendered placeholders).
- [ ] Include unique content per location (address, rating summary, recent reviews).
- [ ] Add clear headings (one H1, logical H2/H3 hierarchy).

Performance and UX
- [ ] Keep LCP low (optimize above-the-fold content and images).
- [ ] Avoid layout shift (reserve space for dynamic components).
- [ ] Keep interactive scripts lean on content-heavy pages.

Indexing controls
- [ ] Set noindex for non-content pages if needed (thank-you, internal flows).
- [ ] Block only true non-public/internal paths in robots policy.

Internal linking
- [ ] Link from home to top locations and location search.
- [ ] Link between related locations when relevant.
- [ ] Add breadcrumb navigation on location pages.

Quality checks
- [ ] Run Lighthouse for SEO and Performance on home + location pages.
- [ ] Inspect indexed HTML output in production build.
- [ ] Test canonical/OG tags with social and crawler preview tools.

-------------------------------------------------------------------------------
5) Guardrails
-------------------------------------------------------------------------------

Do
- Use app route files for routing only.
- Move business logic into features/*/server and lib/*.
- Keep shared primitives in components/ui.

Do not
- Put device-specific route files directly in app/.
- Duplicate business logic across mobile/tablet/desktop components.
- Create separate URLs for device variants of the same content.
