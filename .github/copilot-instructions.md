# Mirza Admin Panel - AI Coding Instructions

## Project Overview
Vehicle rental admin panel built with **Next.js 16 (App Router)**, **TypeScript**, **Supabase** (auth + database), **Zustand** for state, and **shadcn/ui** (new-york style) + **TailwindCSS v4**.

## Architecture

### Authentication & Authorization
- **Middleware-based auth**: [src/middleware.ts](src/middleware.ts) → [src/lib/supabase/middleware.ts](src/lib/supabase/middleware.ts) handles session validation and role-based redirects
- **Roles**: `admin` (full CRUD), `personnel` (limited delete), `customer` (blocked from panel)
- **Auth state**: Managed via Zustand in [src/stores/authStore.ts](src/stores/authStore.ts) with `useAuthStore()` hook
- Use `isAdmin(profile?.role)` and `canDelete(profile?.role, resource)` helpers for permission checks

### Supabase Client Usage
```typescript
// Client components (browser)
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

// Server components (SSR)
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
```

### Data Types
All database types are defined in [src/types/database.ts](src/types/database.ts). Key entities: `Profile`, `Vehicle`, `Campaign`, `Document`, `Request`, `RequestResponse`, `ServiceHistory`, `CustomerVehicle`.

## Key Patterns

### Page Structure (CRUD Pages)
Standard pattern used in [src/app/vehicles/page.tsx](src/app/vehicles/page.tsx), [src/app/customers/page.tsx](src/app/customers/page.tsx):
1. `'use client'` directive for interactive pages
2. State: `data[]`, `filteredData[]`, `isLoading`, `selectedItem`, dialog states
3. `useEffect` → `fetchData()` on mount
4. `DataTable` component with columns, search, actions
5. Dialog-based forms for add/edit operations
6. `toast()` from sonner for notifications

### DataTable Component
Use [src/components/ui/data-table.tsx](src/components/ui/data-table.tsx) for lists:
```tsx
<DataTable
  data={items}
  columns={[{ header: 'Name', accessor: 'name' }]}
  keyExtractor={(item) => item.id}
  onSearch={handleSearch}
  actions={(item) => <ActionButtons item={item} />}
/>
```

### File Uploads
Use helpers from [src/lib/storage.ts](src/lib/storage.ts):
```typescript
import { uploadFile, deleteFile, replaceFile } from '@/lib/storage';
const result = await uploadFile(file, { bucket: 'vehicle-images', folder: 'cars' });
```
Buckets: `vehicle-images`, `campaign-images`, `documents`

### User Creation
New users are created via Supabase Edge Function at `/functions/v1/create-user` (requires service role). See [supabase/functions/create-user/index.ts](supabase/functions/create-user/index.ts).

## UI Components
- Use existing shadcn components from `@/components/ui/*`
- Icons: `lucide-react` (e.g., `<Car />`, `<Plus />`, `<Trash2 />`)
- Layout wrapper: `DashboardLayout` auto-applied in root layout
- Confirmations: Use `<ConfirmDialog>` for destructive actions
- Toasts: `import { toast } from 'sonner'` → `toast.success()`, `toast.error()`

## Commands
```bash
bun dev        # Start dev server
bun build      # Production build
bun lint       # Run ESLint
```

## Conventions
- **Language**: UI text in Turkish (e.g., "Kaydet", "Sil", "Düzenle")
- **Path aliases**: `@/` maps to `src/` directory
- **Form validation**: Manual checks with toast errors (no form libraries for simple forms)
- **Loading states**: Spinner component via `isLoading` state
- **Error handling**: try/catch with `console.error` + `toast.error()`
- **Date formatting**: Use `date-fns` with Turkish locale when needed
