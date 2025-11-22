/**
 * Example Test File
 * This file contains various code patterns that CodeGhost should detect
 * 
 * NOTE: This file intentionally contains TypeScript errors!
 * These are examples of buggy code that should be caught by CodeGhost.
 * The TypeScript compiler errors are expected and demonstrate the patterns.
 */

// @ts-nocheck - Disable TypeScript checking for this example file

// 1. Missing Null Check
function getUserName(user: any) {
  // ⚠️ Should be flagged: user.name without null check
  return user.name;
}

// Better version:
function getUserNameSafe(user: any) {
  return user?.name ?? 'Unknown';
}

// 2. Off-by-One Loop Error
function printArray(arr: string[]) {
  // ⚠️ Should be flagged: i <= arr.length causes out of bounds
  for (let i = 0; i <= arr.length; i++) {
    console.log(arr[i]);
  }
}

// Better version:
function printArraySafe(arr: string[]) {
  for (let i = 0; i < arr.length; i++) {
    console.log(arr[i]);
  }
}

// 3. Missing Await
async function fetchUser() {
  return { name: 'John', age: 30 };
}

async function processUser() {
  // ⚠️ Should be flagged: missing await
  const user = fetchUser();
  console.log(user.name);
}

// Better version:
async function processUserSafe() {
  const user = await fetchUser();
  console.log(user.name);
}

// 4. Unsafe Array Access
function getFirstElement(arr: any[]) {
  // ⚠️ Should be flagged: no check if array is empty
  return arr[0];
}

// Better version:
function getFirstElementSafe(arr: any[]) {
  return arr?.[0] ?? null;
}

// 5. Multiple Issues Combined
async function complexExample(users: any[]) {
  // ⚠️ Multiple issues here:
  // - Loop boundary
  // - Missing null check
  // - Missing await
  for (let i = 0; i <= users.length; i++) {
    const userData = fetchUser();
    console.log(users[i].name);
  }
}

// Better version:
async function complexExampleSafe(users: any[]) {
  for (let i = 0; i < users.length; i++) {
    const userData = await fetchUser();
    console.log(users[i]?.name ?? 'Unknown');
  }
}

// 6. Chain of Property Access
interface Config {
  server?: {
    host?: string;
    port?: number;
  };
}

function getServerUrl(config: Config) {
  // ⚠️ Should be flagged: unsafe nested property access
  return `http://${config.server.host}:${config.server.port}`;
}

// Better version:
function getServerUrlSafe(config: Config) {
  const host = config.server?.host ?? 'localhost';
  const port = config.server?.port ?? 3000;
  return `http://${host}:${port}`;
}

// Test instructions:
// 1. Run "CodeGhost: Initialize" on a repo with bug fixes
// 2. Open this file
// 3. Lines marked with ⚠️ should show ghost highlights
// 4. Hover over them to see explanations
