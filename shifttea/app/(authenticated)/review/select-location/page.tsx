import { FindWorkplaceForm } from '@/components/FindWorkplaceForm';

export default function ReviewSelectLocationPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Leave a review</h1>
      <p className="text-sm text-gray-400 mb-4">Search for your workplace below.</p>
      <FindWorkplaceForm variant="review" />
    </div>
  );
}
