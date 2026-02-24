import { Parser } from "m3u8-parser";
import { Playlist } from "../models/Playlist.js";
import { MediaSegment } from "../models/Segment.js";
import { StreamSpec } from "../models/StreamSpec.js";
import { httpClient } from "../utils/HTTPClient.js";
import { logger } from "../utils/Logger.js";

export class HLSParser {
  static resolveUrl(baseUrl: string, relativeUrl: string): string {
    return new URL(relativeUrl, baseUrl).href;
  }

  async parse(url: string): Promise<StreamSpec[]> {
    logger.info(`Fetching playlist from: ${url}`);
    const content = await httpClient.get(url);
    const parser = new Parser();
    parser.push(content);
    parser.end();

    const manifest = parser.manifest;

    if (manifest.playlists && manifest.playlists.length > 0) {
      // It's a Master Playlist (Variant Playlist)
      return manifest.playlists.map((p: any) => ({
        url: HLSParser.resolveUrl(url, p.uri),
        bandwidth: p.attributes.BANDWIDTH,
        resolution: p.attributes.RESOLUTION
          ? `${p.attributes.RESOLUTION.width}x${p.attributes.RESOLUTION.height}`
          : undefined,
        codecs: p.attributes.CODECS,
      }));
    } else {
      // It's a Media Playlist
      const playlist = this.mapMediaPlaylist(url, manifest);
      return [
        {
          url: url,
          playlist: playlist,
        },
      ];
    }
  }

  private mapMediaPlaylist(baseUrl: string, manifest: any): Playlist {
    const segments: MediaSegment[] = manifest.segments.map(
      (s: any, index: number) => {
        const segmentUrl = HLSParser.resolveUrl(baseUrl, s.uri);
        const encryptInfo = s.key
          ? {
              method: s.key.method,
              keyUri: s.key.uri
                ? HLSParser.resolveUrl(baseUrl, s.key.uri)
                : undefined,
              iv: s.key.iv ? s.key.iv : undefined, // Note: m3u8-parser might not give Uint8Array directly
            }
          : { method: "NONE" as const };

        return {
          url: segmentUrl,
          duration: s.duration,
          index: index,
          encryptInfo: encryptInfo,
          filename: `segment_${index}.ts`,
        };
      },
    );

    return {
      targetDuration: manifest.targetDuration,
      mediaSequence: manifest.mediaSequence,
      isLive: !manifest.endList,
      segments: segments,
    };
  }
}
