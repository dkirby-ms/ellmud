import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = () => {};
