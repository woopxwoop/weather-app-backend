import { NextResponse } from "next/server";

const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN || "https://cs571-f25.github.io"; // GitHub Pages domain

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function jsonWithCors(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export async function OPTIONS(_: Request) {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return jsonWithCors({ error: "Missing GOOGLE_MAPS_API_KEY" }, 500);
  }

  const urlObj = new URL(req.url);
  const op = urlObj.searchParams.get("op") || "";

  try {
    if (op === "autocomplete") {
      const input = urlObj.searchParams.get("input") || "";
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input
      )}&key=${encodeURIComponent(key)}&types=geocode`;
      const r = await fetch(url);
      const body = await r.json();
      return jsonWithCors(body);
    }

    if (op === "geocode") {
      const placeId = urlObj.searchParams.get("place_id") || "";
      const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(
        placeId
      )}&key=${encodeURIComponent(key)}`;
      const r = await fetch(url);
      const body = await r.json();
      return jsonWithCors(body); // <-- was missing CORS headers
    }

    if (op === "reverse" || op === "reverse_geocode") {
      const lat = urlObj.searchParams.get("lat") || "";
      const lng = urlObj.searchParams.get("lng") || "";
      if (!lat || !lng) {
        return jsonWithCors(
          { error: "Missing lat or lng for reverse geocode" },
          400
        );
      }

      const latlng = `${lat},${lng}`;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
        latlng
      )}&key=${encodeURIComponent(key)}`;

      const r = await fetch(url);
      const body = await r.json();
      return jsonWithCors(body);
    }

    return jsonWithCors({ error: "invalid op" }, 400);
  } catch (err: any) {
    return jsonWithCors({ error: err?.message || String(err) }, 500);
  }
}
