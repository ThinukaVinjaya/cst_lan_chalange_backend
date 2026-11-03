import mongoose, { Document, Schema, Model } from 'mongoose';
import { CS2_MAPS, MATCH_STATUSES } from '../utils/validators';

export type CS2MapName = typeof CS2_MAPS[number];
export type MatchStatusType = typeof MATCH_STATUSES[number];

export interface IMatch extends Document {
  matchNumber?: number;
  stage: string;
  teamA: mongoose.Types.ObjectId;
  teamB: mongoose.Types.ObjectId;
  teamAName: string;
  teamATag: string;
  teamALogo: string;
  teamBName: string;
  teamBTag: string;
  teamBLogo: string;
  mapName: CS2MapName;
  scheduledAt: Date;
  status: MatchStatusType;
  scoreA: number;
  scoreB: number;
  winner?: mongoose.Types.ObjectId;
  mvp?: string;
  streamUrl?: string;
  currentRound: number;
  half: 1 | 2 | 'OT';
  c4Planted: boolean;
  roundHistory: ('teamA' | 'teamB')[];
  teamASide: 'CT' | 'T';
  teamBSide: 'CT' | 'T';
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema = new Schema<IMatch>(
  {
    matchNumber: {
      type: Number,
      index: true,
    },
    stage: {
      type: String,
      required: true,
      trim: true,
    },
    teamA: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    teamB: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    teamAName: { type: String, required: true },
    teamATag: { type: String, required: true },
    teamALogo: { type: String, required: true },
    teamBName: { type: String, required: true },
    teamBTag: { type: String, required: true },
    teamBLogo: { type: String, required: true },
    mapName: {
      type: String,
      enum: CS2_MAPS,
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: MATCH_STATUSES,
      default: 'UPCOMING',
      index: true,
    },
    scoreA: {
      type: Number,
      default: 0,
    },
    scoreB: {
      type: Number,
      default: 0,
    },
    winner: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
    },
    mvp: {
      type: String,
    },
    streamUrl: {
      type: String,
    },
    currentRound: {
      type: Number,
      default: 0,
    },
    half: {
      type: Schema.Types.Mixed,
      default: 1,
    },
    c4Planted: {
      type: Boolean,
      default: false,
    },
    roundHistory: {
      type: [String],
      default: [],
    },
    teamASide: {
      type: String,
      enum: ['CT', 'T'],
      default: 'CT',
    },
    teamBSide: {
      type: String,
      enum: ['CT', 'T'],
      default: 'T',
    },
    publishedAt: {
      type: Date,
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

MatchSchema.index({ status: 1, scheduledAt: -1 });

export const Match: Model<IMatch> =
  mongoose.models.Match || mongoose.model<IMatch>('Match', MatchSchema);
