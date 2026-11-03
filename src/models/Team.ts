import mongoose, { Document, Schema, Model } from 'mongoose';
import { IRegistrationPlayer, IRegistrationCaptain } from './Registration';

export interface ITeam extends Document {
  teamName: string;
  teamTag: string;
  teamLogo: string;
  logoPublicId?: string;
  university: string;
  captain: IRegistrationCaptain;
  players: IRegistrationPlayer[];
  substitute?: IRegistrationPlayer;
  registrationId: mongoose.Types.ObjectId;
  isActive: boolean;
  matchesPlayed: number;
  wins: number;
  losses: number;
  roundsWon: number;
  roundsLost: number;
  roundDiff: number;
  winRate: number;
  form: ('W' | 'L')[];
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    teamName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    teamTag: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    teamLogo: {
      type: String,
      required: true,
    },
    logoPublicId: {
      type: String,
    },
    university: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    captain: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    players: [
      {
        fullName: { type: String, required: true },
        inGameName: { type: String, required: true },
        steamId: { type: String, required: true },
        email: { type: String, required: true },
        role: { type: String, default: 'PLAYER' },
      },
    ],
    substitute: {
      fullName: { type: String },
      inGameName: { type: String },
      steamId: { type: String },
      email: { type: String },
      role: { type: String, default: 'SUBSTITUTE' },
    },
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: 'Registration',
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    matchesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    roundsWon: { type: Number, default: 0 },
    roundsLost: { type: Number, default: 0 },
    roundDiff: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    form: { type: [String], default: [] },
    points: { type: Number, default: 0, index: true },
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

TeamSchema.index({ points: -1, roundDiff: -1, wins: -1 });

export const Team: Model<ITeam> =
  mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);
