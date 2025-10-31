import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ALLOWED_ORIGIN = "https://cs571-f25.github.io"; // GitHub Pages domain

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");

  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 });
  }

  const cacheKey = `weather:${lat}:${lon}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return new NextResponse(JSON.stringify(cached), {
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Content-Type": "application/json",
      },
    });
  }

  const apiRes = await fetch(
    `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${process.env.TOMORROW_API_KEY}`
  );
  const data = await apiRes.json();
  await redis.set(cacheKey, data, { ex: 600 });

  return new NextResponse(JSON.stringify(data), {
    headers: {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Content-Type": "application/json",
    },
  });
}
