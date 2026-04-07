import Link from 'next/link';

export default function ReviewThankYouPage() {
  return (
    <div className="text-center py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanks for sharing.</h1>
      <p className="text-sm text-gray-500 mb-6">Your anonymous review helps other workers make informed choices.</p>
      <Link prefetch={false} href="/locations/" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
        Browse locations
      </Link>
    </div>
  );
}
