import { connectDatabase } from '../config/database';
import { TournamentSettings } from '../models/TournamentSettings';
import { Registration } from '../models/Registration';
import { Team } from '../models/Team';
import { Match } from '../models/Match';
import { Admin } from '../models/Admin';
import bcrypt from 'bcryptjs';
import { env } from '../config/environment';
import { recalculateAllStandings } from '../services/scoreboardService';

async function seedData() {
  console.log('--- Seeding CST LAN Challenge 2026 Tournament Data ---');
  const db = await connectDatabase();
  if (!db) {
    console.error('Database connection failed. Please ensure your IP is whitelisted on MongoDB Atlas.');
    process.exit(1);
  }

  // 1. Seed Super Admin
  const adminUsername = env.ADMIN_USERNAME || 'admin';
  const adminEmail = env.ADMIN_EMAIL || 'admin@cst.uwu.ac.lk';
  const adminPassword = env.ADMIN_PASSWORD || 'admin12345';

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  const admin = await Admin.findOneAndUpdate(
    { username: adminUsername },
    {
      username: adminUsername,
      email: adminEmail,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    { upsert: true, new: true }
  );
  console.log(`✓ Super Admin verified: ${admin.username} (${admin.email})`);

  // 2. Seed Tournament Settings
  const settings = await TournamentSettings.findOneAndUpdate(
    {},
    {
      eventName: 'CST LAN Challenge 2026',
      gameName: 'Counter-Strike 2',
      organizerName: 'Computer Science and Technology Degree Programme',
      universityName: 'Uva Wellassa University of Sri Lanka',
      degreeProgramme: 'Computer Science and Technology',
      eventDate: new Date('2026-11-20T09:00:00.000Z'),
      registrationDeadline: new Date('2026-11-12T23:59:59.000Z'),
      eventStatus: 'REGISTRATIONS OPEN',
      registrationOpen: true,
      tournamentFormat: '5v5 Competitive CS2 (MR12 Format)',
      maximumTeams: 16,
      announcementText:
        'LAN Finals live at Uva Wellassa University Main Auditorium. 5v5 MR12 Counter-Strike 2 competitive ruleset.',
      livestreamUrl: 'https://twitch.tv/cst_lan_challenge',
    },
    { upsert: true, new: true }
  );
  console.log(`✓ Tournament Settings configured: ${settings.eventName}`);

  // 3. Seed Sample Squads & Registrations
  const sampleSquads = [
    {
      teamName: 'UWU Tactical Vanguard',
      teamTag: 'UWU.V',
      university: 'Uva Wellassa University of Sri Lanka',
      logo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
      captain: {
        name: 'Kasun Bandara',
        email: 'kasun.b@std.uwu.ac.lk',
        phone: '+94 77 123 4567',
      },
      players: [
        { fullName: 'Kasun Bandara', inGameName: 'V3CT0R_99', steamId: 'STEAM_0:1:45829102', email: 'kasun.b@std.uwu.ac.lk', role: 'In-Game Leader' },
        { fullName: 'Ravindu Senarath', inGameName: 'PhantomAWP', steamId: 'STEAM_0:0:38291048', email: 'ravindu.s@std.uwu.ac.lk', role: 'Sniper' },
        { fullName: 'Dinuka Perera', inGameName: 'ApexStrike', steamId: 'STEAM_0:1:94827103', email: 'dinuka.p@std.uwu.ac.lk', role: 'Entry Fragger' },
        { fullName: 'Naveen Jayasuriya', inGameName: 'CryoN', steamId: 'STEAM_0:0:19283746', email: 'naveen.j@std.uwu.ac.lk', role: 'Support' },
        { fullName: 'Shehan Alwis', inGameName: 'V0rtex', steamId: 'STEAM_0:1:56473829', email: 'shehan.a@std.uwu.ac.lk', role: 'Lurker' },
      ],
      substitute: {
        fullName: 'Thilina Madusanka',
        inGameName: 'GhostRider',
        steamId: 'STEAM_0:0:73829104',
        email: 'thilina.m@std.uwu.ac.lk',
        role: 'Substitute',
      },
      status: 'APPROVED' as const,
    },
    {
      teamName: 'Moratuwa Cyber Titans',
      teamTag: 'MORA.CT',
      university: 'University of Moratuwa',
      logo: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80',
      captain: {
        name: 'Isuru Wickramasinghe',
        email: 'isuru.w@mora.ac.lk',
        phone: '+94 71 987 6543',
      },
      players: [
        { fullName: 'Isuru Wickramasinghe', inGameName: 'R34PER_X', steamId: 'STEAM_0:1:22334455', email: 'isuru.w@mora.ac.lk', role: 'In-Game Leader' },
        { fullName: 'Sahan Fernando', inGameName: 'BulletStorm', steamId: 'STEAM_0:0:88776655', email: 'sahan.f@mora.ac.lk', role: 'Entry Fragger' },
        { fullName: 'Minura Gunasekara', inGameName: 'Nighthawk', steamId: 'STEAM_0:1:99112233', email: 'minura.g@mora.ac.lk', role: 'Sniper' },
        { fullName: 'Sachith De Silva', inGameName: 'Overclock', steamId: 'STEAM_0:0:55443322', email: 'sachith.d@mora.ac.lk', role: 'Support' },
        { fullName: 'Kavindu Rathnayake', inGameName: 'Pulse', steamId: 'STEAM_0:1:77889900', email: 'kavindu.r@mora.ac.lk', role: 'Lurker' },
      ],
      status: 'APPROVED' as const,
    },
    {
      teamName: 'Colombo Apex Esports',
      teamTag: 'UOC.APX',
      university: 'University of Colombo',
      logo: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=200&auto=format&fit=crop&q=80',
      captain: {
        name: 'Kavishka Ranasinghe',
        email: 'kavishka.r@sci.cmb.ac.lk',
        phone: '+94 76 543 2109',
      },
      players: [
        { fullName: 'Kavishka Ranasinghe', inGameName: 'BlitzKrieg', steamId: 'STEAM_0:1:34125678', email: 'kavishka.r@sci.cmb.ac.lk', role: 'In-Game Leader' },
        { fullName: 'Harsha Mendis', inGameName: 'SilentScope', steamId: 'STEAM_0:0:98761234', email: 'harsha.m@sci.cmb.ac.lk', role: 'Sniper' },
        { fullName: 'Oshan Liyanage', inGameName: 'ShadowFox', steamId: 'STEAM_0:1:87654321', email: 'oshan.l@sci.cmb.ac.lk', role: 'Entry Fragger' },
        { fullName: 'Roshan Dias', inGameName: 'Tactix', steamId: 'STEAM_0:0:43218765', email: 'roshan.d@sci.cmb.ac.lk', role: 'Support' },
        { fullName: 'Nuwan Jayawardena', inGameName: 'Spectre', steamId: 'STEAM_0:1:65432187', email: 'nuwan.j@sci.cmb.ac.lk', role: 'Lurker' },
      ],
      status: 'APPROVED' as const,
    },
    {
      teamName: 'Peradeniya Iron Vipers',
      teamTag: 'UOP.VIPER',
      university: 'University of Peradeniya',
      logo: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80',
      captain: {
        name: 'Janith Dissanayake',
        email: 'janith.d@eng.pdn.ac.lk',
        phone: '+94 70 876 5432',
      },
      players: [
        { fullName: 'Janith Dissanayake', inGameName: 'ViperKing', steamId: 'STEAM_0:1:11229988', email: 'janith.d@eng.pdn.ac.lk', role: 'In-Game Leader' },
        { fullName: 'Chathura Kumara', inGameName: 'Striker9', steamId: 'STEAM_0:0:33448877', email: 'chathura.k@eng.pdn.ac.lk', role: 'Entry Fragger' },
        { fullName: 'Gayan Weerasinghe', inGameName: 'DeagleGod', steamId: 'STEAM_0:1:55667788', email: 'gayan.w@eng.pdn.ac.lk', role: 'Sniper' },
        { fullName: 'Dulith Perera', inGameName: 'Sentinel', steamId: 'STEAM_0:0:77881122', email: 'dulith.p@eng.pdn.ac.lk', role: 'Support' },
        { fullName: 'Akila Somarathna', inGameName: 'VenomX', steamId: 'STEAM_0:1:99003344', email: 'akila.s@eng.pdn.ac.lk', role: 'Lurker' },
      ],
      status: 'APPROVED' as const,
    },
    {
      teamName: 'SLIIT Cyber Dragons',
      teamTag: 'SLIIT.DRG',
      university: 'Sri Lanka Institute of Information Technology',
      logo: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80',
      captain: {
        name: 'Ashen Samarajeewa',
        email: 'ashen.s@my.sliit.lk',
        phone: '+94 75 111 2233',
      },
      players: [
        { fullName: 'Ashen Samarajeewa', inGameName: 'Draco', steamId: 'STEAM_0:1:44556677', email: 'ashen.s@my.sliit.lk', role: 'In-Game Leader' },
        { fullName: 'Senura Abeykoon', inGameName: 'Firebrand', steamId: 'STEAM_0:0:66778899', email: 'senura.a@my.sliit.lk', role: 'Entry Fragger' },
        { fullName: 'Tharindu Fonseka', inGameName: 'Hydro', steamId: 'STEAM_0:1:88990011', email: 'tharindu.f@my.sliit.lk', role: 'Sniper' },
        { fullName: 'Bawantha Silva', inGameName: 'Flashbang', steamId: 'STEAM_0:0:22338899', email: 'bawantha.s@my.sliit.lk', role: 'Support' },
        { fullName: 'Chamod Karunaratne', inGameName: 'SmokeScreen', steamId: 'STEAM_0:1:44551122', email: 'chamod.k@my.sliit.lk', role: 'Lurker' },
      ],
      status: 'APPROVED' as const,
    },
    {
      teamName: 'Ruhuna Cyber Phoenix',
      teamTag: 'RUH.PHX',
      university: 'University of Ruhuna',
      logo: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&auto=format&fit=crop&q=80',
      captain: {
        name: 'Malinda Edirisinghe',
        email: 'malinda.e@eng.ruh.ac.lk',
        phone: '+94 78 333 4455',
      },
      players: [
        { fullName: 'Malinda Edirisinghe', inGameName: 'PhoenixFlame', steamId: 'STEAM_0:1:12398745', email: 'malinda.e@eng.ruh.ac.lk', role: 'Captain' },
        { fullName: 'Lahiru Prabath', inGameName: 'BlazeAWP', steamId: 'STEAM_0:0:98712365', email: 'lahiru.p@eng.ruh.ac.lk', role: 'Sniper' },
        { fullName: 'Damith Cooray', inGameName: 'Havoc', steamId: 'STEAM_0:1:45612378', email: 'damith.c@eng.ruh.ac.lk', role: 'Rifler' },
        { fullName: 'Sandun Jayakody', inGameName: 'GripTape', steamId: 'STEAM_0:0:78945612', email: 'sandun.j@eng.ruh.ac.lk', role: 'Support' },
        { fullName: 'Heshan Gunawardena', inGameName: 'Nebula', steamId: 'STEAM_0:1:32165498', email: 'heshan.g@eng.ruh.ac.lk', role: 'Lurker' },
      ],
      status: 'PENDING' as const,
    },
  ];

  const createdTeamsMap: Record<string, any> = {};

  for (const squad of sampleSquads) {
    const regNumber = `REG-2026-${squad.teamTag.replace(/[^A-Z0-9]/g, '')}`;
    const reg = await Registration.findOneAndUpdate(
      { teamTag: squad.teamTag },
      {
        registrationNumber: regNumber,
        teamName: squad.teamName,
        teamTag: squad.teamTag,
        teamLogo: squad.logo,
        university: squad.university,
        captain: squad.captain,
        players: squad.players,
        substitute: squad.substitute,
        status: squad.status,
      },
      { upsert: true, new: true }
    );

    if (squad.status === 'APPROVED') {
      const team = await Team.findOneAndUpdate(
        { teamTag: squad.teamTag },
        {
          teamName: squad.teamName,
          teamTag: squad.teamTag,
          teamLogo: squad.logo,
          university: squad.university,
          captain: squad.captain,
          players: squad.players,
          substitute: squad.substitute,
          registrationId: reg._id,
          isActive: true,
        },
        { upsert: true, new: true }
      );
      createdTeamsMap[squad.teamTag] = team;
      console.log(`✓ Seeded team: [${team.teamTag}] ${team.teamName}`);
    } else {
      console.log(`✓ Seeded pending registration: [${reg.teamTag}] ${reg.teamName}`);
    }
  }

  // 4. Seed Matches
  const teamUwu = createdTeamsMap['UWU.V'];
  const teamMora = createdTeamsMap['MORA.CT'];
  const teamUoc = createdTeamsMap['UOC.APX'];
  const teamUop = createdTeamsMap['UOP.VIPER'];

  if (teamUwu && teamMora) {
    // Live Match on stage
    await Match.findOneAndUpdate(
      { matchNumber: 1 },
      {
        matchNumber: 1,
        stage: 'Upper Bracket Semifinal 1 (MR12)',
        teamA: teamUwu._id,
        teamB: teamMora._id,
        teamAName: teamUwu.teamName,
        teamATag: teamUwu.teamTag,
        teamALogo: teamUwu.teamLogo,
        teamBName: teamMora.teamName,
        teamBTag: teamMora.teamTag,
        teamBLogo: teamMora.teamLogo,
        mapName: 'Mirage',
        scheduledAt: new Date(),
        status: 'LIVE',
        scoreA: 11,
        scoreB: 9,
        currentRound: 20,
        half: 2,
        c4Planted: false,
        teamASide: 'CT',
        teamBSide: 'T',
        streamUrl: 'https://twitch.tv/cst_lan_challenge',
      },
      { upsert: true }
    );
    console.log('✓ Seeded LIVE match: UWU.V vs MORA.CT on Mirage');
  }

  if (teamUoc && teamUop) {
    // Upcoming match
    await Match.findOneAndUpdate(
      { matchNumber: 2 },
      {
        matchNumber: 2,
        stage: 'Upper Bracket Semifinal 2',
        teamA: teamUoc._id,
        teamB: teamUop._id,
        teamAName: teamUoc.teamName,
        teamATag: teamUoc.teamTag,
        teamALogo: teamUoc.teamLogo,
        teamBName: teamUop.teamName,
        teamBTag: teamUop.teamTag,
        teamBLogo: teamUop.teamLogo,
        mapName: 'Inferno',
        scheduledAt: new Date(Date.now() + 2 * 3600 * 1000),
        status: 'UPCOMING',
        scoreA: 0,
        scoreB: 0,
        streamUrl: 'https://twitch.tv/cst_lan_challenge',
      },
      { upsert: true }
    );
    console.log('✓ Seeded UPCOMING match: UOC.APX vs UOP.VIPER on Inferno');
  }

  if (teamUwu && teamUoc) {
    // Completed match
    await Match.findOneAndUpdate(
      { matchNumber: 3 },
      {
        matchNumber: 3,
        stage: 'Group Stage Round 3',
        teamA: teamUwu._id,
        teamB: teamUoc._id,
        teamAName: teamUwu.teamName,
        teamATag: teamUwu.teamTag,
        teamALogo: teamUwu.teamLogo,
        teamBName: teamUoc.teamName,
        teamBTag: teamUoc.teamTag,
        teamBLogo: teamUoc.teamLogo,
        mapName: 'Dust II',
        scheduledAt: new Date(Date.now() - 24 * 3600 * 1000),
        status: 'COMPLETED',
        scoreA: 13,
        scoreB: 9,
        winner: teamUwu._id,
        mvp: 'V3CT0R_99 (Rating 1.48)',
        publishedAt: new Date(Date.now() - 22 * 3600 * 1000),
      },
      { upsert: true }
    );
    console.log('✓ Seeded COMPLETED match: UWU.V (13) vs UOC.APX (9) on Dust II');
  }

  // Recalculate standings from completed matches
  await recalculateAllStandings();
  console.log('✓ Standings recalculated.');

  console.log('\n--- Seed Complete: CST LAN Challenge 2026 database ready ---');
  process.exit(0);
}

seedData().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});

