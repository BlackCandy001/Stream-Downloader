import { Playlist } from "./Playlist.js";

export interface StreamSpec {
  url: string;
  bandwidth?: number;
  codecs?: string;
  resolution?: string;
  language?: string;
  mediaType?: "VIDEO" | "AUDIO" | "SUBTITLES";
  groupId?: string;
  playlist?: Playlist;
}
