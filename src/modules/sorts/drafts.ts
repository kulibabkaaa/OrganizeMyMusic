import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { LibrarySyncStatus } from "@/modules/library-syncs/queue";
import type {
  PaymentStatus,
  SortRunState,
  SortSourceProvider
} from "@/types/domain";

export interface SortDraft {
  id: string;
  userId: string;
  librarySyncId: string | null;
  name: string;
  sourceProvider: SortSourceProvider;
  state: SortRunState;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PreviewReadiness {
  canPreview: boolean;
  disabledReason: string | null;
}

export interface SortDraftStore {
  getLibrarySyncForUser(input: {
    userId: string;
    librarySyncId: string;
  }): Promise<{ id: string; status: LibrarySyncStatus } | null>;
  createSortDraft(input: {
    userId: string;
    librarySyncId?: string | null;
    name: string;
    sourceProvider: SortSourceProvider;
  }): Promise<SortDraft>;
  getSortDraft(input: { userId: string; sortId: string }): Promise<SortDraft | null>;
  updateSortDraft(input: {
    userId: string;
    sortId: string;
    values: SortDraftUpdateInput;
  }): Promise<SortDraft | null>;
}

export const createSortDraftSchema = z.object({
  name: z.string().trim().min(1).max(120),
  librarySyncId: z.string().uuid().optional().nullable(),
  sourceProvider: z.literal("apple_music").default("apple_music")
});

export const updateSortDraftSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  librarySyncId: z.string().uuid().optional().nullable()
});

export type SortDraftCreateInput = z.infer<typeof createSortDraftSchema>;
export type SortDraftUpdateInput = z.infer<typeof updateSortDraftSchema>;

export type SortDraftMutationResult =
  | {
      status: "created" | "updated";
      sort: SortDraft;
      preview: PreviewReadiness;
    }
  | {
      status: "missing_library_sync" | "not_found";
    };

type SortDraftRow = {
  id: string;
  user_id: string;
  library_sync_id: string | null;
  name: string | null;
  source_provider: SortSourceProvider;
  state: SortRunState;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
};

export async function createSortDraft(input: {
  store: SortDraftStore;
  userId: string;
  input: unknown;
}): Promise<SortDraftMutationResult> {
  const draftInput = createSortDraftSchema.parse(input.input);
  const sync = draftInput.librarySyncId
    ? await input.store.getLibrarySyncForUser({
        userId: input.userId,
        librarySyncId: draftInput.librarySyncId
      })
    : null;

  if (draftInput.librarySyncId && !sync) {
    return { status: "missing_library_sync" };
  }

  const sort = await input.store.createSortDraft({
    userId: input.userId,
    librarySyncId: draftInput.librarySyncId,
    name: draftInput.name,
    sourceProvider: draftInput.sourceProvider
  });

  return {
    status: "created",
    sort,
    preview: getPreviewReadiness(sync?.status ?? null)
  };
}

export async function updateSortDraft(input: {
  store: SortDraftStore;
  userId: string;
  sortId: string;
  input: unknown;
}): Promise<SortDraftMutationResult> {
  const values = updateSortDraftSchema.parse(input.input);
  const sync = values.librarySyncId
    ? await input.store.getLibrarySyncForUser({
        userId: input.userId,
        librarySyncId: values.librarySyncId
      })
    : null;

  if (values.librarySyncId && !sync) {
    return { status: "missing_library_sync" };
  }

  const sort = await input.store.updateSortDraft({
    userId: input.userId,
    sortId: input.sortId,
    values
  });

  if (!sort) {
    return { status: "not_found" };
  }

  const resolvedSync =
    sync ??
    (sort.librarySyncId
      ? await input.store.getLibrarySyncForUser({
          userId: input.userId,
          librarySyncId: sort.librarySyncId
        })
      : null);

  return {
    status: "updated",
    sort,
    preview: getPreviewReadiness(resolvedSync?.status ?? null)
  };
}

export function getPreviewReadiness(status: LibrarySyncStatus | null): PreviewReadiness {
  if (!status) {
    return {
      canPreview: false,
      disabledReason: "Connect and sync Apple Music before previewing this Sort."
    };
  }

  if (status !== "completed") {
    return {
      canPreview: false,
      disabledReason: "Library sync must finish before previewing this Sort."
    };
  }

  return {
    canPreview: true,
    disabledReason: null
  };
}

export function createSupabaseSortDraftStore(supabase: SupabaseClient): SortDraftStore {
  return {
    async getLibrarySyncForUser(input) {
      const { data, error } = await supabase
        .from("library_syncs")
        .select("id,status")
        .eq("id", input.librarySyncId)
        .eq("user_id", input.userId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data
        ? {
            id: data.id as string,
            status: data.status as LibrarySyncStatus
          }
        : null;
    },

    async createSortDraft(input) {
      const { data, error } = await supabase
        .from("sort_runs")
        .insert({
          user_id: input.userId,
          library_sync_id: input.librarySyncId ?? null,
          name: input.name,
          source_provider: input.sourceProvider,
          state: "draft",
          payment_status: "pending"
        })
        .select(sortDraftSelect)
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Unable to create Sort draft.");
      }

      return mapSortDraftRow(data as SortDraftRow);
    },

    async getSortDraft(input) {
      const { data, error } = await supabase
        .from("sort_runs")
        .select(sortDraftSelect)
        .eq("id", input.sortId)
        .eq("user_id", input.userId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data ? mapSortDraftRow(data as SortDraftRow) : null;
    },

    async updateSortDraft(input) {
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if ("name" in input.values) {
        patch.name = input.values.name;
      }

      if ("librarySyncId" in input.values) {
        patch.library_sync_id = input.values.librarySyncId ?? null;
      }

      const { data, error } = await supabase
        .from("sort_runs")
        .update(patch)
        .eq("id", input.sortId)
        .eq("user_id", input.userId)
        .eq("state", "draft")
        .select(sortDraftSelect)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data ? mapSortDraftRow(data as SortDraftRow) : null;
    }
  };
}

const sortDraftSelect =
  "id,user_id,library_sync_id,name,source_provider,state,payment_status,created_at,updated_at";

function mapSortDraftRow(row: SortDraftRow): SortDraft {
  return {
    id: row.id,
    userId: row.user_id,
    librarySyncId: row.library_sync_id,
    name: row.name ?? "Untitled Sort",
    sourceProvider: row.source_provider,
    state: row.state,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
