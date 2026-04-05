File Heirarchy

app/        -- All of the pages for the application will exist here
    home/   -- All of the pages relevant to the homepage will exist here
        home.desktop.tsx -- This is the homepage for the desktop configuration of the app
        home.mobile.tsx -- This is the homepage for the mobile configuration of the app
    location/ -- All of the pages relevant to the locations page 
        location.desktop.tsx -- Renders a location from the locations collection on desktop
        location.mobile.tsx -- Renders a location from the locations collection on mobile
    locationSearch/
        locationSearch.desktop.tsx -- Renders the location searcher on desktop
        locationSearch.mobile.tsx -- Renders the location seracher on mobile
    account/ 
        account.desktop.tsx -- Renders the logged in user's account on desktop
        account.mobile.tsx -- Renders the logged in user's account on mobile
        myReviews/
            myReviews.desktop.tsx -- Renders the logged in user's reviews on desktop
            myReviews.mobile.tsx -- Redners the logged in user's reviews on mobile
    authentication/ -- pages relevant to the authetnication process
        signUp.desktop.tsx -- renders the sign up page on desktop
        signUp.mobile.tsx -- renders the sign up page on mobile
        login.desktop.tsx -- renders the login page on desktop
        login.mobile.tsx -- renders the login page on mobile
    review/ -- pages relevant to the review process
        selectLocation.desktop.tsx -- renders review location selector on desktop
        selectLocation.mobile.tsx -- renders review location selector on mobile
        reviewForm.desktop.tsx -- renders the review form on desktop
        reviewForm.mobile.tsx -- renders the review form on mobile
        graditutde/ --pages relevant to the gratitude page
            graditude.desktop.tsx -- renders the thank you page on desktop
            graditude.mobile.tsx -- renders the thank you page on mobile
    terms/ -- pages relevant to the terms of service page
        terms.desktop.tsx -- renders the TOS page on desktop
        terms.mobile.tsx -- renders the TOS page on mobile
    
components/ -- componets used throughout the entire application
    mobile/ -- components frequenlty used on the mobile pages
    desktop/ -- components frequently used on the desktop pages

lib/
    firebase/ -- firebase related services
        authStore.ts -- handles signUp/login functions
        firebase.ts -- sets up firebase connections
    locations/
        locationSearchService.ts -- handles searching locations in the defined launch areas
        manualLocationId.ts -- generates a firebase ID for locations manually inputted
        placesService.ts -- handles functions that work directly with google places API
        workplaceMatchSerbice -- helpful functions to limit duplicate locations
    review/
        reviewService.ts -- handles functions that work with the review feature


types/
    types.ts -- defines types across the application
    

util/
    formatters.ts -- helpful formatting functions
    locationSearchHelpers.ts -- defines some constants and formulas to limit location searching
    profanity.ts -- helper functions for profanity filtering across the app
    

constants/
    colors.ts -- colors frequently used in the UI
    launchRegion.ts -- defines where we are supporting locations and reviewss
