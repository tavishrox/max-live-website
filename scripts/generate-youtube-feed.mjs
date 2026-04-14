import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_CHANNEL_ID = 'UC8Fy07TKY0txLxOgj7edHCA';
const CHANNEL_ID = (process.env.VITE_YT_CHANNEL_ID || DEFAULT_CHANNEL_ID).trim();
const OUTPUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../public/youtube-videos.json');

const decodeHtml = (value = '') => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .trim();

const getTag = (entry, tagName) => {
  const match = entry.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return decodeHtml(match?.[1] || '');
};

const getAttr = (entry, tagName, attrName) => {
  const match = entry.match(new RegExp(`<${tagName}[^>]*\\s${attrName}="([^"]+)"`, 'i'));
  return decodeHtml(match?.[1] || '');
};

const getAlternateLink = (entry) => {
  const match = entry.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i);
  return decodeHtml(match?.[1] || '');
};

const summarizeDescription = (value) => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized;
};

const isShort = (video) => {
  const textBlob = `${video.title || ''} ${video.description || ''}`;
  return (video.url || '').includes('/shorts/') || /\b#shorts\b/i.test(textBlob);
};

const parseVideos = (xmlText) => {
  const entries = [...xmlText.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map((match) => match[1]);

  return entries.map((entry, index) => {
    const videoId = getTag(entry, 'yt:videoId');
    const title = getTag(entry, 'title') || getTag(entry, 'media:title') || 'Latest video';
    const description = getTag(entry, 'media:description');
    const thumbnail = getAttr(entry, 'media:thumbnail', 'url');
    const url = getAlternateLink(entry) || (videoId ? `https://youtu.be/${videoId}` : '');
    const published = getTag(entry, 'published');
    const updated = getTag(entry, 'updated');

    return {
      id: videoId || `feed-video-${index}`,
      title,
      description: summarizeDescription(description) || 'Watch the newest upload on YouTube.',
      videoId,
      thumbnail,
      url,
      published,
      updated
    };
  }).filter((video) => video.url && !isShort(video)).slice(0, 6);
};

const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(CHANNEL_ID)}`, {
  headers: { Accept: 'application/atom+xml,text/xml,application/xml,*/*' }
});

if (!response.ok) {
  throw new Error(`YouTube RSS fetch failed: ${response.status}`);
}

const videos = parseVideos(await response.text());

if (videos.length === 0) {
  throw new Error('YouTube RSS fetch returned no usable videos');
}

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  channelId: CHANNEL_ID,
  videos
}, null, 2)}\n`);

console.log(`Generated ${videos.length} YouTube videos at ${OUTPUT_PATH}`);
