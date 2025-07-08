'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UpgradePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to billing page with upgrade tab selected
    router.replace('/billing?tab=upgrade');
  }, [router]);

  return null;
}
