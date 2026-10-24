'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Route-to-label mapping.
 * Add new routes here when creating new modules.
 * If a route is NOT listed, the component auto-generates a label
 * by title-casing the slug (e.g. "study-plan" → "Study Plan").
 */
const ROUTE_LABELS: Record<string, string> = {
    'daily-prelims':  'Daily Prelims',
    'daily-mains':    'Daily Mains',
    'daily-quiz':     'Daily Quiz',
    'burning-issues': 'Burning Issues',
    'magazines':      'Magazines',
    'topics':         'Browse Topics',
    'search':         'Search',
    'resources':      'Resources',
    'mentorship':     'Mentorship',
    'current-affairs': 'Current Affairs',
    'courses':        'Video Courses',

    'tests':          'Tests',
    'prelims-test-series':  'Prelims Test Series',
    'prelims-practice-test': 'Prelims Practice Test',
    'mains-test-series':    'Mains Test Series',
    'mains-practice-test':  'Mains Practice Test',
    'ca-prelims':           'CA Prelims',
};

const CURRENT_AFFAIRS_SUBMODULES = new Set([
    'daily-prelims',
    'daily-mains',
    'daily-quiz',
    'burning-issues',
    'magazines'
]);

/** Convert a slug like "study-plan" to "Study Plan" */
function titleCase(slug: string): string {
    return slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

interface Crumb {
    label: string;
    href: string;
}

export default function Breadcrumbs() {
    const pathname = usePathname();

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [pathname]);

    // Don't show on landing page, admin pages, or mentor pages
    if (!pathname || pathname === '/' || pathname.startsWith('/admin') || pathname === '/mentor' || pathname.startsWith('/mentor/')) return null;

    const segments = pathname.split('/').filter(Boolean);

    const crumbs: Crumb[] = [{ label: 'Home', href: '/' }];

    // If direct current affairs submodule, inject Current Affairs parent
    if (segments.length > 0 && CURRENT_AFFAIRS_SUBMODULES.has(segments[0])) {
        crumbs.push({ label: 'Current Affairs', href: '/current-affairs' });
    }

    let accumulatedPath = '';
    for (const segment of segments) {
        accumulatedPath += `/${segment}`;
        const isMongoId = /^[0-9a-fA-F]{24}$/.test(segment);
        const label = isMongoId ? 'Course Details' : (ROUTE_LABELS[segment] || titleCase(segment));
        crumbs.push({ label, href: accumulatedPath });
    }

    return (
        <div className="pt-16 4k:pt-20 bg-[#F8FAFC] border-b border-slate-200/60 sticky top-0 z-40 backdrop-blur-xs">
            <nav
                className="max-w-7xl 4k:max-w-[2400px] 5k:max-w-[3400px] mx-auto w-full px-4 md:px-8 4k:px-16 py-2 4k:py-3"
                aria-label="Breadcrumb"
            >
                <ol className="flex items-center flex-wrap gap-1 text-xs 4k:text-sm font-medium">
                    {crumbs.map((crumb, idx) => {
                        const isLast = idx === crumbs.length - 1;

                        return (
                            <li key={crumb.href} className="flex items-center">
                                {idx > 0 && (
                                    <span className="mx-1.5 text-gray-300 font-bold select-none">
                                        ›
                                    </span>
                                )}
                                {isLast ? (
                                    <span className="text-[#1E3A5F] font-bold">
                                        {crumb.label}
                                    </span>
                                ) : (
                                    <Link
                                        href={crumb.href}
                                        className="text-gray-400 hover:text-[#D97706] transition-colors"
                                    >
                                        {crumb.label}
                                    </Link>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </nav>
        </div>
    );
}
