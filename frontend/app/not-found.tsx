import Link from 'next/link';
import { ArrowLeft, House, SearchX } from 'lucide-react';

import { BrandLogo } from '@/components/ui';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-canvas px-5 py-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link
          href="/"
          className="rounded-xl transition-opacity hover:opacity-80 focus:outline-none focus:ring-4 focus:ring-blue-100"
          aria-label="CreditSea home"
        >
          <BrandLogo />
        </Link>
        <span className="hidden rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-brand shadow-sm sm:inline-flex">
          Loan Management System
        </span>
      </div>

      <section className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-3xl items-center justify-center py-16 text-center">
        <div>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-blue-50 text-brand ring-1 ring-inset ring-blue-100">
            <SearchX className="h-10 w-10" aria-hidden="true" />
          </div>
          <p className="mt-8 text-7xl font-black tracking-[-0.08em] text-ink md:text-8xl">404</p>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-brand">Page not found</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ink md:text-4xl">This page sailed out of view.</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-500">
            The address may be incorrect, or the page may have moved. Let us get you back to a useful place.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className="primary-button">
              <House className="h-4 w-4" />
              Go to home
            </Link>
            <Link href="/login" className="secondary-button">
              <ArrowLeft className="h-4 w-4" />
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
