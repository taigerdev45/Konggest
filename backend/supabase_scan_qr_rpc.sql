-- ==============================================================================
-- AT16 : RPC Supabase `scan_qr` (PostgreSQL Function)
-- Atomicité complète pour la validation du token HMAC et l'enregistrement du pointage
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.scan_qr(
    p_token TEXT,
    p_scan_type TEXT,
    p_employee_id UUID,
    p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_qr_session RECORD;
    v_time_entry RECORD;
    v_today DATE := CURRENT_DATE;
    v_now TIME := CURRENT_TIME;
    v_worked_hours NUMERIC;
BEGIN
    -- 1. Validation du type de scan
    IF p_scan_type NOT IN ('in', 'out') THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'scan_type doit être "in" ou "out"');
    END IF;

    -- 2. Recherche et validation de la session QR
    SELECT * INTO v_qr_session 
    FROM time_tracking_qrsession 
    WHERE token = p_token AND organization_id = p_tenant_id AND date = v_today AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Session QR invalide ou non trouvée');
    END IF;

    IF CURRENT_TIMESTAMP > v_qr_session.expires_at THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Le QR Code a expiré');
    END IF;

    -- 3. Vérification de la double utilisation (anti-replay) pour cet employé + ce type de scan
    IF EXISTS (
        SELECT 1 FROM time_tracking_qrscan 
        WHERE qr_session_id = v_qr_session.id AND employee_id = p_employee_id AND scan_type = p_scan_type
    ) THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Vous avez déjà pointé ce statut');
    END IF;

    -- ===========================
    -- SCAN IN (Arrivée)
    -- ===========================
    IF p_scan_type = 'in' THEN
        -- Vérifier si le pointage existe déjà pour aujourd'hui
        SELECT * INTO v_time_entry FROM time_tracking_timeentry WHERE employee_id = p_employee_id AND date = v_today;
        
        IF FOUND THEN
            RETURN jsonb_build_object('status', 'error', 'message', 'Vous êtes déjà pointé pour aujourd''hui');
        END IF;

        -- Insérer Pointage
        INSERT INTO time_tracking_timeentry (employee_id, date, check_in, break_minutes, scanned_via_qr, created_at)
        VALUES (p_employee_id, v_today, v_now, 60, true, NOW())
        RETURNING * INTO v_time_entry;

        -- Tracer le scan
        INSERT INTO time_tracking_qrscan (qr_session_id, employee_id, scan_type, scanned_at)
        VALUES (v_qr_session.id, p_employee_id, 'in', NOW());

        RETURN jsonb_build_object(
            'status', 'success',
            'action', 'checked_in',
            'check_in', v_time_entry.check_in,
            'message', 'Arrivée validée'
        );
    END IF;

    -- ===========================
    -- SCAN OUT (Départ)
    -- ===========================
    IF p_scan_type = 'out' THEN
        SELECT * INTO v_time_entry FROM time_tracking_timeentry WHERE employee_id = p_employee_id AND date = v_today;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('status', 'error', 'message', 'Vous n''avez pas encore pointé votre arrivée');
        END IF;

        IF v_time_entry.check_out IS NOT NULL THEN
            RETURN jsonb_build_object('status', 'error', 'message', 'Sortie déjà enregistrée pour aujourd''hui');
        END IF;

        -- Calculer le temps de travail (approximatif si fait en SQL, mieux fait par un trigger ou le backend)
        v_worked_hours := EXTRACT(EPOCH FROM (v_now::time - v_time_entry.check_in::time)) / 3600.0 - (v_time_entry.break_minutes / 60.0);
        IF v_worked_hours < 0 THEN v_worked_hours := 0; END IF;

        -- Mettre à jour Pointage
        UPDATE time_tracking_timeentry
        SET check_out = v_now, scanned_via_qr = true
        WHERE id = v_time_entry.id
        RETURNING * INTO v_time_entry;

        -- Tracer le scan
        INSERT INTO time_tracking_qrscan (qr_session_id, employee_id, scan_type, scanned_at)
        VALUES (v_qr_session.id, p_employee_id, 'out', NOW());

        RETURN jsonb_build_object(
            'status', 'success',
            'action', 'checked_out',
            'check_in', v_time_entry.check_in,
            'check_out', v_time_entry.check_out,
            'worked_hours', ROUND(v_worked_hours, 2),
            'message', 'Départ validé'
        );
    END IF;

END;
$$;
