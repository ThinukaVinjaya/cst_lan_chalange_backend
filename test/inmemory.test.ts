import { RegistrationSubmitSchema, AdminLoginSchema, MatchScoreUpdateSchema, MatchCreateSchema } from '../src/utils/validators';
import { generateToken, verifyToken } from '../src/utils/generateToken';
import { ApiResponse } from '../src/utils/ApiResponse';
import { ApiError } from '../src/utils/ApiError';

async function runInMemoryTests() {
  console.log('===================================================================');
  console.log('  RUNNING CST LAN CHALLENGE 2026 - IN-MEMORY UNIT & LOGIC TESTS');
  console.log('===================================================================');

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
    // 1. Test JWT generation & verification
    const testAdmin = {
      id: '507f1f77bcf86cd799439011',
      username: 'test_admin',
      email: 'admin@cst.uwu.ac.lk',
      role: 'SUPER_ADMIN',
    };
    const token = generateToken(testAdmin);
    assert(typeof token === 'string' && token.length > 20, 'Test 1: JWT token generation produces valid string');

    const decoded: any = verifyToken(token);
    assert(
      decoded && decoded.username === 'test_admin' && decoded.role === 'SUPER_ADMIN',
      'Test 2: JWT token verification decodes correct admin payload'
    );

    // 2. Test AdminLoginSchema
    const validLogin = AdminLoginSchema.safeParse({
      usernameOrEmail: 'admin',
      password: 'password123',
    });
    assert(validLogin.success, 'Test 3: AdminLoginSchema accepts valid credentials');

    const invalidLogin = AdminLoginSchema.safeParse({
      usernameOrEmail: '',
      password: '',
    });
    assert(!invalidLogin.success, 'Test 4: AdminLoginSchema rejects empty credentials');

    // 3. Test RegistrationSubmitSchema
    const validRegistration = {
      teamName: 'UWU Tactical Strike',
      teamTag: 'UWU.TS',
      university: 'Uva Wellassa University of Sri Lanka',
      captain: {
        name: 'Kasun Bandara',
        email: 'kasun@std.uwu.ac.lk',
        phone: '+94 77 123 4567',
        studentId: 'UWU/CST/22/001',
      },
      players: [
        { fullName: 'Kasun Bandara', inGameName: 'V3CT0R_99', steamId: 'STEAM_0:1:45829102', email: 'kasun@std.uwu.ac.lk', role: 'In-Game Leader' },
        { fullName: 'Ravindu Senarath', inGameName: 'PhantomAWP', steamId: 'STEAM_0:0:38291048', email: 'ravindu@std.uwu.ac.lk', role: 'Sniper' },
        { fullName: 'Dinuka Perera', inGameName: 'ApexStrike', steamId: 'STEAM_0:1:94827103', email: 'dinuka@std.uwu.ac.lk', role: 'Entry Fragger' },
        { fullName: 'Naveen Jayasuriya', inGameName: 'CryoN', steamId: 'STEAM_0:0:19283746', email: 'naveen@std.uwu.ac.lk', role: 'Support' },
        { fullName: 'Shehan Alwis', inGameName: 'V0rtex', steamId: 'STEAM_0:1:56473829', email: 'shehan@std.uwu.ac.lk', role: 'Lurker' },
      ],
      substitute: {
        fullName: 'Kavindu Rathnayake',
        inGameName: 'Pulse',
        steamId: 'STEAM_0:1:77889900',
        email: 'kavindu@std.uwu.ac.lk',
        role: 'Substitute',
      },
      agreedToRules: true,
    };

    const regResult = RegistrationSubmitSchema.safeParse(validRegistration);
    assert(regResult.success, 'Test 5: RegistrationSubmitSchema validates complete 5-man + sub squad');

    // 4. Duplicate Steam ID check in schema
    const duplicateSteamReg = JSON.parse(JSON.stringify(validRegistration));
    duplicateSteamReg.players[1].steamId = duplicateSteamReg.players[0].steamId;
    const dupResult = RegistrationSubmitSchema.safeParse(duplicateSteamReg);
    assert(!dupResult.success, 'Test 6: RegistrationSubmitSchema rejects duplicate Steam IDs within roster');

    // 5. Test MatchScoreUpdateSchema
    const validScore = MatchScoreUpdateSchema.safeParse({
      scoreA: 13,
      scoreB: 9,
      status: 'COMPLETED',
      mvp: 'V3CT0R_99',
    });
    assert(validScore.success, 'Test 7: MatchScoreUpdateSchema accepts valid MR12 score ratification');

    const invalidScore = MatchScoreUpdateSchema.safeParse({
      scoreA: -5,
      scoreB: 10,
    });
    assert(!invalidScore.success, 'Test 8: MatchScoreUpdateSchema rejects negative scores');

    // 6. Test MatchCreateSchema
    const validMatch = MatchCreateSchema.safeParse({
      teamA: '507f1f77bcf86cd799439011',
      teamB: '507f1f77bcf86cd799439012',
      teamAName: 'Team Alpha',
      teamATag: 'TMA',
      teamALogo: 'https://example.com/logoA.png',
      teamBName: 'Team Bravo',
      teamBTag: 'TMB',
      teamBLogo: 'https://example.com/logoB.png',
      mapName: 'Mirage',
      scheduledAt: new Date().toISOString(),
      stage: 'Grand Final',
    });
    assert(validMatch.success, 'Test 9: MatchCreateSchema accepts valid CS2 match fixture');

    // 7. Same team check
    const sameTeamMatch = MatchCreateSchema.safeParse({
      teamA: '507f1f77bcf86cd799439011',
      teamB: '507f1f77bcf86cd799439011',
      teamAName: 'Team Alpha',
      teamATag: 'TMA',
      teamALogo: 'https://example.com/logoA.png',
      teamBName: 'Team Alpha',
      teamBTag: 'TMA',
      teamBLogo: 'https://example.com/logoA.png',
      mapName: 'Mirage',
      scheduledAt: new Date().toISOString(),
      stage: 'Grand Final',
    });
    assert(!sameTeamMatch.success, 'Test 10: MatchCreateSchema rejects matching team A and team B');

    // 8. Test ApiError hierarchy
    const notFoundErr = ApiError.notFound('Squad not found');
    assert(notFoundErr.statusCode === 404 && notFoundErr.isOperational, 'Test 11: ApiError.notFound generates 404');

    const unauthErr = ApiError.unauthorized('Invalid admin token');
    assert(unauthErr.statusCode === 401 && unauthErr.isOperational, 'Test 12: ApiError.unauthorized generates 401');

    console.log('\n===================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('===================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runInMemoryTests();
