import { ThemeToggleFixed } from '@/components/theme-toggle-fixed';
import { ThemeToggleStandalone } from '@/components/theme-toggle-standalone';
import { ThemeToggleStandaloneDebug } from '@/components/theme-toggle-standalone-debug';

export default function TestHydrationPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-8">Hydration Test Page</h1>
      
      <div className="grid gap-8">
        <div className="border p-4 rounded">
          <h2 className="text-xl mb-4">ThemeToggleFixed (Native Button)</h2>
          <div className="relative h-20">
            <ThemeToggleFixed />
          </div>
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-xl mb-4">ThemeToggleStandalone (ButtonNoSlot)</h2>
          <div className="relative h-20">
            <ThemeToggleStandalone />
          </div>
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-xl mb-4">ThemeToggleStandaloneDebug (Pure Native)</h2>
          <div className="relative h-20">
            <ThemeToggleStandaloneDebug />
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <h3 className="font-semibold mb-2">Hydration Issue Analysis:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Radix UI Slot component can cause hydration mismatches</li>
          <li>Theme provider might return different values during SSR</li>
          <li>Mounted state prevents SSR/client mismatches</li>
          <li>ParticleBackground should use dynamic import with ssr: false</li>
        </ul>
      </div>
    </div>
  );
}