import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { signJwt } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: "Kullanıcı adı ve şifre zorunludur" }, { status: 400 });
    }

    // MASTER KEY KONTROLÜ
    // Kullanıcı .env içerisindeki master key'i şifre olarak girerse hesabı DB'den bağımsız olarak SUPERADMIN yetkisiyle açılır.
    if (process.env.MASTER_ADMIN_KEY && password === process.env.MASTER_ADMIN_KEY) {
      const tokenPayload = {
        userId: "master-admin",
        username: username, // Kendi belirlediği isimle giriş yapmış saysın
        role: "SUPERADMIN",
      };
      
      const token = await signJwt(tokenPayload, "7d");
      const cookieStore = await cookies();
      cookieStore.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
        sameSite: "strict"
      });
      return NextResponse.json({ success: true, data: { username: username, role: "SUPERADMIN" } });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json({ success: false, error: "Kullanıcı adı veya şifre hatalı." }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch) {
      return NextResponse.json({ success: false, error: "Şifre yanlış." }, { status: 401 });
    }

    // Normal DB kullanıcısı token oluşturma
    const tokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    };
    
    const token = await signJwt(tokenPayload, "7d");

    // Prepare response, set cookie
    const response = NextResponse.json({ success: true, data: { username: user.username, role: user.role } });
    
    // Set httpOnly cookie. Must use Promise for cookies() in Next 15.
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
      sameSite: "strict"
    });

    return response;
  } catch (error: any) {
    console.error("Login API err:", error);
    return NextResponse.json({ success: false, error: "Giriş yapılamadı" }, { status: 500 });
  }
}
