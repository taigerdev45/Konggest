# Konggest — Application SaaS de Gestion du Personnel

Application SaaS complète de gestion des ressources humaines, adaptée à tous les secteurs d'activité. Tous les services sont conteneurisés, les communications chiffrées HTTPS, et le système durci contre les attaques connues.

## Stack Technologique

| Composant | Technologie |
| :--- | :--- |
| Frontend | Next.js 14 + React 18 |
| Backend | Django 5 + Django REST Framework |
| Base de données | PostgreSQL 15 (Supabase) |
| Cache | Redis 7 |
| Reverse Proxy | Nginx (HTTPS/TLS 1.3) |
| Conteneurs | Docker + Docker Compose |

## Démarrage Rapide

### Prérequis

- Docker Desktop installé

### Lancer l'application

```bash
# Cloner le projet
cd konggest

# Lancer tous les conteneurs
docker-compose up --build

# L'app est accessible sur :
# https://localhost (HTTPS)
```

### Accès

- **Frontend** : `https://localhost`
- **API Backend** : `https://localhost/api/`
- **Django Admin** : `https://localhost/admin/`

## Modules

| Module | Description |
| :--- | :--- |
| Dashboard | KPIs, graphiques, vue d'ensemble |
| Employés | CRUD, profils, organigramme |
| Congés | Demandes, approbations, soldes |
| Paie | Fiches de paie, cotisations |
| Documents | Upload/download, templates |
| Pointage | Check-in/out, heures sup |
| Recrutement | Offres, pipeline, entretiens |
| Performance | Évaluations, objectifs |
| Notifications | Alertes temps réel |
| Administration | Multi-tenant, RBAC |

## Sécurité

- **HTTPS/TLS 1.3** via Nginx
- **Rate limiting** par endpoint
- **JWT** avec rotation automatique
- **Argon2** pour le hashing des mots de passe
- **AES-256-GCM** pour les données sensibles
- **RBAC** (Admin → RH → Manager → Employé)
- **CORS strict**, **CSP**, **HSTS**
- **Anti-brute force** avec blocage IP
- **Audit logging** complet
- Conteneurs **non-root**

## Structure

```text
konggest/
├── docker-compose.yml     # Orchestration
├── nginx/                 # Reverse proxy + WAF
├── frontend/              # Next.js (React)
│   └── src/app/           # Pages (App Router)
├── backend/               # Django (API REST)
│   ├── apps/              # 9 applications métier
│   └── core/              # Middleware, cache, sécurité
└── .env                   # Variables d'environnement
```

## Développement

```bash
# Backend uniquement
docker-compose up konggest-backend konggest-db konggest-redis

# Frontend uniquement (avec hot reload)
cd frontend && npm run dev

# Migrations Django
docker-compose exec konggest-backend python manage.py migrate

# Créer un super admin
docker-compose exec konggest-backend python manage.py createsuperuser
```

---

**Konggest** © 2026 — Gestion RH SaaS
