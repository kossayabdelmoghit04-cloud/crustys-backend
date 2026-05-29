/**
 * Standard API Response Helpers for Integration Tests
 */

/**
 * Asserts that a response matches the standard single-resource API structure.
 * Standard format: { status: 'success' | success: true, data: { [resourceName]: { ... } } }
 * Returns the resource object inside the data wrap.
 */
export function expectApiResource(res: any, resourceName: string) {
  // Validate standard envelope fields
  if (res.body.status !== undefined) {
    expect(res.body.status).toBe('success');
  } else {
    expect(res.body.success).toBe(true);
  }

  expect(res.body.data).toBeDefined();
  expect(res.body.data[resourceName]).toBeDefined();

  return res.body.data[resourceName];
}

/**
 * Asserts that a response matches the standard collection API structure.
 * Standard format: { status: 'success' | success: true, data: { [collectionName]: [ ... ] } }
 * Returns the collection array inside the data wrap.
 */
export function expectApiCollection(res: any, collectionName: string) {
  if (res.body.status !== undefined) {
    expect(res.body.status).toBe('success');
  } else {
    expect(res.body.success).toBe(true);
  }

  expect(res.body.data).toBeDefined();
  expect(res.body.data[collectionName]).toBeDefined();
  expect(Array.isArray(res.body.data[collectionName])).toBe(true);

  return res.body.data[collectionName];
}
