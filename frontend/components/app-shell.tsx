'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { Role } from '@/lib/types';
import { useToast } from './toast';
import { BrandLogo, CreditSeaLoader, LoadingScreen, Spinner } from './ui';

const roleLabel: Record<Role, string> = {
  ADMIN: 'Administrator',
  SALES: 'Sales executive',
  SANCTION: 'Sanction executive',
  DISBURSEMENT: 'Disbursement executive',
  COLLECTION: 'Collection executive',
  BORROWER: 'Borrower',
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    if (navigatingTo === pathname) setNavigatingTo(null);
  }, [navigatingTo, pathname]);

  if (loading || !user) return <LoadingScreen label="Loading workspace…" />;

  const isBorrower = user.role === 'BORROWER';
  const links = isBorrower
    ? [
        { href: '/borrower/apply', label: 'Application' },
        { href: '/borrower/loan', label: 'My loan' },
      ]
    : [{ href: '/dashboard', label: 'Operations dashboard' }];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success('You have been signed out.');
    } catch {
      // The local auth state is cleared even if the server cannot be reached.
      toast.info('You have been signed out locally.');
    } finally {
      router.replace('/login');
      setLoggingOut(false);
    }
  };

  const handleNavigation = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href === pathname) return;
    if (navigatingTo) {
      event.preventDefault();
      return;
    }
    setNavigatingTo(href);
  };

  const navigationPending = Boolean(navigatingTo && navigatingTo !== pathname);
  const pendingLabel = links.find((link) => link.href === navigatingTo)?.label ?? 'workspace';

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link
            href={isBorrower ? '/borrower/apply' : '/dashboard'}
            className="rounded-xl transition-opacity hover:opacity-80 focus:outline-none focus:ring-4 focus:ring-blue-100"
            aria-label="CreditSea home"
          >
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 text-right sm:flex">
              <div>
                <p className="text-sm font-bold text-ink">{user.fullName ?? user.email}</p>
                <p className="text-xs font-medium text-slate-500">{roleLabel[user.role]}</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-sm font-black text-brand ring-1 ring-inset ring-blue-100">
                {(user.fullName ?? user.email).charAt(0).toUpperCase()}
              </span>
            </div>
            <button className="secondary-button px-3 py-2 text-xs" disabled={loggingOut} onClick={handleLogout}>
              {loggingOut && <Spinner className="h-3.5 w-3.5" />}
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        </div>
      </header>
      <div className={`mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 lg:px-8 ${links.length > 1 ? 'lg:flex-row' : ''}`}>
        {links.length > 1 && (
          <aside className="lg:w-56 lg:shrink-0">
            <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">
              {links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={(event) => handleNavigation(event, link.href)}
                    aria-current={active ? 'page' : undefined}
                    aria-busy={navigatingTo === link.href}
                    className={`block whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-bold transition ${active ? 'bg-blue-50 text-brand shadow-sm ring-1 ring-inset ring-blue-100' : 'text-slate-500 hover:bg-white hover:text-ink'} ${navigatingTo && navigatingTo !== link.href ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        )}
        <main
          className={`min-w-0 flex-1 animate-in fade-in slide-in-from-bottom-2 duration-500 ${links.length === 1 ? 'mx-auto w-full max-w-6xl' : ''}`}
        >
          {navigationPending ? <CreditSeaLoader label={`Loading ${pendingLabel.toLowerCase()}…`} variant="panel" /> : children}
        </main>
      </div>
    </div>
  );
}
