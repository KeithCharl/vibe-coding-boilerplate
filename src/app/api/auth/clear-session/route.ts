import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // List of NextAuth cookie names to clear
    const nextAuthCookies = [
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "next-auth.csrf-token", 
      "__Host-next-auth.csrf-token",
      "next-auth.callback-url",
      "__Secure-next-auth.callback-url",
      "next-auth.pkce.code_verifier",
      "__Secure-next-auth.pkce.code_verifier"
    ];

    // Clear all NextAuth cookies
    nextAuthCookies.forEach(cookieName => {
      try {
        cookieStore.delete(cookieName);
      } catch (error) {
        console.log(`Could not delete cookie: ${cookieName}`);
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Session cookies cleared successfully" 
    });

  } catch (error) {
    console.error("Error clearing session cookies:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to clear session cookies" 
      },
      { status: 500 }
    );
  }
} 