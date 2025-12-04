import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { GoogleGenAI } from "@google/genai";

const geminiKey = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: geminiKey });

async function getGeminiResponse(loc: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Given the location input surrounded by ###. Return an output formatted in latitude and longitude as shown by the examples surrounded by '''. 
      Location: ###${loc}### 
      Examples: '''43.0722,89.4008''' (for Madison, WI) or '''35.6764,139.6500''' (for Tokyo, Japan)}`,
  });

  const text = response.text || "";
  console.log(text);
  // Extract coordinates in format "latitude:longitude" from the response
  const match = text.match(/-?\d+\.\d+,-?\d+\.\d+/);
  if (!match) {
    throw new Error(
      `Failed to parse coordinates from Gemini response: ${text}`
    );
  }

  return match[0];
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN || "https://cs571-f25.github.io"; // GitHub Pages domain

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
  const loc = searchParams.get("loc");

  if (!loc) {
    return NextResponse.json({ error: "Location input" }, { status: 400 });
  }

  const cacheKey = `weather:${loc}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return new NextResponse(JSON.stringify(cached), {
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Content-Type": "application/json",
      },
    });
  }

  let apiRes = await fetch(
    `https://api.tomorrow.io/v4/weather/realtime?location=${loc}&apikey=${process.env.TOMORROW_API_KEY}`
  );

  let data;

  if (apiRes.ok) {
    data = await apiRes.json();
  } else {
    const convertedLoc = await getGeminiResponse(loc);
    apiRes = await fetch(
      `https://api.tomorrow.io/v4/weather/realtime?location=${convertedLoc}&apikey=${process.env.TOMORROW_API_KEY}`
    );
    data = await apiRes.json();
  }

  await redis.set(cacheKey, data, { ex: 3600 });

  return new NextResponse(JSON.stringify(data), {
    headers: {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Content-Type": "application/json",
    },
  });
}
