import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

type newsItem = {
  title: string;
  link: string;
  pubDate: string;
  source?: string;
};

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const loc = searchParams.get("loc") || "";

  const query = `weather ${loc}`;

  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
    query
  )}`;

  const xml = await fetch(rssUrl).then((r) => r.text());

  const parser = new XMLParser();
  const data = parser.parse(xml);

  // Google News RSS format:
  // data.rss.channel.item = array of articles
  const articles = data.rss.channel.item.map((item: newsItem) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    source: item["source"], // some feeds have <source>
  }));

  return NextResponse.json(articles, { headers: CORS_HEADERS });
}
