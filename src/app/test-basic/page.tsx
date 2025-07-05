'use client';

import { useState } from 'react';

export default function TestBasicPage() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState('light');

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-8">Basic Button Test</h1>
      
      {/* Test 1: Simple counter button */}
      <div className="mb-8">
        <h2 className="text-xl mb-4">Test 1: Counter Button</h2>
        <button
          onClick={() => {
            console.log('Counter clicked!');
            setCount(count + 1);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Count: {count}
        </button>
      </div>

      {/* Test 2: Theme toggle */}
      <div className="mb-8">
        <h2 className="text-xl mb-4">Test 2: Theme Toggle</h2>
        <button
          onClick={() => {
            console.log('Theme toggle clicked!');
            const newTheme = theme === 'light' ? 'dark' : 'light';
            setTheme(newTheme);
            document.documentElement.classList.toggle('dark');
          }}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Theme: {theme}
        </button>
      </div>

      {/* Test 3: Alert button */}
      <div className="mb-8">
        <h2 className="text-xl mb-4">Test 3: Alert Button</h2>
        <button
          onClick={() => {
            console.log('Alert button clicked!');
            alert('Button works!');
          }}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Show Alert
        </button>
      </div>

      {/* Test 4: Form submission */}
      <div className="mb-8">
        <h2 className="text-xl mb-4">Test 4: Form Button</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          console.log('Form submitted!');
          alert('Form submitted!');
        }}>
          <button
            type="submit"
            className="px-4 py-2 bg-purple-500 text-white rounded"
          >
            Submit Form
          </button>
        </form>
      </div>
    </div>
  );
}