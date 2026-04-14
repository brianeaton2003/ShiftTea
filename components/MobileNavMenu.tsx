'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const HEADER_OFFSET = 'calc(3.5rem + env(safe-area-inset-top, 0px))';

type Props = {
  accountLabel: string;
};

export function MobileNavMenu({ accountLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const prevBodyOverflowRef = useRef<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Keep scroll lock resilient during remounts/hot reloads.
    if (open) {
      if (prevBodyOverflowRef.current === null) {
        prevBodyOverflowRef.current = document.body.style.overflow;
      }
      document.body.style.overflow = 'hidden';
      return;
    }

    if (prevBodyOverflowRef.current !== null) {
      document.body.style.overflow = prevBodyOverflowRef.current;
      prevBodyOverflowRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (prevBodyOverflowRef.current !== null) {
        document.body.style.overflow = prevBodyOverflowRef.current;
        prevBodyOverflowRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 lg:hidden"
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {open ? (
          <svg width={24} height={24} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width={24} height={24} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  key="mobile-nav-layer"
                  className="pointer-events-none fixed inset-0 z-[200] lg:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Full-screen layer is above the header for dimming paint order, but must not steal taps from the navbar close button */}
                  <button
                    type="button"
                    aria-label="Close menu"
                    className="pointer-events-auto absolute inset-x-0 bottom-0 bg-black/25"
                    style={{ top: HEADER_OFFSET }}
                    onClick={() => setOpen(false)}
                  />
                  <motion.div
                    className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                    style={{ top: HEADER_OFFSET }}
                    initial={{ y: -16, opacity: 0.96 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -16, opacity: 0.96 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex flex-col gap-1 overflow-y-auto overscroll-contain p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                      <Link
                        prefetch={false}
                        href="/review/select-location/"
                        className="rounded-lg px-4 py-3 text-lg text-gray-900 transition-colors hover:bg-orange-50 hover:text-orange-600"
                        onClick={() => setOpen(false)}
                      >
                        Write a review
                      </Link>
                      <Link
                        prefetch={false}
                        href="/locations/"
                        className="rounded-lg px-4 py-3 text-lg text-gray-900 transition-colors hover:bg-orange-50 hover:text-orange-600"
                        onClick={() => setOpen(false)}
                      >
                        Find employers
                      </Link>
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        <Link
                          prefetch={false}
                          href="/account"
                          className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-orange-500 px-6 py-3 text-base font-semibold text-orange-500 transition-colors hover:bg-orange-500 hover:text-white"
                          onClick={() => setOpen(false)}
                        >
                          <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          {accountLabel}
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
