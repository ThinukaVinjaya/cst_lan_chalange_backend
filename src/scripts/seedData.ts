import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

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
      tournamentFormat: '5v5 Competitive CS2 (MR12 Format) - Inter-Faculty Championship',
      maximumTeams: 16,
      announcementText:
        'UWU LAN Challenge 2026 live at Uva Wellassa University Main Auditorium. Inter-Faculty 5v5 MR12 Counter-Strike 2 championship.',
      livestreamUrl: 'https://twitch.tv/cst_lan_challenge',
    },
    { upsert: true, new: true }
  );
  console.log(`✓ Tournament Settings configured: ${settings.eventName}`);

  // 3. Seed Sample Squads & Registrations (UWU Inter-Faculty Championship)
  const sampleSquads = [
    {
      teamName: 'UWU Tactical Vanguard',
      teamTag: 'UWU.V',
      university: 'Uva Wellassa University of Sri Lanka',
      logo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
      captain: {
        name: 'Kasun Bandara',
        whatsappNumber: '0771234567',
        phone: '0771234567',
        faculty: 'Faculty of Applied Sciences',
        email: 'kasun.b@std.uwu.ac.lk',
      },
      players: [
        { fullName: 'Kasun Bandara', faculty: 'Faculty of Applied Sciences', inGameName: 'V3CT0R_99', steamId: 'STEAM_0:1:45829102', email: 'kasun.b@std.uwu.ac.lk', role: 'In-Game Leader' },
        { fullName: 'Ravindu Senarath', faculty: 'Faculty of Applied Sciences', inGameName: 'PhantomAWP', steamId: 'STEAM_0:0:38291048', email: 'ravindu.s@std.uwu.ac.lk', role: 'Sniper' },
        { fullName: 'Dinuka Perera', faculty: 'Faculty of Applied Sciences', inGameName: 'ApexStrike', steamId: 'STEAM_0:1:94827103', email: 'dinuka.p@std.uwu.ac.lk', role: 'Entry Fragger' },
        { fullName: 'Naveen Jayasuriya', faculty: 'Faculty of Applied Sciences', inGameName: 'CryoN', steamId: 'STEAM_0:0:19283746', email: 'naveen.j@std.uwu.ac.lk', role: 'Support' },
        { fullName: 'Shehan Alwis', faculty: 'Faculty of Applied Sciences', inGameName: 'V0rtex', steamId: 'STEAM_0:1:56473829', email: 'shehan.a@std.uwu.ac.lk', role: 'Lurker' },
      ],
      status: 'APPROVED' as const,
    },
    {
      teamName: 'UWU Cyber Titans',
      teamTag: 'UWU.CT',
      university: 'Uva Wellassa University of Sri Lanka',
      logo: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80',
      captain: {
        name: 'Isuru Wickramasinghe',
        whatsappNumber: '0719876543',
        phone: '0719876543',
        faculty: 'Faculty of Technological Studies',
        email: 'isuru.w@std.uwu.ac.lk',
      },
      players: [
        { fullName: 'Isuru Wickramasinghe', faculty: 'Faculty of Technological Studies', inGameName: 'R34PER_X', steamId: 'STEAM_0:1:22334455', email: 'isuru.w@std.uwu.ac.lk', role: 'In-Game Leader' },
        { fullName: 'Sahan Fernando', faculty: 'Faculty of Technological Studies', inGameName: 'BulletStorm', steamId: 'STEAM_0:0:88776655', email: 'sahan.f@std.uwu.ac.lk', role: 'Entry Fragger' },
        { fullName: 'Minura Gunasekara', faculty: 'Faculty of Technological Studies', inGameName: 'Nighthawk', steamId: 'STEAM_0:1:99112233', email: 'minura.g@std.uwu.ac.lk', role: 'Sniper' },
        { fullName: 'Sachith De Silva', faculty: 'Faculty of Technological Studies', inGameName: 'Overclock', steamId: 'STEAM_0:0:55443322', email: 'sachith.d@std.uwu.ac.lk', role: 'Support' },
        { fullName: 'Kavindu Rathnayake', faculty: 'Faculty of Technological Studies', inGameName: 'Pulse', steamId: 'STEAM_0:1:77889900', email: 'kavindu.r@std.uwu.ac.lk', role: 'Lurker' },
      ],
      status: 'APPROVED' as const,
    },
    {
      teamName: 'UWU Apex Predators',
      teamTag: 'UWU.APX',
      university: 'Uva Wellassa University of Sri Lanka',
      logo: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=200&auto=format&fit=crop&q=80',
      captain: {
        name: 'Kavishka Ranasinghe',
        whatsappNumber: '0765432109',
        phone: '0765432109',
        faculty: 'Faculty of Management',
        email: 'kavishka.r@std.uwu.ac.lk',
      },
      players: [
        { fullName: 'Kavishka Ranasinghe', faculty: 'Faculty of Management', inGameName: 'BlitzKrieg', steamId: 'STEAM_0:1:34125678', email: 'kavishka.r@std.uwu.ac.lk', role: 'In-Game Leader' },
        { fullName: 'Harsha Mendis', faculty: 'Faculty of Management', inGameName: 'SilentScope', steamId: 'STEAM_0:0:98761234', email: 'harsha.m@std.uwu.ac.lk', role: 'Sniper' },
        { fullName: 'Oshan Liyanage', faculty: 'Faculty of Management', inGameName: 'ShadowFox', steamId: 'STEAM_0:1:87654321', email: 'oshan.l@std.uwu.ac.lk', role: 'Entry Fragger' },
        { fullName: 'Roshan Dias', faculty: 'Faculty of Management', inGameName: 'Tactix', steamId: 'STEAM_0:0:43218765', email: 'roshan.d@std.uwu.ac.lk', role: 'Support' },
        { fullName: 'Nuwan Jayawardena', faculty: 'Faculty of Management', inGameName: 'Spectre', steamId: 'STEAM_0:1:65432187', email: 'nuwan.j@std.uwu.ac.lk', role: 'Lurker' },
      ],
      status: 'APPROVED' as const,
    },
    {
      teamName: 'UWU Iron Vipers',
      teamTag: 'UWU.VIP',
      university: 'Uva Wellassa University of Sri Lanka',
      logo: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80',
      captain: {
        name: 'Janith Dissanayake',
        whatsappNumber: '0708765432',
        phone: '0708765432',
        faculty: 'Faculty of Animal Science and Export Agriculture',
        email: 'janith.d@std.uwu.ac.lk',
      },
      players: [
        { fullName: 'Janith Dissanayake', faculty: 'Faculty of Animal Science and Export Agriculture', inGameName: 'ViperKing', steamId: 'STEAM_0:1:11229988', email: 'janith.d@std.uwu.ac.lk', role: 'In-Game Leader' },
        { fullName: 'Chathura Kumara', faculty: 'Faculty of Animal Science and Export Agriculture', inGameName: 'Striker9', steamId: 'STEAM_0:0:33448877', email: 'chathura.k@std.uwu.ac.lk', role: 'Entry Fragger' },
        { fullName: 'Gayan Weerasinghe', faculty: 'Faculty of Animal Science and Export Agriculture', inGameName: 'DeagleGod', steamId: 'STEAM_0:1:55667788', email: 'gayan.w@std.uwu.ac.lk', role: 'Sniper' },
        { fullName: 'Dulith Perera', faculty: 'Faculty of Animal Science and Export Agriculture', inGameName: 'Sentinel', steamId: 'STEAM_0:0:77881122', email: 'dulith.p@std.uwu.ac.lk', role: 'Support' },
        { fullName: 'Akila Somarathna', faculty: 'Faculty of Animal Science and Export Agriculture', inGameName: 'VenomX', steamId: 'STEAM_0:1:99003344', email: 'akila.s@std.uwu.ac.lk', role: 'Lurker' },
      ],
      status: 'APPROVED' as const,
    },
    {
      teamName: 'UWU Medic Strikers',
      teamTag: 'UWU.MED',
      university: 'Uva Wellassa University of Sri Lanka',
      logo: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80',
      captain: {
        name: 'Ashen Samarajeewa',
        whatsappNumber: '0751112233',
        phone: '0751112233',
        faculty: 'Faculty of Medicine',
        email: 'ashen.s@std.uwu.ac.lk',
      },
      players: [
        { fullName: 'Ashen Samarajeewa', faculty: 'Faculty of Medicine', inGameName: 'Draco', steamId: 'STEAM_0:1:44556677', email: 'ashen.s@std.uwu.ac.lk', role: 'In-Game Leader' },
        { fullName: 'Senura Abeykoon', faculty: 'Faculty of Medicine', inGameName: 'Firebrand', steamId: 'STEAM_0:0:66778899', email: 'senura.a@std.uwu.ac.lk', role: 'Entry Fragger' },
        { fullName: 'Tharindu Fonseka', faculty: 'Faculty of Medicine', inGameName: 'Hydro', steamId: 'STEAM_0:1:88990011', email: 'tharindu.f@std.uwu.ac.lk', role: 'Sniper' },
        { fullName: 'Bawantha Silva', faculty: 'Faculty of Medicine', inGameName: 'Flashbang', steamId: 'STEAM_0:0:22338899', email: 'bawantha.s@std.uwu.ac.lk', role: 'Support' },
        { fullName: 'Chamod Karunaratne', faculty: 'Faculty of Medicine', inGameName: 'SmokeScreen', steamId: 'STEAM_0:1:44551122', email: 'chamod.k@std.uwu.ac.lk', role: 'Lurker' },
      ],
      status: 'APPROVED' as const,
    },
    {
      teamName: 'UWU Phoenix Legion',
      teamTag: 'UWU.PHX',
      university: 'Uva Wellassa University of Sri Lanka',
      logo: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&auto=format&fit=crop&q=80',
      captain: {
        name: 'Malinda Edirisinghe',
        whatsappNumber: '0783334455',
        phone: '0783334455',
        faculty: 'Faculty of Applied Sciences',
        email: 'malinda.e@std.uwu.ac.lk',
      },
      players: [
        { fullName: 'Malinda Edirisinghe', faculty: 'Faculty of Applied Sciences', inGameName: 'PhoenixFlame', steamId: 'STEAM_0:1:12398745', email: 'malinda.e@std.uwu.ac.lk', role: 'In-Game Leader' },
        { fullName: 'Lahiru Prabath', faculty: 'Faculty of Applied Sciences', inGameName: 'BlazeAWP', steamId: 'STEAM_0:0:98712365', email: 'lahiru.p@std.uwu.ac.lk', role: 'Sniper' },
        { fullName: 'Damith Cooray', faculty: 'Faculty of Applied Sciences', inGameName: 'Havoc', steamId: 'STEAM_0:1:45612378', email: 'damith.c@std.uwu.ac.lk', role: 'Entry Fragger' },
        { fullName: 'Sandun Jayakody', faculty: 'Faculty of Applied Sciences', inGameName: 'GripTape', steamId: 'STEAM_0:0:78945612', email: 'sandun.j@std.uwu.ac.lk', role: 'Support' },
        { fullName: 'Heshan Gunawardena', faculty: 'Faculty of Applied Sciences', inGameName: 'Nebula', steamId: 'STEAM_0:1:32165498', email: 'heshan.g@std.uwu.ac.lk', role: 'Lurker' },
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
  const teamMora = createdTeamsMap['UWU.CT'];
  const teamUoc = createdTeamsMap['UWU.APX'];
  const teamUop = createdTeamsMap['UWU.VIP'];

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

