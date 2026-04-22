import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStaff extends Document {
  firstName: string;
  lastName: string;
  role: string;
  paymentType: "WEEKLY" | "MONTHLY";
  baseSalary: number;
  startDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    role: { type: String, required: true },
    paymentType: { type: String, enum: ["WEEKLY", "MONTHLY"], default: "WEEKLY" },
    baseSalary: { type: Number, required: true },
    startDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const Staff: Model<IStaff> =
  mongoose.models.Staff || mongoose.model<IStaff>("Staff", StaffSchema);

export default Staff;
