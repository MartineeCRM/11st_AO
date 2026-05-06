# Trigger Mapping Manual Override — Design Spec

**Date:** 2026-05-06  
**Status:** Approved

---

## Problem

Braze API does not reliably return `trigger_action` for all Action-Based campaigns. These campaigns are grouped under `(알 수 없는 트리거)` in the TriggerEventCards component, making the trigger event view incomplete.

## Solution

Allow users to manually assign a trigger name to each unmapped campaign via a modal UI. Mappings are stored in Supabase at the project level so all project members see the same data.

---

## Data Storage

Add a `trigger_mappings` JSONB column to the `projects` table:

```sql
ALTER TABLE projects ADD COLUMN trigger_mappings JSONB NOT NULL DEFAULT '{}';
```

Schema: `{ [campaignId: string]: string }` — maps campaign ID to a trigger name string.

---

## UI Flow

1. In `TriggerEventCards`, the `(알 수 없는 트리거)` group header shows a pencil icon button.
2. Clicking the button opens `TriggerMappingModal`.
3. Modal displays all unmapped campaigns (those currently in the unknown group) as a list.
4. Each campaign row has:
   - Campaign name (read-only)
   - Channel badge (read-only)
   - Trigger name field: combobox — shows existing trigger names as dropdown options, also accepts free text input for new trigger names
5. Save button upserts `trigger_mappings` JSON to Supabase.
6. After save, `groupByTrigger()` applies mappings as a fallback: if `c.trigger_action` is empty/null, use `trigger_mappings[c.id]`. Mapped campaigns move to their correct trigger group.

---

## Components

### `TriggerMappingModal.tsx` (new)
- Props: `campaigns: EnrichedCampaign[]`, `existingTriggers: string[]`, `savedMappings: Record<string, string>`, `onSave: (mappings: Record<string, string>) => void`, `onClose: () => void`
- Local state: draft mappings (copy of savedMappings, edited in place)
- Combobox per row: filters existing trigger names on input, allows free text
- Save calls `onSave` with merged mappings (savedMappings + draft changes)

### `TriggerEventCards.tsx` (modified)
- Accepts `triggerMappings: Record<string, string>` and `onSaveMappings` props
- `groupByTrigger()` updated: `key = c.trigger_action || triggerMappings[c.id] || '(알 수 없는 트리거)'`
- Pencil button shown only when unknown group exists
- Passes `existingTriggers` (all known trigger names from mapped groups) to modal

### `useProject.ts` (modified)
- Include `trigger_mappings` in project fetch/type
- Expose `saveTriggerMappings(mappings)` function that upserts to Supabase

### `CRMCampaignOps.tsx` (modified)
- Passes `triggerMappings` and `onSaveMappings` down to `TriggerEventCards`

---

## Error Handling

- Save failure: show inline error in modal footer, keep modal open
- Empty input: rows with no trigger name entered are ignored (not saved)

---

## Out of Scope

- Mapping campaigns that already have a `trigger_action` from Braze API
- Bulk import / CSV upload
- Per-user mappings
