'use client';

import { Button } from "@/components/ui/button";

export default function TestProgressivePage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '30px' }}>Progressive Enhancement Test</h1>
      
      {/* Test 1: Native button */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Test 1: Native HTML Button (should work)</h3>
        <button
          onClick={() => console.log('Native button clicked!')}
          style={{ padding: '10px 20px' }}
        >
          Native Button
        </button>
      </div>

      {/* Test 2: Button component with minimal props */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Test 2: shadcn/ui Button - Minimal</h3>
        <Button onClick={() => console.log('shadcn Button clicked!')}>
          shadcn Button
        </Button>
      </div>

      {/* Test 3: Button component with variant */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Test 3: shadcn/ui Button - With Variant</h3>
        <Button 
          variant="outline"
          onClick={() => console.log('shadcn outline Button clicked!')}
        >
          Outline Button
        </Button>
      </div>

      {/* Test 4: Button component with asChild */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Test 4: shadcn/ui Button - With asChild (Radix Slot)</h3>
        <Button asChild>
          <span onClick={() => console.log('asChild Button clicked!')}>
            Button with asChild
          </span>
        </Button>
      </div>

      {/* Test 5: Direct test of potential issue */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Test 5: Button with complex children</h3>
        <Button onClick={() => console.log('Complex Button clicked!')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🌓</span>
            <span>Complex Children</span>
          </span>
        </Button>
      </div>

      {/* Test 6: Multiple buttons in a container */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Test 6: Multiple Buttons</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button onClick={() => console.log('Button 1')}>Button 1</Button>
          <Button onClick={() => console.log('Button 2')}>Button 2</Button>
          <Button onClick={() => console.log('Button 3')}>Button 3</Button>
        </div>
      </div>

      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        backgroundColor: '#f9fafb',
        borderRadius: '8px'
      }}>
        <p>Check the browser console to see which buttons are working.</p>
        <p>This will help identify where the Button component fails.</p>
      </div>
    </div>
  );
}