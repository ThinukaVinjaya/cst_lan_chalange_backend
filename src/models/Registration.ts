import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IRegistrationPlayer {
  fullName: string;
  faculty: string;
  inGameName?: string;
  steamId?: string;
  email?: string;
  role?: string;
}

export interface IRegistrationCaptain {
  name: string;
  whatsappNumber: string;
  faculty?: string;
  email?: string;
  phone?: string;
}

export interface IRegistration extends Document {
  registrationNumber: string;
  teamName: string;
  teamTag: string;
  teamLogo: string;
  logoPublicId?: string;
  university: string;
  captain: IRegistrationCaptain;
  players: IRegistrationPlayer[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RegistrationPlayerSchema = new Schema<IRegistrationPlayer>(
  {
    fullName: { type: String, required: true, trim: true },
    faculty: { type: String, required: true, trim: true },
    inGameName: { type: String, default: '', trim: true },
    steamId: { type: String, default: '', trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    role: { type: String, default: 'PLAYER' },
  },
  { _id: false }
);

const RegistrationCaptainSchema = new Schema<IRegistrationCaptain>(
  {
    name: { type: String, required: true, trim: true },
    whatsappNumber: { type: String, required: true, trim: true },
    faculty: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
  },
  { _id: false }
);

const RegistrationSchema = new Schema<IRegistration>(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    teamName: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      index: true,
    },
    teamTag: {
      type: String,
      required: [true, 'Team tag is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    teamLogo: {
      type: String,
      required: true,
      default: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
    },
    logoPublicId: {
      type: String,
    },
    university: {
      type: String,
      required: [true, 'University is required'],
      default: 'Uva Wellassa University of Sri Lanka',
      trim: true,
      index: true,
    },
    captain: {
      type: RegistrationCaptainSchema,
      required: true,
    },
    players: {
      type: [RegistrationPlayerSchema],
      required: true,
      validate: {
        validator: function (v: IRegistrationPlayer[]) {
          return Array.isArray(v) && v.length === 5;
        },
        message: 'Exactly 5 players are required for registration.',
      },
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    rejectionReason: {
      type: String,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    reviewedAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
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

// Compound index to prevent duplicate team names or tags in active/pending states
RegistrationSchema.index({ teamName: 1, status: 1 });
RegistrationSchema.index({ teamTag: 1, status: 1 });
RegistrationSchema.index({ 'players.steamId': 1 }, { sparse: true });

export const Registration: Model<IRegistration> =
  mongoose.models.Registration ||
  mongoose.model<IRegistration>('Registration', RegistrationSchema);
