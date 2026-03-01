export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  src: string;
  img: string;
  isLocal: boolean;
  fileName?: string;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
}

export type RepeatMode = 0 | 1 | 2;
export type TabIndex = 0 | 1 | 2 | 3;
