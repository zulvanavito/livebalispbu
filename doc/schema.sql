-- ====================================================================
-- LIVE SPBU BALI (Denpasar & Badung)
-- Database Schema, RLS Security, Realtime Publication, & Initial Seed
-- ====================================================================

-- 1. TABEL: spbus (Master Data SPBU & Status Realtime)
CREATE TABLE IF NOT EXISTS public.spbus (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    regency TEXT NOT NULL CHECK (regency IN ('Denpasar', 'Badung')),
    district TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    queue_level TEXT NOT NULL DEFAULT 'unknown' CHECK (queue_level IN ('smooth', 'moderate', 'congested', 'empty', 'unknown')),
    estimated_wait_minutes INTEGER NOT NULL DEFAULT 0,
    fuel_stock JSONB NOT NULL DEFAULT '{"pertalite": "available", "pertamax": "available", "solar": "available"}'::jsonb,
    cctv JSONB NOT NULL DEFAULT '{"hasCCTV": false}'::jsonb,
    report_count INTEGER NOT NULL DEFAULT 0,
    upvotes INTEGER NOT NULL DEFAULT 0,
    last_reported_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks performa query peta & filter wilayah
CREATE INDEX IF NOT EXISTS idx_spbus_regency ON public.spbus (regency);
CREATE INDEX IF NOT EXISTS idx_spbus_queue_level ON public.spbus (queue_level);

-- 2. TABEL: spbu_reports (Riwayat Laporan Crowdsourcing Warga)
CREATE TABLE IF NOT EXISTS public.spbu_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spbu_id TEXT NOT NULL REFERENCES public.spbus(id) ON DELETE CASCADE,
    queue_level TEXT NOT NULL CHECK (queue_level IN ('smooth', 'moderate', 'congested', 'empty', 'unknown')),
    pertalite TEXT NOT NULL CHECK (pertalite IN ('available', 'low', 'out_of_stock', 'unknown')),
    pertamax TEXT NOT NULL CHECK (pertamax IN ('available', 'low', 'out_of_stock', 'unknown')),
    solar TEXT NOT NULL CHECK (solar IN ('available', 'low', 'out_of_stock', 'unknown')),
    note TEXT,
    ip_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spbu_reports_spbu_id ON public.spbu_reports (spbu_id);
CREATE INDEX IF NOT EXISTS idx_spbu_reports_created_at ON public.spbu_reports (created_at DESC);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.spbus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spbu_reports ENABLE ROW LEVEL SECURITY;

-- Policy spbus: Publik diizinkan membaca data (SELECT)
DROP POLICY IF EXISTS "Public can read spbus" ON public.spbus;
CREATE POLICY "Public can read spbus" ON public.spbus
    FOR SELECT USING (true);

-- Policy spbus_reports: Publik diizinkan membaca dan mengirim laporan baru
DROP POLICY IF EXISTS "Public can read reports" ON public.spbu_reports;
CREATE POLICY "Public can read reports" ON public.spbu_reports
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert reports" ON public.spbu_reports;
CREATE POLICY "Public can insert reports" ON public.spbu_reports
    FOR INSERT WITH CHECK (true);

-- 4. FUNGSI STORED PROCEDURE: Submit Laporan & Update SPBU Secara Atomik
CREATE OR REPLACE FUNCTION public.submit_spbu_report(
    p_spbu_id TEXT,
    p_queue_level TEXT,
    p_pertalite TEXT,
    p_pertamax TEXT,
    p_solar TEXT,
    p_note TEXT DEFAULT NULL,
    p_ip_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wait_minutes INT;
    v_result JSONB;
BEGIN
    -- Estimasi waktu antrean berdasarkan level
    v_wait_minutes := CASE 
        WHEN p_queue_level = 'empty' THEN 0
        WHEN p_queue_level = 'smooth' THEN 5
        WHEN p_queue_level = 'moderate' THEN 20
        WHEN p_queue_level = 'congested' THEN 45
        ELSE 10
    END;

    -- 1. Masukkan ke riwayat laporan
    INSERT INTO public.spbu_reports (
        spbu_id, queue_level, pertalite, pertamax, solar, note, ip_hash, created_at
    ) VALUES (
        p_spbu_id, p_queue_level, p_pertalite, p_pertamax, p_solar, p_note, p_ip_hash, NOW()
    );

    -- 2. Update status SPBU master
    UPDATE public.spbus
    SET 
        queue_level = p_queue_level,
        estimated_wait_minutes = v_wait_minutes,
        fuel_stock = jsonb_set(
            jsonb_set(
                jsonb_set(fuel_stock, '{pertalite}', to_jsonb(p_pertalite)),
                '{pertamax}', to_jsonb(p_pertamax)
            ),
            '{solar}', to_jsonb(p_solar)
        ),
        report_count = report_count + 1,
        last_reported_at = NOW(),
        updated_at = NOW()
    WHERE id = p_spbu_id;

    -- Ambil data spbu terupdate
    SELECT to_jsonb(s) INTO v_result FROM public.spbus s WHERE s.id = p_spbu_id;
    RETURN v_result;
END;
$$;

-- Izinkan peran publik (anon & authenticated) mengeksekusi function
GRANT EXECUTE ON FUNCTION public.submit_spbu_report TO anon, authenticated;

-- 5. PENGAKTIFAN SUPABASE REALTIME REPLICATION
-- Mengaktifkan pengiriman event UPDATE/INSERT ke klien Next.js secara live
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'spbus'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.spbus;
    END IF;
END $$;

-- 6. SEEDING MASTER DATA 16 SPBU BALI (DENPASAR & BADUNG)
INSERT INTO public.spbus (
    id, code, name, address, regency, district, lat, lng, queue_level, estimated_wait_minutes, fuel_stock, cctv, report_count, upvotes, last_reported_at
) VALUES
-- BADUNG
(
    'spbu-sunset-road-1', '54.803.19', 'SPBU Pertamina Sunset Road (Kuta)', 'Jl. Sunset Road No. 88, Kuta, Badung', 'Badung', 'Kuta',
    -8.7042, 115.1785, 'congested', 45,
    '{"pertalite": "low", "pertamax": "available", "solar": "out_of_stock", "dexlite": "available"}'::jsonb,
    '{"hasCCTV": true, "sourceName": "ATCS Dishub Bali", "locationName": "Simpang Sunset Road - Imam Bonjol", "streamUrl": "https://atcs.denpasarkota.go.id/stream/A004TEUKUUMARPTZ1/", "snapshotUrl": "/api/cctv-proxy?cam=sunset-dewisri", "notes": "Kamera mengarah ke simpang barat menghadap arus antrean masuk SPBU"}'::jsonb,
    18, 42, NOW() - INTERVAL '5 minutes'
),
(
    'spbu-canggu-batubolong', '54.803.31', 'SPBU Pertamina Canggu (Batu Bolong)', 'Jl. Pantai Batu Bolong, Canggu, Kuta Utara, Badung', 'Badung', 'Kuta Utara',
    -8.6472, 115.1423, 'congested', 50,
    '{"pertalite": "out_of_stock", "pertamax": "available", "solar": "out_of_stock"}'::jsonb,
    '{"hasCCTV": true, "sourceName": "ATCS Dishub Bali", "locationName": "Simpang Utama Kerobokan - Canggu", "streamUrl": "https://atcs.denpasarkota.go.id/stream/A003GUNUNGSALAKPTZ/", "snapshotUrl": "/api/cctv-proxy?cam=canggu-main", "notes": "Antrean kendaraan meluber hingga bahu jalan utama"}'::jsonb,
    31, 68, NOW() - INTERVAL '2 minutes'
),
(
    'spbu-dewaruci-kuta', '54.803.02', 'SPBU Pertamina Simpang Siur (Dewa Ruci)', 'Jl. Bypass Ngurah Rai No. 100, Kuta, Badung', 'Badung', 'Kuta',
    -8.7188, 115.1832, 'moderate', 20,
    '{"pertalite": "available", "pertamax": "available", "solar": "low", "dexlite": "available"}'::jsonb,
    '{"hasCCTV": true, "sourceName": "ATCS Dishub Badung", "locationName": "Underpass Simpang Siur Dewa Ruci", "streamUrl": "https://atcs.denpasarkota.go.id/stream/A004TEUKUUMARPTZ1/", "snapshotUrl": "/api/cctv-proxy?cam=dewaruci-underpass", "notes": "Pantauan jelas dari kamera elevated Underpass Dewa Ruci"}'::jsonb,
    24, 55, NOW() - INTERVAL '8 minutes'
),
(
    'spbu-jimbaran-bypass', '54.803.11', 'SPBU Pertamina Jimbaran Bypass', 'Jl. Bypass Ngurah Rai Jimbaran, Kuta Selatan, Badung', 'Badung', 'Kuta Selatan',
    -8.7782, 115.1687, 'smooth', 5,
    '{"pertalite": "available", "pertamax": "available", "solar": "available", "dexlite": "available"}'::jsonb,
    '{"hasCCTV": true, "sourceName": "ATCS Dishub Bali", "locationName": "Simpang Jimbaran - Unud", "streamUrl": "https://atcs.denpasarkota.go.id/stream/A005BATANTAPTZ/", "snapshotUrl": "/api/cctv-proxy?cam=jimbaran-unud", "notes": "Kondisi antrean relatif lengang 2-3 kendaraan"}'::jsonb,
    9, 19, NOW() - INTERVAL '14 minutes'
),
(
    'spbu-kerobokan-raya', '54.803.22', 'SPBU Raya Kerobokan', 'Jl. Raya Kerobokan No. 72, Kerobokan Kelod, Kuta Utara, Badung', 'Badung', 'Kuta Utara',
    -8.6738, 115.1654, 'moderate', 15,
    '{"pertalite": "available", "pertamax": "available", "solar": "low"}'::jsonb,
    '{"hasCCTV": false}'::jsonb,
    14, 28, NOW() - INTERVAL '11 minutes'
),
(
    'spbu-nusa-dua-bypass', '54.803.08', 'SPBU Pertamina Nusa Dua Main Gate', 'Jl. By Pass Ngurah Rai Benoa, Kuta Selatan, Badung', 'Badung', 'Kuta Selatan',
    -8.7891, 115.2154, 'smooth', 8,
    '{"pertalite": "available", "pertamax": "available", "solar": "available", "dexlite": "available"}'::jsonb,
    '{"hasCCTV": true, "sourceName": "ATCS Dishub Badung", "locationName": "Pintu Gerbang Tol Nusa Dua", "streamUrl": "https://atcs.denpasarkota.go.id/stream/A004TEUKUUMARPTZ1/", "snapshotUrl": "/api/cctv-proxy?cam=nusadua-gate", "notes": "Lancar, pasokan baru masuk pagi ini"}'::jsonb,
    12, 31, NOW() - INTERVAL '20 minutes'
),
(
    'spbu-mengwi-terminal', '54.803.17', 'SPBU Pertamina Terminal Mengwi', 'Jl. Raya Denpasar - Gilimanuk, Mengwi, Badung', 'Badung', 'Mengwi',
    -8.5583, 115.1729, 'moderate', 18,
    '{"pertalite": "available", "pertamax": "available", "solar": "low", "dexlite": "available"}'::jsonb,
    '{"hasCCTV": true, "sourceName": "ATCS Dishub Bali", "locationName": "Simpang Terminal Mengwi", "streamUrl": "https://atcs.denpasarkota.go.id/stream/A001GUNUNGAGUNGPTZ/", "snapshotUrl": "/api/cctv-proxy?cam=mengwi-terminal", "notes": "Antrean truk solar cukup panjang di lajur kiri"}'::jsonb,
    8, 15, NOW() - INTERVAL '25 minutes'
),

-- DENPASAR
(
    'spbu-teuku-umar-barat', '54.801.06', 'SPBU Pertamina Teuku Umar Barat (Marlboro)', 'Jl. Teuku Umar Barat No. 345, Denpasar Barat', 'Denpasar', 'Denpasar Barat',
    -8.6795, 115.1884, 'congested', 40,
    '{"pertalite": "low", "pertamax": "available", "solar": "out_of_stock", "dexlite": "available"}'::jsonb,
    '{"hasCCTV": true, "sourceName": "ATCS Dishub Denpasar", "locationName": "Simpang Teuku Umar - Imam Bonjol", "streamUrl": "https://atcs.denpasarkota.go.id/stream/A004TEUKUUMARPTZ1/", "snapshotUrl": "/api/cctv-proxy?cam=marlboro-mahendradatta", "notes": "Live streaming persimpangan jalan utama Teuku Umar"}'::jsonb,
    37, 84, NOW() - INTERVAL '3 minutes'
),
(
    'spbu-sanur-bypass', '54.801.12', 'SPBU Pertamina Sanur Bypass', 'Jl. Bypass Ngurah Rai No. 240, Sanur Kauh, Denpasar Selatan', 'Denpasar', 'Denpasar Selatan',
    -8.6948, 115.2536, 'moderate', 20,
    '{"pertalite": "available", "pertamax": "available", "solar": "available", "dexlite": "available"}'::jsonb,
    '{"hasCCTV": true, "sourceName": "ATCS Dishub Denpasar", "locationName": "Simpang Sanur Hang Tuah - Hayam Wuruk", "streamUrl": "https://atcs.denpasarkota.go.id/stream/A005BATANTAPTZ/", "snapshotUrl": "/api/cctv-proxy?cam=sanur-hangtuah", "notes": "Jalur mobil lancar, antrean motor sekitar 10 baris"}'::jsonb,
    22, 49, NOW() - INTERVAL '6 minutes'
),
(
    'spbu-gatot-subroto-timur', '54.801.18', 'SPBU Pertamina Gatot Subroto Timur', 'Jl. Gatot Subroto Timur No. 120, Kesiman, Denpasar Timur', 'Denpasar', 'Denpasar Timur',
    -8.6358, 115.2415, 'congested', 35,
    '{"pertalite": "out_of_stock", "pertamax": "available", "solar": "low", "dexlite": "available"}'::jsonb,
    '{"hasCCTV": true, "sourceName": "ATCS Dishub Denpasar", "locationName": "Simpang Gatsu - Kapten Sujana", "streamUrl": "https://atcs.denpasarkota.go.id/stream/A002KAPTENSUJANAPTZ/", "snapshotUrl": "/api/cctv-proxy?cam=gatsu-tohpati", "notes": "Pertalite habis di dispenser timur, antrean dialihkan ke Pertamax"}'::jsonb,
    29, 62, NOW() - INTERVAL '4 minutes'
),
(
    'spbu-gatot-subroto-barat', '54.801.25', 'SPBU Pertamina Gatot Subroto Barat', 'Jl. Gatot Subroto Barat No. 400, Padangsambian Kaja, Denpasar Barat', 'Denpasar', 'Denpasar Barat',
    -8.6391, 115.1923, 'smooth', 10,
    '{"pertalite": "available", "pertamax": "available", "solar": "available", "dexlite": "available"}'::jsonb,
    '{"hasCCTV": true, "sourceName": "ATCS Dishub Denpasar", "locationName": "Simpang Gatsu - Gunung Agung", "streamUrl": "https://atcs.denpasarkota.go.id/stream/A001GUNUNGAGUNGPTZ/", "snapshotUrl": "/api/cctv-proxy?cam=gatsu-cokroaminoto", "notes": "Kondisi kondusif, tangki Pertamina baru saja selesai bongkar"}'::jsonb,
    16, 38, NOW() - INTERVAL '15 minutes'
),
(
    'spbu-diponegoro-denpasar', '54.801.04', 'SPBU Pertamina Diponegoro (Pesanggaran)', 'Jl. Diponegoro No. 182, Dauh Puri Klod, Denpasar Barat', 'Denpasar', 'Denpasar Barat',
    -8.6754, 115.2152, 'moderate', 25,
    '{"pertalite": "low", "pertamax": "available", "solar": "out_of_stock"}'::jsonb,
    '{"hasCCTV": true, "sourceName": "ATCS Dishub Denpasar", "locationName": "Simpang Batanta - Teuku Umar", "streamUrl": "https://atcs.denpasarkota.go.id/stream/A005BATANTAPTZ/", "snapshotUrl": "/api/cctv-proxy?cam=simpang-enam", "notes": "Arus lalu lintas padat, antrean masuk tertib"}'::jsonb,
    20, 45, NOW() - INTERVAL '9 minutes'
),
(
    'spbu-sudirman-denpasar', '54.801.09', 'SPBU Pertamina Sudirman (Depan Kampus Unud)', 'Jl. PB Sudirman No. 15, Panjer, Denpasar Selatan', 'Denpasar', 'Denpasar Selatan',
    -8.6749, 115.2268, 'smooth', 7,
    '{"pertalite": "available", "pertamax": "available", "solar": "available", "dexlite": "available"}'::jsonb,
    '{"hasCCTV": false}'::jsonb,
    11, 27, NOW() - INTERVAL '18 minutes'
),
(
    'spbu-sesetan-raya', '54.801.15', 'SPBU Pertamina Raya Sesetan', 'Jl. Raya Sesetan No. 250, Sesetan, Denpasar Selatan', 'Denpasar', 'Denpasar Selatan',
    -8.7012, 115.2217, 'empty', 0,
    '{"pertalite": "out_of_stock", "pertamax": "out_of_stock", "solar": "out_of_stock", "dexlite": "available"}'::jsonb,
    '{"hasCCTV": true, "sourceName": "ATCS Dishub Denpasar", "locationName": "Simpang Batanta - Teuku Umar", "streamUrl": "https://atcs.denpasarkota.go.id/stream/A005BATANTAPTZ/", "snapshotUrl": "/api/cctv-proxy?cam=sesetan-pegok", "notes": "SPBU tutup sementara menunggu truk tangki"}'::jsonb,
    34, 75, NOW() - INTERVAL '1 minutes'
),
(
    'spbu-imam-bonjol-denpasar', '54.801.21', 'SPBU Pertamina Imam Bonjol', 'Jl. Imam Bonjol No. 380, Pemecutan Klod, Denpasar Barat', 'Denpasar', 'Denpasar Barat',
    -8.6881, 115.1953, 'congested', 45,
    '{"pertalite": "low", "pertamax": "available", "solar": "low", "dexlite": "available"}'::jsonb,
    '{"hasCCTV": true, "sourceName": "ATCS Dishub Denpasar", "locationName": "Simpang Imam Bonjol - Soputan", "streamUrl": "https://atcs.denpasarkota.go.id/stream/A006SOPUTANPTZ/", "snapshotUrl": "/api/cctv-proxy?cam=imambonjol-sunset", "notes": "Antrean kendaraan dari arah Soputan padat merayap"}'::jsonb,
    26, 58, NOW() - INTERVAL '7 minutes'
),
(
    'spbu-hayampen-wuruk', '54.801.03', 'SPBU Pertamina Hayam Wuruk', 'Jl. Hayam Wuruk No. 154, Tanjung Bungkak, Denpasar Timur', 'Denpasar', 'Denpasar Timur',
    -8.6657, 115.2394, 'moderate', 15,
    '{"pertalite": "available", "pertamax": "available", "solar": "out_of_stock"}'::jsonb,
    '{"hasCCTV": false}'::jsonb,
    15, 30, NOW() - INTERVAL '13 minutes'
)
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    regency = EXCLUDED.regency,
    district = EXCLUDED.district,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    fuel_stock = EXCLUDED.fuel_stock,
    cctv = EXCLUDED.cctv,
    updated_at = NOW();
