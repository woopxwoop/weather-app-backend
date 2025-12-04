import { NextResponse } from "next/server";

const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN || "https://cs571-f25.github.io"; // GitHub Pages domain

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

export async function OPTIONS(_: Request) {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Missing GOOGLE_MAPS_API_KEY" },
      { status: 500, headers: CORS_HEADERS }
    );
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
      return NextResponse.json(body, { headers: CORS_HEADERS });
    }

    if (op === "geocode") {
      const placeId = urlObj.searchParams.get("place_id") || "";
      const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(
        placeId
      )}&key=${encodeURIComponent(key)}`;
      const r = await fetch(url);
      const body = await r.json();
      return NextResponse.json(body);
    }

    if (op === "reverse" || op === "reverse_geocode") {
      const lat = urlObj.searchParams.get("lat") || "";
      const lng = urlObj.searchParams.get("lng") || "";
      if (!lat || !lng) {
        return NextResponse.json(
          { error: "Missing lat or lng for reverse geocode" },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const latlng = `${lat},${lng}`;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
        latlng
      )}&key=${encodeURIComponent(key)}`;

      const r = await fetch(url);
      const body = await r.json();
      return NextResponse.json(body, { headers: CORS_HEADERS });
    }

    return NextResponse.json(
      { error: "invalid op" },
      { status: 400, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
