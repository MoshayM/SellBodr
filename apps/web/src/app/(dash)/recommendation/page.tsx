'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Recommendations and Opportunities show the same data — consolidated into /opportunities
export default function RecommendationRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/opportunities'); }, [router]);
  return null;
}
