import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITransaction extends Document {
  type: "INCOME" | "EXPENSE";
  category: "REPAIR" | "PART_SALE" | "PART_PURCHASE" | "SALARY" | "INSURANCE" | "UTILITY" | "OTHER" | "ACCOUNTING";
  amount: number;
  costOfGoodsSold?: number; // Satılan Malın Maliyeti (COGS)
  description?: string;
  date: Date;
  relatedProductId?: mongoose.Types.ObjectId;
  relatedStaffId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    type: { type: String, enum: ["INCOME", "EXPENSE"], required: true },
    category: {
      type: String,
      enum: ["REPAIR", "PART_SALE", "PART_PURCHASE", "SALARY", "INSURANCE", "UTILITY", "OTHER", "ACCOUNTING"],
      required: true,
    },
    amount: { type: Number, required: true },
    costOfGoodsSold: { type: Number, default: 0 },
    description: { type: String },
    date: { type: Date, default: Date.now, required: true },
    relatedProductId: { type: Schema.Types.ObjectId, ref: "Product" },
    relatedStaffId: { type: Schema.Types.ObjectId, ref: "Staff" },
  },
  {
    timestamps: true,
  }
);

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>("Transaction", TransactionSchema);

export default Transaction;
