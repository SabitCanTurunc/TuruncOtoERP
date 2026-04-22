import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPurchase {
  price: number;
  quantity: number;
  date: Date;
}

export interface IProduct extends Document {
  name: string;
  category: string;
  partNumber?: string;
  stock: number;
  purchases: IPurchase[];
  averagePurchasePrice: number;
  salePrice: number;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseSchema = new Schema<IPurchase>({
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    partNumber: { type: String },
    stock: { type: Number, default: 0 },
    // Dizi içerisinde her alımın (parti) alış fiyatı ve adedi tutulacak
    purchases: [PurchaseSchema],
    // Ortalama alış maliyeti, purchases üzerinden hesaplanarak güncellenecek
    averagePurchasePrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0, required: true },
  },
  {
    timestamps: true,
  }
);

// Mongoose modeli
const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
