import { afterEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';

// Extend expect with toBeInTheDocument matcher
expect.extend({
  toBeInTheDocument(received: Element) {
    const isInDocument = document.contains(received);
    return {
      pass: isInDocument,
      message: () => `expected element to be in document`,
    };
  },
});

afterEach(() => {
  cleanup();
});
