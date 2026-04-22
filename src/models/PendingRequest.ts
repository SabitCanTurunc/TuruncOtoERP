import mongoose, { Schema, Document, Model } from "mongoose";

export interface INewProductMeta {
  name: string;
  category: string;
  partNumber?: string;
  salePrice: number;
  isExistingStock: boolean;
}

export interface IVehicleServiceMeta {
  plate: string;
  description?: string;
  vehicleImage?: string;
  workListImage?: string;
  workListText?: string;
  notes?: string;
}

export interface IPendingRequest extends Document {
  type: "STOCK_ADD" | "SELL" | "VEHICLE_SERVICE";
  productId?: mongoose.Types.ObjectId;
  productName?: string;
  isNewProduct?: boolean; 
  newProductMeta?: INewProductMeta;
  vehicleMeta?: IVehicleServiceMeta;
  requestedBy: string;
  quantity?: number;
  adminPrice?: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NewProductMetaSchema = new Schema<INewProductMeta>({
  name: String,
  category: String,
  partNumber: String,
  salePrice: { type: Number, default: 0 },
  isExistingStock: { type: Boolean, default: false },
}, { _id: false });

const VehicleServiceMetaSchema = new Schema<IVehicleServiceMeta>({
  plate: { type: String, required: true },
  description: String,
  vehicleImage: String,
  workListImage: String,
  workListText: String,
  notes: String,
}, { _id: false });

const PendingRequestSchema = new Schema<IPendingRequest>(
  {
    type: { 
      type: String, 
      enum: ["STOCK_ADD", "SELL", "VEHICLE_SERVICE"], 
      required: true 
    },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String },
    isNewProduct: { type: Boolean, default: false },
    newProductMeta: { type: NewProductMetaSchema },
    vehicleMeta: { type: VehicleServiceMetaSchema },
    requestedBy: { type: String, required: true },
    quantity: { type: Number },
    adminPrice: { type: Number },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

// In Next.js dev mode, the model might be cached with an old schema. 
// We delete it if it exists to ensure the new schema is applied.
if (process.env.NODE_ENV === "development") {
  delete mongoose.models.PendingRequest;
}

const PendingRequest: Model<IPendingRequest> =
  mongoose.models.PendingRequest ||
  mongoose.model<IPendingRequest>("PendingRequest", PendingRequestSchema);

export default PendingRequest;
