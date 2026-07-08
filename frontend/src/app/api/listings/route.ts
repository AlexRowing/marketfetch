import { NextResponse } from "next/server";
import { getFeedListings } from "@/lib/listings";
import { DEMO_USER_ID } from "@/lib/demo-user";

export async function GET() {
  const listings = await getFeedListings(DEMO_USER_ID);
  return NextResponse.json({ listings });
}
