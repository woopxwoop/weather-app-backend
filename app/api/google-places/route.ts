import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Missing GOOGLE_MAPS_API_KEY" },
      { status: 500 }
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
      return NextResponse.json(body);
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

    return NextResponse.json({ error: "invalid op" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
