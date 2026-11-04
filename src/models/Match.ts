import mongoose, { Document, Schema, Model } from 'mongoose';
import { CS2_MAPS, MATCH_STATUSES } from '../utils/validators';

export type CS2MapName = typeof CS2_MAPS[number];
export type MatchStatusType = typeof MATCH_STATUSES[number];

export interface IMatch extends Document {
  matchNumber?: number;
  stage: string;
  teamA?: mongoose.Types.ObjectId;
  teamB?: mongoose.Types.ObjectId;
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
  bracketRound?: 'quarterfinals' | 'semifinals' | 'final' | 'third_place' | 'groups';
  bracketPosition?: number;
  nextMatchNumber?: number;
  nextMatchSlot?: 'teamA' | 'teamB';
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
      required: false,
    },
    teamB: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: false,
    },
    teamAName: { type: String, default: 'TBD' },
    teamATag: { type: String, default: 'TBD' },
    teamALogo: { type: String, default: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80' },
    teamBName: { type: String, default: 'TBD' },
    teamBTag: { type: String, default: 'TBD' },
    teamBLogo: { type: String, default: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80' },
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
    bracketRound: {
      type: String,
      enum: ['quarterfinals', 'semifinals', 'final', 'third_place', 'groups'],
      default: 'groups',
      index: true,
    },
    bracketPosition: {
      type: Number,
    },
    nextMatchNumber: {
      type: Number,
    },
    nextMatchSlot: {
      type: String,
      enum: ['teamA', 'teamB'],
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
