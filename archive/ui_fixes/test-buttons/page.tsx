'use client';

import { Button } from '@/components/ui/button';
import { ButtonNoSlot } from '@/components/ui/button-no-slot';
import { ThemeToggleStandalone } from '@/components/theme-toggle-standalone';

export default function TestButtonsPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <h1 className="text-2xl font-bold mb-8">Button Component Test</h1>
      
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Regular Button (with Radix Slot)</h2>
          <Button onClick={() => console.log('Button clicked')}>
            Click me (Button with Slot)
          </Button>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Button without Slot</h2>
          <ButtonNoSlot onClick={() => console.log('ButtonNoSlot clicked')}>
            Click me (ButtonNoSlot)
          </ButtonNoSlot>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Theme Toggle Component</h2>
          <ThemeToggleStandalone />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Direct Button Element</h2>
          <button
            onClick={() => console.log('Direct button clicked')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Direct HTML Button
          </button>
        </div>
      </div>
    </div>
  );
}