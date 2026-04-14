import { FindWorkplaceForm } from '@/components/FindWorkplaceForm';

export default function ReviewSelectLocationPage() {
  return (
    <div className="lg:mx-auto lg:max-w-3xl">
      <h1 className="mb-2 text-xl font-bold text-gray-900 lg:text-3xl">Leave a review</h1>
      <p className="mb-4 text-sm text-gray-500 lg:text-base">Search for your workplace below.</p>
      <FindWorkplaceForm variant="review" />
    </div>
  );
}
