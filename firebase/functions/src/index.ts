import { setGlobalOptions } from 'firebase-functions';

setGlobalOptions({ maxInstances: 10, region: 'us-central1' });

export { submitReview } from './submitReview.js';
export { getUserReviews } from './getUserReviews.js';
export { placesProxy } from './placesProxy.js';
export { toggleReviewHelpful } from './toggleReviewHelpful.js';
export { getHelpfulVotesForLocation } from './getHelpfulVotesForLocation.js';
export { ensureLocationFromPlace } from './ensureLocationFromPlace.js';
export { matchCustomWorkplace } from './matchCustomWorkplace.js';
