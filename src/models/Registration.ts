import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IRegistrationPlayer {
  fullName: string;
  inGameName: string;
  steamId: string;
  email: string;
  role: string;
}

export interface IRegistrationCaptain {
  name: string;
  email: string;
  phone: string;
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
  substitute?: IRegistrationPlayer;
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
    inGameName: { type: String, required: true, trim: true },
    steamId: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, default: 'PLAYER' },
  },
  { _id: false }
);

const RegistrationCaptainSchema = new Schema<IRegistrationCaptain>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
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
        message: 'Exactly 5 main players are required for registration.',
      },
    },
    substitute: {
      type: RegistrationPlayerSchema,
      required: false,
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
RegistrationSchema.index({ 'players.steamId': 1 });

export const Registration: Model<IRegistration> =
  mongoose.models.Registration ||
  mongoose.model<IRegistration>('Registration', RegistrationSchema);
