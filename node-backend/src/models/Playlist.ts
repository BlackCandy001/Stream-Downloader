import { MediaSegment } from "./Segment.js";

export interface Playlist {
  targetDuration: number;
  mediaSequence: number;
  isLive: boolean;
  mediaInit?: MediaSegment; // fMP4 init segment
  segments: MediaSegment[];
}
