import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          prefetch={false}
          href="/"
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Back to home"
        >
          <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Terms of Service</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-sm text-gray-700">
          This page is a temporary Terms of Service placeholder and will be replaced with a full legal version.
        </p>
        <p className="text-sm text-gray-700">
          By using ShiftTea, you agree to post truthful, lawful, and non-identifying content.
        </p>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>Do not include names of managers, coworkers, customers, or other individuals.</li>
          <li>Do not share personal information, including phone numbers, emails, or social handles.</li>
          <li>Do not post threats, harassment, hate speech, or illegal content.</li>
          <li>ShiftTea may remove content that violates these rules.</li>
        </ul>
        <p className="text-xs text-gray-500">Last updated: March 30, 2026</p>
      </div>
    </div>
  );
}
