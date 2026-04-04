-- Konggest — Fixed & Robust Sync Trigger
-- Handling missing organizations and cleanup

CREATE OR REPLACE FUNCTION public.handle_new_supabase_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id integer;
    default_org_id integer;
BEGIN
    -- 1. Insert into Django auth_user
    INSERT INTO public.auth_user (
        username, email, password, is_superuser, is_staff, is_active, date_joined, first_name, last_name
    )
    VALUES (
        NEW.email, NEW.email, 'managed_by_supabase', FALSE, FALSE, TRUE, NOW(),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ''
    )
    ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email
    RETURNING id INTO new_user_id;

    -- 2. Find default organization
    SELECT id INTO default_org_id FROM public.accounts_organization WHERE slug = 'default' LIMIT 1;

    -- 3. Create UserProfile
    INSERT INTO public.accounts_userprofile (
        user_id, role, is_active, created_at, updated_at, organization_id
    )
    VALUES (
        new_user_id, 
        COALESCE(NEW.raw_user_meta_data->>'role', 'employee'), 
        TRUE, NOW(), NOW(), default_org_id
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- 4. SaaS Admin promotion if metadata flag is present
    IF (NEW.raw_user_meta_data->>'is_platform_admin')::boolean = TRUE THEN
        INSERT INTO public.accounts_saasadmin (user_id, supabase_id, is_super_admin, created_at)
        VALUES (new_user_id, NEW.id, TRUE, NOW())
        ON CONFLICT (user_id) DO UPDATE SET supabase_id = EXCLUDED.supabase_id;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail user creation in Supabase
    RAISE WARNING 'Sync trigger failed for user %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_supabase_user();
