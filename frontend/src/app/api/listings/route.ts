import { NextResponse } from "next/server";
import { getFeedListings } from "@/lib/listings";

export async function GET() {
  const listings = await getFeedListings();
  return NextResponse.json({ listings });
}
