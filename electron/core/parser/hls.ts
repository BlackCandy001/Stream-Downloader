import { fetchWithTimeout } from "../utils/net.js";
import { Parser } from "m3u8-parser";
import fs from "fs/promises";
import path from "path";

export interface HLSStream {
  id: string;
  type: "video" | "audio" | "subtitle";
  bandwidth?: number;
  resolution?: string;
  codecs?: string;
  url: string;
}

export interface HLSMetadata {
  title: string;
  streams: HLSStream[];
  version?: number;
}

export class HLSParser {
  static resolveUrl(baseUrl: string, relativeUrl: string): string {
    return new URL(relativeUrl, baseUrl).href;
  }

  /**
   * Extracts m3u8/mpd URLs from HTML/text content using robust regex.
   * Handles escaped slashes and common stream extensions.
   */
  static extractStreamUrls(text: string): string[] {
    const streamRegex =
      /https?(?::|\\:)(?:\/\/|\\\/\\\/)[^\s"'<>]+?\.(?:m3u8|mpd|m3u)(?:[^\s"'<>]*)/gi;
    const matches = text.match(streamRegex) || [];

    // Deduplicate and unescape slashes
    return Array.from(new Set(matches)).map((url) => url.replace(/\\/g, ""));
  }

  async parse(
    url: string,
    headers: Record<string, string> = {},
  ): Promise<HLSMetadata> {
    const response = await fetchWithTimeout(url, { headers });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch manifest [${response.status} ${response.statusText}]: ${url}`,
      );
    }
    const manifestText = await response.text();

    console.log(
      `[HLSParser] parse: Received ${manifestText.length} bytes from ${url}`,
    );
    const isM3U8 = manifestText.trim().startsWith("#EXTM3U");
    if (!isM3U8) {
      console.warn(
        `[HLSParser] parse: Not a valid M3U8. Attempting to extract URLs from response...`,
      );

      const extractedUrls = HLSParser.extractStreamUrls(manifestText);
      if (extractedUrls.length > 0) {
        console.log(
          `[HLSParser] Found ${extractedUrls.length} potential M3U8 URL(s) in HTML. Trying the first one: ${extractedUrls[0]}`,
        );
        // Try to parse the first extracted URL
        return this.parse(extractedUrls[0], headers);
      }

      console.error(
        `[HLSParser] parse: NOT a valid M3U8 and no URLs extracted (first 500 chars):\n  ${manifestText.slice(0, 500)}`,
      );
      // Write to file for full analysis
      try {
        const debugPath = "debug_response.html";
        await fs.writeFile(debugPath, manifestText);
        console.log(
          `[HLSParser] Full response written to: ${path.resolve(debugPath)}`,
        );
      } catch (e) {
        console.warn(`[HLSParser] Could not write debug file: ${e}`);
      }

      throw new Error(
        `Server returned non-M3U8 response and no stream URLs could be extracted for: ${url}`,
      );
    }

    const parser = new Parser() as any;
    parser.push(manifestText);
    parser.end();

    const manifest = parser.manifest;
    const streams: HLSStream[] = [];

    if (manifest.playlists && manifest.playlists.length > 0) {
      // Master Playlist
      manifest.playlists.forEach((p: any, idx: number) => {
        streams.push({
          id: `video-${idx}`,
          type: "video",
          bandwidth: p.attributes.BANDWIDTH,
          resolution: p.attributes.RESOLUTION
            ? `${p.attributes.RESOLUTION.width}x${p.attributes.RESOLUTION.height}`
            : undefined,
          codecs: p.attributes.CODECS,
          url: HLSParser.resolveUrl(url, p.uri),
        });
      });
    } else {
      // Media Playlist
      streams.push({
        id: "video-0",
        type: "video",
        url: url,
      });
    }

    return {
      title: "HLS Stream",
      streams,
      version: manifest.version,
    };
  }

  async getSegments(
    url: string,
    headers: Record<string, string> = {},
  ): Promise<any[]> {
    const response = await fetchWithTimeout(url, { headers });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch media playlist [${response.status} ${response.statusText}]: ${url}`,
      );
    }
    const manifestText = await response.text();

    // Debug: check if response is actually an M3U8
    const isM3U8 = manifestText.trim().startsWith("#EXTM3U");
    if (!isM3U8) {
      console.error(
        `[HLSParser] getSegments: NOT a valid M3U8 (first 200 chars):\n  ${manifestText.slice(0, 200)}`,
      );
      throw new Error(`Server returned non-M3U8 response for: ${url}`);
    }

    const parser = new Parser() as any;
    parser.push(manifestText);
    parser.end();

    const manifest = parser.manifest;
    const baseUrl = url;

    const segments = (manifest.segments || []).map((s: any, index: number) => {
      const segmentUrl = HLSParser.resolveUrl(baseUrl, s.uri);
      const encryptInfo = s.key
        ? {
            method: s.key.method,
            keyUri: s.key.uri
              ? HLSParser.resolveUrl(baseUrl, s.key.uri)
              : undefined,
            iv: s.key.iv ? s.key.iv : undefined,
          }
        : { method: "NONE" };

      return {
        url: segmentUrl,
        duration: s.duration,
        index: index,
        encryptInfo: encryptInfo,
      };
    });

    console.log(
      `[HLSParser] getSegments: ${segments.length} segments from ${url}`,
    );
    if (segments.length === 0 && (manifest.playlists?.length ?? 0) > 0) {
      console.warn(
        `[HLSParser] Warning: looks like a master playlist (${manifest.playlists.length} playlists found).`,
      );
    }

    return segments;
  }
}
