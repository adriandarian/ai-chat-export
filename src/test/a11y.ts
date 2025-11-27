import { axe } from "vitest-axe";
import { expect } from "vitest";

export { axe };

/**
 * Helper to run accessibility tests on a container
 * @param container - The DOM element to test
 * @param options - Optional axe configuration
 */
export async function checkA11y(container: Element, options?: Parameters<typeof axe>[1]) {
  const results = await axe(container, options);
  // Check that there are no violations
  expect(results.violations).toHaveLength(0);
}
