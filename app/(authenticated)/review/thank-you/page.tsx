import Link from 'next/link';

export default function ReviewThankYouPage() {
  return (
    <div className="mx-auto max-w-lg py-10 text-center lg:max-w-xl lg:py-16">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 lg:text-4xl">Thanks for sharing.</h1>
      <p className="mb-8 text-sm text-gray-500 lg:text-lg">
        Your anonymous review helps other workers make informed choices.
      </p>
      <Link
        prefetch={false}
        href="/locations/"
        className="inline-block rounded-full bg-orange-500 px-8 py-4 text-sm font-bold text-white transition-colors hover:bg-orange-600"
      >
        Browse locations
      </Link>
    </div>
  );
}
