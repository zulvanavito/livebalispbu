import { SPBUItem, UserReportSubmission, BaliRegency } from '../types/spbu';
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

export const SPBUService = {
  // Fetch initial list of SPBUs (Supabase or Local Fallback)
  async getSPBUs(): Promise<SPBUItem[]> {
    if (typeof window === 'undefined') {
      return INITIAL_SPBU_DATA;
    }

    // Try reading cached/updated state from localStorage
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: SPBUItem[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Return all initial SPBUs, overlaying cached user reports where present
          return INITIAL_SPBU_DATA.map((initial) => {
            const cached = parsed.find((p) => p.id === initial.id);
            if (cached) {
              return {
                ...initial,
                queueLevel: cached.queueLevel ?? initial.queueLevel,
                estimatedWaitMinutes: cached.estimatedWaitMinutes ?? initial.estimatedWaitMinutes,
                fuelStock: cached.fuelStock ?? initial.fuelStock,
                reportCount: cached.reportCount ?? initial.reportCount,
                upvotes: cached.upvotes ?? initial.upvotes,
                lastReportedAt: cached.lastReportedAt ?? initial.lastReportedAt,
                latestNote: cached.latestNote ?? initial.latestNote,
                latestPhoto: cached.latestPhoto ?? initial.latestPhoto,
              };
            }
            return initial;
          });
        }
      }
    } catch {
      // Ignore localStorage parse errors
    }

    // If Supabase is active, fetch from remote table
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('spbus').select('*');
        if (!error && data && data.length > 0) {
          const remoteRows = data as unknown as SPBURow[];
          return INITIAL_SPBU_DATA.map((initial) => {
            const row = remoteRows.find((r) => r.id === initial.id);
            if (row) {
              const item = mapRowToSPBUItem(row);
              return {
                ...initial,
                queueLevel: item.queueLevel,
                estimatedWaitMinutes: item.estimatedWaitMinutes,
                fuelStock: item.fuelStock,
                reportCount: item.reportCount,
                upvotes: item.upvotes,
                lastReportedAt: item.lastReportedAt,
              };
            }
            return initial;
          });
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local dataset:', err);
      }
    }

    // Save initial data to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SPBU_DATA));
      } catch (e) {
        console.error(e);
      }
    }

    return INITIAL_SPBU_DATA;
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
      latestPhoto: submission.photoUrl
        ? {
            url: submission.photoUrl,
            createdAt: new Date().toISOString(),
          }
        : current.latestPhoto,
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
        const mapped = mapRowToSPBUItem(resJson.data);
        if (updatedItem.latestNote) {
          mapped.latestNote = updatedItem.latestNote;
        }
        if (updatedItem.latestPhoto) {
          mapped.latestPhoto = updatedItem.latestPhoto;
        }
        list[index] = mapped;
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
          window.dispatchEvent(new CustomEvent('spbu_updated', { detail: list }));
        }
        return mapped;
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
