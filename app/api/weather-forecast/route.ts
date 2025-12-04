import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN || "https://cs571-f25.github.io";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

export async function OPTIONS(_: Request) {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(req: Request) {
  try {
    const WEATHER_BASE =
      process.env.WEATHER_API_BASE_URL ||
      "https://api.tomorrow.io/v4/timelines";
    const key = process.env.WEATHER_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "Missing WEATHER_API_KEY" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const urlObj = new URL(req.url);
    const qp = urlObj.searchParams;

    // Required: location (format: "lat,lng")
    const location = qp.get("location") || qp.get("latlng") || "";
    if (!location) {
      return NextResponse.json(
        { error: "Missing required query param: location (lat,lng)" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const cacheKey = `weather-forecast:${location}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return new NextResponse(JSON.stringify(cached), {
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Content-Type": "application/json",
        },
      });
    }

    // Optional params with sensible defaults
    const fields = qp.get("fields") || "temperature";
    const timesteps = qp.get("timesteps") || "1h";
    let startTime = qp.get("startTime");
    let endTime = qp.get("endTime");
    const units = qp.get("units") || "imperial";
    const timezone = qp.get("timezone") || "UTC";

    // Default to now UTC -> +2 days if start/end not provided
    if (!startTime || !endTime) {
      const now = new Date();
      startTime = now.toISOString();
      endTime = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Build API URL
    const apiUrl = new URL(WEATHER_BASE);
    apiUrl.searchParams.set("location", location);
    apiUrl.searchParams.set("fields", fields);
    apiUrl.searchParams.set("timesteps", timesteps);
    apiUrl.searchParams.set("startTime", startTime);
    apiUrl.searchParams.set("endTime", endTime);
    apiUrl.searchParams.set("units", units);
    apiUrl.searchParams.set("timezone", timezone);
    apiUrl.searchParams.set("apikey", key);

    const resp = await fetch(apiUrl.toString(), {
      headers: { Accept: "application/json" },
    });

    const body = await resp.json();

    await redis.set(cacheKey, body, { ex: 86400 });

    return NextResponse.json(body, {
      status: resp.ok ? 200 : resp.status,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
