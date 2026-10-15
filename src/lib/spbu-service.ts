import { SPBUItem, UserReportSubmission, BaliRegency, CitizenPhotoItem } from '../types/spbu';
import { INITIAL_SPBU_DATA } from '../data/spbu-denpasar-badung';
import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'live_spbu_bali_cache';
const LAST_VOTE_KEY = 'live_spbu_user_votes';

interface SPBURow {
  id: string;
  code: string;
  name: string;
  address: string;
  regency: BaliRegency;
  district: string;
  lat: number;
  lng: number;
  queue_level: any;
  estimated_wait_minutes: number;
  fuel_stock: any;
  cctv: any;
  report_count: number;
  upvotes: number;
  last_reported_at: string;
}

function mapRowToSPBUItem(row: SPBURow): SPBUItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    address: row.address,
    regency: row.regency,
    district: row.district,
    coordinates: {
      lat: row.lat,
      lng: row.lng,
    },
    queueLevel: row.queue_level,
    estimatedWaitMinutes: row.estimated_wait_minutes,
    fuelStock: row.fuel_stock,
    cctv: row.cctv,
    reportCount: row.report_count,
    upvotes: row.upvotes,
    lastReportedAt: row.last_reported_at,
  };
}

export function normalizePhotoUrl(url?: string): string {
  if (!url) return '';
  return url
    .replace(/https:\/\/pub-[a-zA-Z0-9]+\.r2\.dev/g, 'https://cdn.livebali.my.id')
    .replace(/https:\/\/livebali\.my\.id\/spbus\//g, 'https://cdn.livebali.my.id/spbus/')
    .replace(/https:\/\/cdn\.live\.bali\.my\.id/g, 'https://cdn.livebali.my.id');
}

export function isWithin24Hours(dateString?: string): boolean {
  if (!dateString) return false;
  const time = new Date(dateString).getTime();
  if (isNaN(time)) return false;
  return Date.now() - time <= 24 * 60 * 60 * 1000;
}

export const SPBUService = {
  // Fetch initial list of SPBUs (Supabase or Local Fallback)
  async getSPBUs(): Promise<SPBUItem[]> {
    if (typeof window === 'undefined') {
      return INITIAL_SPBU_DATA;
    }

    // 1. Read locally cached updates from localStorage
    const cachedMap = new Map<string, Partial<SPBUItem>>();
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: SPBUItem[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.id) {
              cachedMap.set(item.id, item);
            }
          }
        }
      }
    } catch {
      // Ignore localStorage parse errors
    }

    // 2. If Supabase is active, fetch from remote table
    let remoteRows: SPBURow[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('spbus').select('*');
        if (!error && data && data.length > 0) {
          remoteRows = data as unknown as SPBURow[];
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local dataset:', err);
      }
    }

    // 3. Compose final list from INITIAL_SPBU_DATA, merging remote data and local cache
    const mergedList = INITIAL_SPBU_DATA.map((initial) => {
      const remote = remoteRows.find((r) => r.id === initial.id);
      const cached = cachedMap.get(initial.id);

      const baseItem: SPBUItem = {
        ...initial,
        queueLevel: remote ? remote.queue_level : (cached?.queueLevel ?? initial.queueLevel),
        estimatedWaitMinutes: remote
          ? remote.estimated_wait_minutes
          : (cached?.estimatedWaitMinutes ?? initial.estimatedWaitMinutes),
        fuelStock: remote ? remote.fuel_stock : (cached?.fuelStock ?? initial.fuelStock),
        reportCount: remote ? remote.report_count : (cached?.reportCount ?? initial.reportCount),
        upvotes: remote ? remote.upvotes : (cached?.upvotes ?? initial.upvotes),
        lastReportedAt: remote
          ? remote.last_reported_at
          : (cached?.lastReportedAt ?? initial.lastReportedAt),
        latestPhoto: cached?.latestPhoto 
          ? { ...cached.latestPhoto, url: normalizePhotoUrl(cached.latestPhoto.url) }
          : (initial.latestPhoto ? { ...initial.latestPhoto, url: normalizePhotoUrl(initial.latestPhoto.url) } : undefined),
        recentPhotos: cached?.recentPhotos 
          ? cached.recentPhotos.map(p => ({ ...p, url: normalizePhotoUrl(p.url) }))
          : (cached?.latestPhoto ? [{ ...cached.latestPhoto, url: normalizePhotoUrl(cached.latestPhoto.url) }] : undefined),
      };

      return baseItem;
    });

    // 4. Always ensure localStorage cache stays synchronized
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedList));
    } catch (e) {
      console.error(e);
    }

    return mergedList;
  },

  // Submit a crowdsourced report
  async submitReport(submission: UserReportSubmission): Promise<SPBUItem> {
    const list = await this.getSPBUs();
    const index = list.findIndex((item) => item.id === submission.spbuId);

    if (index === -1) {
      throw new Error('SPBU tidak ditemukan');
    }

    const current = list[index];
    const waitTimes: Record<string, number> = {
      smooth: 5,
      moderate: 15,
      congested: 45,
      empty: 0,
      unknown: 10,
    };

    const existingPhotos = current.recentPhotos || (current.latestPhoto ? [current.latestPhoto] : []);
    const newPhoto = submission.photoUrl
      ? {
          url: submission.photoUrl,
          createdAt: new Date().toISOString(),
          caption: submission.note && submission.note.trim() ? submission.note.trim() : undefined,
        }
      : null;

    const updatedPhotos = newPhoto
      ? [newPhoto, ...existingPhotos.filter((p) => p.url !== newPhoto.url)].slice(0, 5)
      : existingPhotos;

    const updatedItem: SPBUItem = {
      ...current,
      queueLevel: submission.queueLevel,
      estimatedWaitMinutes: waitTimes[submission.queueLevel] ?? 15,
      fuelStock: {
        ...current.fuelStock,
        pertalite: submission.pertalite,
        pertamax: submission.pertamax,
        solar: submission.solar,
      },
      latestNote: submission.note && submission.note.trim()
        ? {
            text: submission.note.trim(),
            createdAt: new Date().toISOString(),
          }
        : current.latestNote,
      latestPhoto: updatedPhotos[0] || current.latestPhoto,
      recentPhotos: updatedPhotos.length > 0 ? updatedPhotos : undefined,
      reportCount: (current.reportCount || 0) + 1,
      lastReportedAt: new Date().toISOString(),
    };

    list[index] = updatedItem;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('spbu_updated', { detail: list }));
      } catch (e) {
        console.error(e);
      }
    }

    // Server endpoint submission with Turnstile validation
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `Error status: ${response.status}`);
      }

      const resJson = await response.json();
      if (resJson.data) {
        const returned = resJson.data;
        const merged: SPBUItem = {
          ...updatedItem,
          queueLevel: returned.queue_level ?? updatedItem.queueLevel,
          estimatedWaitMinutes: returned.estimated_wait_minutes ?? updatedItem.estimatedWaitMinutes,
          fuelStock: returned.fuel_stock ?? updatedItem.fuelStock,
          reportCount: returned.report_count ?? updatedItem.reportCount,
          lastReportedAt: returned.last_reported_at ?? updatedItem.lastReportedAt,
          latestPhoto: updatedItem.latestPhoto,
          latestNote: updatedItem.latestNote,
        };
        list[index] = merged;
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
          window.dispatchEvent(new CustomEvent('spbu_updated', { detail: list }));
        }
        return merged;
      }
      return updatedItem;
    } catch (apiErr: unknown) {
      const errMsg = apiErr instanceof Error ? apiErr.message : '';
      if (errMsg && (errMsg.includes('anti-bot') || errMsg.includes('Turnstile'))) {
        throw new Error(errMsg);
      }
      console.warn('POST /api/reports failed, trying client-side fallback:', apiErr);
    }

    // Direct client-side RPC fallback
    if (isSupabaseConfigured && supabase) {
      try {
        const { error: rpcError } = await supabase.rpc('submit_spbu_report', {
          p_spbu_id: submission.spbuId,
          p_queue_level: submission.queueLevel,
          p_pertalite: submission.pertalite,
          p_pertamax: submission.pertamax,
          p_solar: submission.solar,
          p_note: submission.note || null,
          p_spbu_name: updatedItem.name,
          p_regency: updatedItem.regency,
        });

        if (rpcError) {
          await supabase.from('spbu_reports').insert({
            spbu_id: submission.spbuId,
            queue_level: submission.queueLevel,
            pertalite: submission.pertalite,
            pertamax: submission.pertamax,
            solar: submission.solar,
            note: submission.note,
            created_at: new Date().toISOString(),
          });

          await supabase
            .from('spbus')
            .update({
              queue_level: updatedItem.queueLevel,
              estimated_wait_minutes: updatedItem.estimatedWaitMinutes,
              fuel_stock: updatedItem.fuelStock,
              report_count: updatedItem.reportCount,
              last_reported_at: updatedItem.lastReportedAt,
            })
            .eq('id', submission.spbuId);
        }
      } catch (err) {
        console.warn('Failed to sync report with Supabase:', err);
      }
    }

    return updatedItem;
  },

  // Upvote report accuracy ("Data ini akurat")
  async upvoteSPBU(spbuId: string): Promise<number> {
    if (typeof window === 'undefined') return 0;

    let voted: string[] = [];
    try {
      const v = localStorage.getItem(LAST_VOTE_KEY);
      if (v) voted = JSON.parse(v);
    } catch {
      voted = [];
    }

    if (voted.includes(spbuId)) {
      throw new Error('Anda sudah mengonfirmasi laporan SPBU ini baru-baru ini.');
    }

    const list = await this.getSPBUs();
    const item = list.find((s) => s.id === spbuId);
    if (!item) throw new Error('SPBU tidak ditemukan');

    item.upvotes = (item.upvotes || 0) + 1;

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      voted.push(spbuId);
      localStorage.setItem(LAST_VOTE_KEY, JSON.stringify(voted));
      window.dispatchEvent(new CustomEvent('spbu_updated', { detail: list }));
    } catch (e) {
      console.error(e);
    }

    return item.upvotes;
  },

  // Fetch live recent citizen photos from Cloudflare R2
  async fetchSPBUPhotos(spbuId: string): Promise<CitizenPhotoItem[]> {
    if (typeof window === 'undefined') return [];
    try {
      const res = await fetch(`/api/spbu-photos?spbuId=${encodeURIComponent(spbuId)}`);
      if (!res.ok) return [];
      const json = await res.json();
      if (json.success && Array.isArray(json.photos)) {
        return json.photos.map((p: any) => ({
          url: normalizePhotoUrl(p.url),
          createdAt: p.createdAt,
          key: p.key,
        }));
      }
      return [];
    } catch (err) {
      console.warn('Failed to fetch live photos from R2:', err);
      return [];
    }
  },

  // Fetch summary of all SPBUs that have citizen photos within the last 24 hours
  async fetchVisualSummary(): Promise<{ recentSpbuIds: string[]; summary: Record<string, { url: string; createdAt: string }> }> {
    if (typeof window === 'undefined') return { recentSpbuIds: [], summary: {} };
    try {
      const res = await fetch('/api/spbu-photos?summary=true');
      if (!res.ok) return { recentSpbuIds: [], summary: {} };
      const json = await res.json();
      if (json.success) {
        return {
          recentSpbuIds: json.recentSpbuIds || [],
          summary: json.summary || {},
        };
      }
      return { recentSpbuIds: [], summary: {} };
    } catch (err) {
      console.warn('Failed to fetch visual summary from R2:', err);
      return { recentSpbuIds: [], summary: {} };
    }
  },

  // Reset demo data back to defaults
  resetToDefault(): SPBUItem[] {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(LAST_VOTE_KEY);
      window.dispatchEvent(new CustomEvent('spbu_updated', { detail: INITIAL_SPBU_DATA }));
    }
    return INITIAL_SPBU_DATA;
  },
};
