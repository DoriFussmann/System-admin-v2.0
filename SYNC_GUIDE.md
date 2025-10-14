# Database & JSON Sync Guide

This guide explains how to keep your database and JSON files synchronized.

## Overview

The Night Ventures app uses **PostgreSQL database as the primary data source** for:
- Users (`prisma.user`)
- Pages (`prisma.page`)
- Projects, Tasks, etc.

The JSON files in the `content/` directory are used as **backups and configuration files**.

## Current State

### Pages in Database (5 pages):
- `home` → Home
- `bva` → BvA Dashboard
- `csm` → CSM Dashboard
- `chatkit` → AI Assistant
- `admin` → Admin

### Users in Database (3 users):
1. **dori@thenightventures.com** (Dori Fussmann) - SUPERADMIN
   - Access: All pages (home, bva, csm, chatkit, admin)

2. **dori@gmail.com** (Dori Dori)
   - Project: Snout
   - Access: CSM only

3. **adrian@nubraces.com** (Adrian Leshem)
   - Project: No Black Swan
   - Access: None currently

## Sync Scripts

### Available Commands

```bash
# Sync users from database to JSON files
npm run db:sync-users

# Sync pages from JSON to database
npm run db:sync-pages

# Update all users to include all pages in their pageAccess
npm run db:update-page-access
```

### When to Use Each Script

#### `db:sync-users`
Run this whenever you:
- Add, edit, or delete users through the admin panel
- Want to backup current users to JSON
- Need to see what's in the database

```bash
npm run db:sync-users
```

**Output:** Updates `content/users.json` and `backup_users.json` with current database state.

#### `db:sync-pages`
Run this whenever you:
- Add or modify pages in `content/pages.json`
- Want to ensure admin shows all available pages
- Add a new page to the site

```bash
npm run db:sync-pages
```

**Output:** Creates/updates pages in the database from JSON.

#### `db:update-page-access`
Run this whenever you:
- Add new pages to the site
- Want to ensure all users have all pages in their pageAccess config
- Need to bulk update user permissions

```bash
npm run db:update-page-access
```

**Output:** Updates all users to include all pages, preserving existing access settings, then syncs to JSON.

## Workflow for Adding a New Page

1. Create the page route in `app/[page-name]/page.tsx`
2. Add the page to `content/pages.json`:
   ```json
   { "slug": "new-page", "label": "New Page" }
   ```
3. Run sync scripts:
   ```bash
   npm run db:sync-pages
   npm run db:update-page-access
   ```
4. The admin panel will now show the new page for access management

## Admin Panel

The admin panel (`/admin`) displays:
- All pages from the **database** (not JSON)
- All users from the **database** (not JSON)

When you grant/revoke page access through the admin panel:
- Changes are saved to the **database** immediately
- Run `npm run db:sync-users` to update JSON backups

## Important Notes

⚠️ **Database is the Source of Truth**
- The application reads from the database, not JSON files
- JSON files are for backup and configuration only

✅ **Best Practice**
- After making changes through the admin panel, run `npm run db:sync-users`
- After adding new pages to JSON, run `npm run db:sync-pages`
- Keep JSON files in sync for backup purposes

🔄 **Automatic Sync (Future Enhancement)**
Consider adding automatic sync hooks in the API endpoints to keep everything in sync automatically.

## Files Created

- `scripts/syncUsersToJson.js` - Export users from DB to JSON
- `scripts/syncPagesToDb.js` - Import pages from JSON to DB
- `scripts/updateAllUserPageAccess.js` - Update all users with all pages

## Summary

Your system is now fully configured with:
- ✅ 5 pages synced between JSON and database
- ✅ 3 users with proper page access configuration
- ✅ All users include all 5 pages in their pageAccess
- ✅ JSON files synced with database
- ✅ Admin panel will show all pages for access management

