-- ============================================
-- Konggest — Création de la table SaaSAdmin
-- Exécuter dans l'éditeur SQL de Supabase
-- ============================================

-- Table des administrateurs plateforme (SaaS)
CREATE TABLE IF NOT EXISTS accounts_saasadmin (
    id BIGSERIAL PRIMARY KEY,
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id INTEGER NOT NULL UNIQUE REFERENCES auth_user(id) ON DELETE CASCADE
);

-- Index pour la recherche rapide par user_id
CREATE INDEX IF NOT EXISTS idx_saasadmin_user ON accounts_saasadmin(user_id);

-- ============================================
-- Pour promouvoir un utilisateur en SaaS Admin:
-- INSERT INTO accounts_saasadmin (user_id, is_super_admin)
-- VALUES ((SELECT id FROM auth_user WHERE email = 'taigermboumba@gmail.com'), TRUE);
-- ============================================
