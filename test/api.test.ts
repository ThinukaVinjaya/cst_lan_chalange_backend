import http from 'http';
import { createApp } from '../src/app';

async function runTests() {
  console.log('===================================================================');
  console.log('  RUNNING CST LAN CHALLENGE 2026 - BACKEND API SUITE');
  console.log('===================================================================');

  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`Test server running on: ${baseUrl}\n`);

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  };

  try {
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthJson = await healthRes.json();
    assert(
      healthRes.status === 200 && healthJson.status === 'healthy',
      'Test 1: GET /health returns 200 and healthy status'
    );

    // 2. Public settings
    const settingsRes = await fetch(`${baseUrl}/api/public/settings`);
    const settingsJson = await settingsRes.json();
    assert(
      settingsRes.status === 200 && settingsJson.success === true,
      'Test 2: GET /api/public/settings returns 200 and tournament details'
    );

    // 3. Confirm public users cannot access admin endpoints without auth
    const adminOverviewRes = await fetch(`${baseUrl}/api/admin/dashboard/overview`);
    assert(
      adminOverviewRes.status === 401,
      'Test 3: GET /api/admin/dashboard/overview rejects unauthenticated public request with 401'
    );

    const adminTeamsRes = await fetch(`${baseUrl}/api/admin/teams`);
    assert(
      adminTeamsRes.status === 401,
      'Test 4: GET /api/admin/teams rejects unauthenticated request with 401'
    );

    const adminMatchesRes = await fetch(`${baseUrl}/api/admin/matches`);
    assert(
      adminMatchesRes.status === 401,
      'Test 5: GET /api/admin/matches rejects unauthenticated request with 401'
    );

    // 4. Test login rejection with incorrect credentials
    const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernameOrEmail: 'nonexistent_admin',
        password: 'wrong_password_123',
      }),
    });
    const badLoginJson = await badLoginRes.json();
    assert(
      badLoginRes.status === 401 && badLoginJson.success === false,
      'Test 6: POST /api/auth/login rejects invalid credentials with 401'
    );

    // 4b. Test login success with valid credentials
    const validLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernameOrEmail: 'admin',
        password: 'admin12345',
      }),
    });
    const validLoginJson = await validLoginRes.json();
    const token = validLoginJson.data?.token;
    assert(
      validLoginRes.status === 200 && validLoginJson.success === true && !!token,
      'Test 6b: POST /api/auth/login authenticates valid admin and returns JWT token'
    );

    // 4c. Test /api/auth/me with Bearer token
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meJson = await meRes.json();
    assert(
      meRes.status === 200 && meJson.data?.admin?.username === 'admin',
      'Test 6c: GET /api/auth/me verifies admin session with Bearer token'
    );

    // 5. Test registration input validation - incomplete team
    const badRegRes = await fetch(`${baseUrl}/api/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamName: 'X', // too short
        teamTag: 'A', // too short
        university: '',
        players: [], // empty players
      }),
    });
    const badRegJson = await badRegRes.json();
    assert(
      badRegRes.status === 400 && badRegJson.success === false && Array.isArray(badRegJson.errors),
      'Test 7: POST /api/registrations rejects invalid/incomplete payload with 400 and validation errors'
    );

    // 6. Test registration rejection for invalid roster size (< 5 players)
    const invalidRosterRes = await fetch(`${baseUrl}/api/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamName: 'Valid Team Name',
        teamTag: 'VAL.T',
        university: 'University of Moratuwa',
        captain: { name: 'Cap', email: 'cap@std.mora.ac.lk', phone: '0771234567' },
        players: [
          { fullName: 'P1', inGameName: 'IGN1', steamId: 'STEAM_0:1:1111', email: 'p1@mora.ac.lk' },
          { fullName: 'P2', inGameName: 'IGN2', steamId: 'STEAM_0:1:2222', email: 'p2@mora.ac.lk' },
        ], // only 2 players instead of 5
      }),
    });
    assert(
      invalidRosterRes.status === 400,
      'Test 8: POST /api/registrations rejects roster with fewer than 5 main players'
    );

    // 7. Test registration rejection for duplicate player identities in same team
    const duplicateRosterRes = await fetch(`${baseUrl}/api/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamName: 'Duplicate Squad',
        teamTag: 'DUP.S',
        university: 'University of Colombo',
        captain: { name: 'Cap', email: 'cap@cmb.ac.lk', phone: '0771234567' },
        players: [
          { fullName: 'Player One', inGameName: 'P1', steamId: 'STEAM_0:1:99999999', email: 'same@cmb.ac.lk' },
          { fullName: 'Player Two', inGameName: 'P2', steamId: 'STEAM_0:1:99999999', email: 'same@cmb.ac.lk' }, // Duplicate Steam ID & email
          { fullName: 'Player Three', inGameName: 'P3', steamId: 'STEAM_0:1:33333333', email: 'p3@cmb.ac.lk' },
          { fullName: 'Player Four', inGameName: 'P4', steamId: 'STEAM_0:1:44444444', email: 'p4@cmb.ac.lk' },
          { fullName: 'Player Five', inGameName: 'P5', steamId: 'STEAM_0:1:55555555', email: 'p5@cmb.ac.lk' },
        ],
      }),
    });
    assert(
      duplicateRosterRes.status === 400,
      'Test 9: POST /api/registrations rejects duplicate Steam IDs or Emails within the same squad'
    );

    // 8. Public read endpoints
    const publicTeamsRes = await fetch(`${baseUrl}/api/public/teams`);
    assert(
      publicTeamsRes.status === 200,
      'Test 10: GET /api/public/teams returns 200 OK'
    );

    const publicMatchesRes = await fetch(`${baseUrl}/api/public/matches`);
    assert(
      publicMatchesRes.status === 200,
      'Test 11: GET /api/public/matches returns 200 OK'
    );

    const publicScoreboardRes = await fetch(`${baseUrl}/api/public/scoreboard`);
    assert(
      publicScoreboardRes.status === 200,
      'Test 12: GET /api/public/scoreboard returns 200 OK'
    );

    const publicStandingsRes = await fetch(`${baseUrl}/api/public/standings`);
    assert(
      publicStandingsRes.status === 200,
      'Test 13: GET /api/public/standings returns 200 OK'
    );

    // 9. 404 Route handling
    const unknownRes = await fetch(`${baseUrl}/api/non_existent_route_404`);
    const unknownJson = await unknownRes.json();
    assert(
      unknownRes.status === 404 && unknownJson.success === false,
      'Test 14: Undefined routes return structured 404 JSON'
    );

  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n===================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
