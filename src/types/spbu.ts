export type QueueLevel = 'smooth' | 'moderate' | 'congested' | 'empty' | 'unknown';

export type FuelStatus = 'available' | 'low' | 'out_of_stock' | 'unknown';

export interface FuelStock {
  pertalite: FuelStatus;
  pertamax: FuelStatus;
  pertamaxTurbo?: FuelStatus;
  solar: FuelStatus;
  dexlite?: FuelStatus;
}

export interface CCTVInfo {
  hasCCTV: boolean;
  sourceName?: string; // e.g. "ATCS Dishub Denpasar", "ATCS Badung"
  locationName?: string; // e.g. "Simpang Teuku Umar Barat"
  snapshotUrl?: string; // Deprecated: static snapshots replaced by citizen photos
  streamUrl?: string; // HLS or web link
  distanceMeters?: number; // Distance in meters from SPBU to CCTV camera
  lastUpdated?: string;
  notes?: string;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export type BaliRegency = 
  | 'Denpasar' 
  | 'Badung' 
  | 'Gianyar' 
  | 'Tabanan' 
  | 'Buleleng' 
  | 'Bangli' 
  | 'Klungkung' 
  | 'Karangasem' 
  | 'Jembrana';

export interface CitizenPhotoItem {
  url: string;
  createdAt: string;
  caption?: string;
  key?: string;
}

export interface SPBUItem {
  id: string;
  code: string; // e.g. "54.801.06"
  name: string; // e.g. "SPBU Pertamina Sunset Road"
  address: string;
  regency: BaliRegency;
  district: string; // e.g. "Kuta", "Denpasar Barat", "Canggu"
  coordinates: {
    lat: number;
    lng: number;
  };
  queueLevel: QueueLevel;
  estimatedWaitMinutes: number; // in minutes
  fuelStock: FuelStock;
  cctv: CCTVInfo;
  latestNote?: {
    text: string;
    createdAt: string;
  };
  latestPhoto?: CitizenPhotoItem;
  recentPhotos?: CitizenPhotoItem[];
  reportCount: number;
  upvotes: number;
  lastReportedAt: string; // ISO string
}

export interface UserReportSubmission {
  spbuId: string;
  queueLevel: QueueLevel;
  pertalite: FuelStatus;
  pertamax: FuelStatus;
  solar: FuelStatus;
  note?: string;
  photoUrl?: string;
  turnstileToken?: string;
}
