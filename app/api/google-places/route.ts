import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key)
    return res.status(500).json({ error: "Missing GOOGLE_MAPS_API_KEY" });

  const op = (req.query.op as string) || "";

  try {
    if (op === "autocomplete") {
      const input = String(req.query.input || "");
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input
      )}&key=${key}&types=geocode`;
      const r = await fetch(url);
      const body = await r.json();
      return res.status(200).json(body);
    }

    if (op === "geocode") {
      const placeId = String(req.query.place_id || "");
      const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(
        placeId
      )}&key=${key}`;
      const r = await fetch(url);
      const body = await r.json();
      return res.status(200).json(body);
    }

    return res.status(400).json({ error: "invalid op" });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
