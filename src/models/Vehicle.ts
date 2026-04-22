import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVehicleEntry {
  date: Date;
  vehicleImage?: string; // Cloudinary URL
  workListImage?: string; // Cloudinary URL
  workListText?: string;
  notes?: string;
  createdBy: string;
}

export interface IVehicle extends Document {
  plate: string; // Unique, Uppercase, No spaces
  description?: string;
  history: IVehicleEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const VehicleEntrySchema = new Schema<IVehicleEntry>(
  {
    date: { type: Date, default: Date.now },
    vehicleImage: { type: String },
    workListImage: { type: String },
    workListText: { type: String },
    notes: { type: String },
    createdBy: { type: String, required: true },
  },
  { _id: true, timestamps: true }
);

const VehicleSchema = new Schema<IVehicle>(
  {
    plate: { 
      type: String, 
      required: true, 
      unique: true, 
      uppercase: true, 
      trim: true,
      index: true
    },
    description: { type: String },
    history: [VehicleEntrySchema],
  },
  { timestamps: true }
);

const Vehicle: Model<IVehicle> =
  mongoose.models.Vehicle || mongoose.model<IVehicle>("Vehicle", VehicleSchema);

export default Vehicle;
