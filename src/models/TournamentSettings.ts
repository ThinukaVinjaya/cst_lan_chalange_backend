import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ITournamentSettings extends Document {
  eventName: string;
  gameName: string;
  organizerName: string;
  universityName: string;
  degreeProgramme: string;
  eventDate: Date;
  registrationDeadline: Date;
  eventStatus: string;
  registrationOpen: boolean;
  tournamentFormat: string;
  maximumTeams: number;
  announcementText: string;
  rulesUrl?: string;
  livestreamUrl?: string;
  updatedAt: Date;
}

const TournamentSettingsSchema = new Schema<ITournamentSettings>(
  {
    eventName: {
      type: String,
      default: 'CST LAN Challenge 2026',
    },
    gameName: {
      type: String,
      default: 'Counter-Strike 2',
    },
    organizerName: {
      type: String,
      default: 'Computer Science and Technology Degree Programme',
    },
    universityName: {
      type: String,
      default: 'Uva Wellassa University of Sri Lanka',
    },
    degreeProgramme: {
      type: String,
      default: 'Computer Science and Technology',
    },
    eventDate: {
      type: Date,
      default: () => new Date('2026-11-20T09:00:00.000Z'),
    },
    registrationDeadline: {
      type: Date,
      default: () => new Date('2026-11-12T23:59:59.000Z'),
    },
    eventStatus: {
      type: String,
      default: 'REGISTRATIONS OPEN',
    },
    registrationOpen: {
      type: Boolean,
      default: true,
    },
    tournamentFormat: {
      type: String,
      default: '5v5 Competitive CS2 (MR12 Format)',
    },
    maximumTeams: {
      type: Number,
      default: 16,
    },
    announcementText: {
      type: String,
      default:
        'LAN Finals live at Uva Wellassa University Main Auditorium. 5v5 MR12 Counter-Strike 2 competitive ruleset.',
    },
    rulesUrl: {
      type: String,
    },
    livestreamUrl: {
      type: String,
      default: 'https://twitch.tv/cst_lan_challenge',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const TournamentSettings: Model<ITournamentSettings> =
  mongoose.models.TournamentSettings ||
  mongoose.model<ITournamentSettings>(
    'TournamentSettings',
    TournamentSettingsSchema
  );
