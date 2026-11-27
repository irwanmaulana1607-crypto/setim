import dns from "node:dns/promises";
import net from "node:net";
import { NextResponse } from "next/server";

const isPrivateAddress = (address: string) => {
  if (net.isIPv6(address)) return true;
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => Number.isNaN(part))) return true;
  return octets[0] === 10 || octets[0] === 127 || octets[0] === 0 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 169 && octets[1] === 254);
};

const validatePublicUrl = async (value: string) => {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error("Only public HTTP(S) URLs are allowed.");
  }
  if (url.hostname === "localhost" || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) {
    throw new Error("Private network URLs are not allowed.");
  }
  const addresses = net.isIP(url.hostname) ? [url.hostname] : (await dns.lookup(url.hostname, { all: true })).map((entry) => entry.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) throw new Error("The URL resolves to a private network.");
  return url;
};

const clean = (value: string) => value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 1000);
const getMeta = (html: string, property: string) => {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i");
  return html.match(pattern)?.[1] ?? "";
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as { url?: string };
    if (!body.url?.trim()) return NextResponse.json({ error: "URL is required." }, { status: 400 });
    const url = await validatePublicUrl(body.url.trim());
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000), headers: { "User-Agent": "SetimLinkPreview/1.0" } });
    if (!response.ok || response.headers.get("content-type")?.includes("text/html") !== true) {
      return NextResponse.json({ preview: { url: url.toString(), title: url.hostname, description: "", thumbnail: "", domain: url.hostname } });
    }
    const html = (await response.text()).slice(0, 1_000_000);
    const title = clean(getMeta(html, "og:title") || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || url.hostname);
    const description = clean(getMeta(html, "og:description") || getMeta(html, "description"));
    const image = getMeta(html, "og:image");
    const thumbnail = image ? new URL(image, url).toString() : "";
    return NextResponse.json({ preview: { url: url.toString(), title, description, thumbnail, domain: url.hostname } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Link preview unavailable." }, { status: 400 });
  }
}
