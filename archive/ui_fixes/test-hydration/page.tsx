import { ThemeToggleFixed } from '@/components/theme-toggle-fixed';
import { ThemeToggleStandalone } from '@/components/theme-toggle-standalone';
import { ThemeToggleStandaloneDebug } from '@/components/theme-toggle-standalone-debug';

export default function TestHydrationPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-8 text-2xl font-bold">Hydration Test Page</h1>

      <div className="grid gap-8">
        <div className="rounded border p-4">
          <h2 className="mb-4 text-xl">ThemeToggleFixed (Native Button)</h2>
          <div className="relative h-20">
            <ThemeToggleFixed />
          </div>
        </div>

        <div className="rounded border p-4">
          <h2 className="mb-4 text-xl">ThemeToggleStandalone (ButtonNoSlot)</h2>
          <div className="relative h-20">
            <ThemeToggleStandalone />
          </div>
        </div>

        <div className="rounded border p-4">
          <h2 className="mb-4 text-xl">
            ThemeToggleStandaloneDebug (Pure Native)
          </h2>
          <div className="relative h-20">
            <ThemeToggleStandaloneDebug />
          </div>
        </div>
      </div>

      <div className="mt-8 rounded bg-gray-100 p-4 dark:bg-gray-800">
        <h3 className="mb-2 font-semibold">Hydration Issue Analysis:</h3>
        <ul className="list-inside list-disc space-y-1 text-sm">
          <li>Radix UI Slot component can cause hydration mismatches</li>
          <li>Theme provider might return different values during SSR</li>
          <li>Mounted state prevents SSR/client mismatches</li>
          <li>ParticleBackground should use dynamic import with ssr: false</li>
        </ul>
      </div>
    </div>
  );
}
