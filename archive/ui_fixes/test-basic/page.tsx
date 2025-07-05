'use client';

import { useState } from 'react';

export default function TestBasicPage() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState('light');

  return (
    <div className="p-8">
      <h1 className="mb-8 text-2xl">Basic Button Test</h1>

      {/* Test 1: Simple counter button */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl">Test 1: Counter Button</h2>
        <button
          onClick={() => {
            console.log('Counter clicked!');
            setCount(count + 1);
          }}
          className="rounded bg-blue-500 px-4 py-2 text-white"
        >
          Count: {count}
        </button>
      </div>

      {/* Test 2: Theme toggle */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl">Test 2: Theme Toggle</h2>
        <button
          onClick={() => {
            console.log('Theme toggle clicked!');
            const newTheme = theme === 'light' ? 'dark' : 'light';
            setTheme(newTheme);
            document.documentElement.classList.toggle('dark');
          }}
          className="rounded bg-gray-500 px-4 py-2 text-white"
        >
          Theme: {theme}
        </button>
      </div>

      {/* Test 3: Alert button */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl">Test 3: Alert Button</h2>
        <button
          onClick={() => {
            console.log('Alert button clicked!');
            alert('Button works!');
          }}
          className="rounded bg-green-500 px-4 py-2 text-white"
        >
          Show Alert
        </button>
      </div>

      {/* Test 4: Form submission */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl">Test 4: Form Button</h2>
        <form
          onSubmit={e => {
            e.preventDefault();
            console.log('Form submitted!');
            alert('Form submitted!');
          }}
        >
          <button
            type="submit"
            className="rounded bg-purple-500 px-4 py-2 text-white"
          >
            Submit Form
          </button>
        </form>
      </div>
    </div>
  );
}
