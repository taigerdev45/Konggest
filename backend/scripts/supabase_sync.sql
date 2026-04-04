-- Konggest — Supabase to Django User Synchronization Trigger
-- To be executed in the Supabase SQL Editor

-- 1. Create the function that handles the sync
CREATE OR REPLACE FUNCTION public.handle_new_supabase_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id uuid;
BEGIN
    -- Insertion dans auth_user (Django)
    -- On utilise l'email comme username car Supabase garantit l'unicité
    INSERT INTO public.auth_user (
        username, 
        email, 
        password, 
        is_superuser, 
        is_staff, 
        is_active, 
        date_joined, 
        first_name, 
        last_name
    )
    VALUES (
        NEW.email, 
        NEW.email, 
        'supabase_auth_managed', -- Mot de passe fictif
        FALSE, 
        FALSE, 
        TRUE, 
        NOW(),
        COALESCE(split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), ''),
        COALESCE(split_part(NEW.raw_user_meta_data->>'full_name', ' ', 2), '')
    )
    ON CONFLICT (username) DO UPDATE 
    SET email = EXCLUDED.email
    RETURNING id INTO new_user_id;

    -- Création automatique du UserProfile si nécessaire
    INSERT INTO public.accounts_userprofile (
        user_id, 
        role, 
        is_active, 
        created_at, 
        updated_at,
        organization_id
    )
    VALUES (
        new_user_id, 
        COALESCE(NEW.raw_user_meta_data->>'role', 'employee'), 
        TRUE, 
        NOW(), 
        NOW(),
        (SELECT id FROM public.accounts_organization WHERE slug = 'default' LIMIT 1)
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Gestion spéciale SaaS Admin via métadonnées
    IF (NEW.raw_user_meta_data->>'is_platform_admin')::boolean = TRUE THEN
        INSERT INTO public.accounts_saasadmin (
            user_id,
            supabase_id,
            is_super_admin,
            created_at
        )
        VALUES (
            new_user_id,
            NEW.id,
            TRUE,
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE
        SET supabase_id = EXCLUDED.supabase_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on the auth.users table
-- Dropping if exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_supabase_user();

-- 3. Verification message
COMMENT ON FUNCTION public.handle_new_supabase_user IS 'Synchronise automatiquement les utilisateurs Supabase Auth vers Django auth_user.';
