import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  comparePassword: (password: string) => Promise<boolean>;
  diet: string;
  allergies: string[];
  favoriteDishes: string[];
  likes: string[];
  dislikes: string[];
  chatHistory: ChatMessage[];
}


const UserSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  diet: {
    type: String,
    default: 'none',
  },
  allergies: {
    type: [String],
    default: [],
  },
  favoriteDishes: {
    type: [String],
    default: [],
  },
  likes: {
    type: [String],
    default: [],
  },
  dislikes: {
    type: [String],
    default: [],
  },
  chatHistory: {
    type: [
      {
        role: {type: String, required: true},
        content: {type: String, required: true},
      },
    ],
    default: [],
  },
}, {
  timestamps: true,
});

UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model<IUser>('User', UserSchema);

export default User;
