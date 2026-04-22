import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await connectToDatabase();
    // Exclude password field
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Kullanıcılar getirilemedi" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { username, password, role } = await req.json();

    if (!username || !password || !role) {
      return NextResponse.json({ success: false, error: "Tüm alanları doldurun" }, { status: 400 });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return NextResponse.json({ success: false, error: "Kullanıcı adı zaten var" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ username, password: hashedPassword, role });
    
    // Convert to object and delete pass immediately
    const userObj = newUser.toObject();
    delete userObj.password;

    return NextResponse.json({ success: true, data: userObj }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Kullanıcı oluşturulamadı" }, { status: 500 });
  }
}
