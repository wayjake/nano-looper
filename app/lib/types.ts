// Room state - minimal persisted project document
export interface RoomState {
  id: string;
  tempo: number;
  padMappings: Record<string, string>; // pad index (0-15) -> sound ID
  createdAt: string;
  saved: boolean;
}

// Sound metadata
export interface Sound {
  id: string;
  roomId: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

// API response types
export interface SoundsListResponse {
  sounds: Sound[];
}

export interface SoundUploadResponse {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  roomId: string;
  createdAt: string;
}

export interface RoomSaveResponse {
  roomId: string;
  saved: boolean;
  savedAt: string;
}

export interface ApiError {
  error: string;
}
