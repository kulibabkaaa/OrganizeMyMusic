import type { SupabaseClient } from "@supabase/supabase-js";

import type { GenreLabel, MoodLabel, SortRunState, TrackLanguage } from "@/types/domain";

export interface PlaylistRequestRules {
  title: string;
  languages: TrackLanguage[];
  genres: GenreLabel[];
  subgenres: string[];
  moods: MoodLabel[];
  energyMin: number | null;
  energyMax: number | null;
  excludeExplicit: boolean;
  source: "heuristic";
}

export interface ParsedPlaylistRequest {
  userPrompt: string;
  parsedRules: PlaylistRequestRules;
}

export interface StoredPlaylistRequest {
  id: string;
  userPrompt: string;
  parsedRules: PlaylistRequestRules;
}

export interface StoredPlaylistRequestSortRun {
  id: string;
  userId: string;
  librarySyncId: string;
  state: SortRunState;
  requests: StoredPlaylistRequest[];
}

export interface PlaylistRequestStore {
  getCompletedLibrarySyncForUser(input: {
    librarySyncId: string;
    userId: string;
  }): Promise<{ id: string; userId: string; status: "completed" } | null>;
  createSortRunWithPlaylistRequests(input: {
    userId: string;
    librarySyncId: string;
    requests: ParsedPlaylistRequest[];
  }): Promise<StoredPlaylistRequestSortRun>;
}

export type CreatePlaylistRequestSortRunResult =
  | {
      status: "created";
      sortRun: StoredPlaylistRequestSortRun;
    }
  | {
      status: "missing_completed_sync";
    }
  | {
      status: "too_few_requests";
      minimumRequests: number;
    };

const MIN_PLAYLIST_REQUESTS = 3;
const slavicLanguages: TrackLanguage[] = ["ukrainian", "russian", "polish"];

function normalizePrompt(prompt: string) {
  return prompt.replace(/\s+/g, " ").trim();
}

function titleCase(prompt: string) {
  return normalizePrompt(prompt)
    .split(" ")
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function parseSinglePlaylistRequest(userPrompt: string): ParsedPlaylistRequest {
  const text = userPrompt.toLowerCase();
  const languages: TrackLanguage[] = [];
  const genres: GenreLabel[] = [];
  const subgenres: string[] = [];
  const moods: MoodLabel[] = [];
  let energyMin: number | null = null;
  let energyMax: number | null = null;
  let excludeExplicit = false;

  if (text.includes("ukrainian")) {
    languages.push("ukrainian");
  }

  if (text.includes("russian")) {
    languages.push("russian");
  }

  if (text.includes("polish")) {
    languages.push("polish");
  }

  if (text.includes("mixed")) {
    languages.push("mixed");
  }

  if (text.includes("slavic")) {
    languages.push(...slavicLanguages);
  }

  if (/\b(rap|hip hop|hip-hop|trap)\b/.test(text)) {
    genres.push("Hip-Hop/Rap");
  }

  if (text.includes("electronic") || text.includes("dance")) {
    genres.push("Electronic");
  }

  if (text.includes("pop")) {
    genres.push("Pop");
  }

  if (text.includes("rock")) {
    genres.push("Rock");
  }

  if (text.includes("rap")) {
    subgenres.push("rap");
  }

  if (text.includes("trap")) {
    subgenres.push("trap");
  }

  if (text.includes("old school")) {
    subgenres.push("old school");
  }

  if (/\b(gym|workout|run|running)\b/.test(text)) {
    moods.push("Workout", "Hype");
    energyMin = 0.65;
  }

  if (/\b(sad|heartbreak|cry)\b/.test(text)) {
    moods.push("Sad", "Melancholy");
    energyMax = energyMax ?? 0.55;
  }

  if (text.includes("late night")) {
    moods.push("Late-Night", "Chill");
    energyMax = energyMax ?? 0.6;
  }

  if (text.includes("driving") || text.includes("drive")) {
    moods.push("Driving");
    energyMin = energyMin ?? 0.45;
  }

  if (/\b(chill|calm|focus|work)\b/.test(text)) {
    moods.push(text.includes("work") || text.includes("focus") ? "Focus" : "Chill");
  }

  if (/\b(clean|family)\b/.test(text)) {
    excludeExplicit = true;
  }

  return {
    userPrompt,
    parsedRules: {
      title: titleCase(userPrompt),
      languages: unique(languages),
      genres: unique(genres),
      subgenres: unique(subgenres),
      moods: unique(moods),
      energyMin,
      energyMax,
      excludeExplicit,
      source: "heuristic"
    }
  };
}

export function parsePlaylistRequestLines(playlistRequests: string[]) {
  const seen = new Set<string>();
  const requests: ParsedPlaylistRequest[] = [];

  for (const request of playlistRequests) {
    const userPrompt = normalizePrompt(request);
    const key = userPrompt.toLowerCase();

    if (!userPrompt || seen.has(key)) {
      continue;
    }

    seen.add(key);
    requests.push(parseSinglePlaylistRequest(userPrompt));
  }

  return requests;
}

export async function createPlaylistRequestSortRun(input: {
  store: PlaylistRequestStore;
  userId: string;
  librarySyncId: string;
  playlistRequests: string[];
}): Promise<CreatePlaylistRequestSortRunResult> {
  const requests = parsePlaylistRequestLines(input.playlistRequests);

  if (requests.length < MIN_PLAYLIST_REQUESTS) {
    return {
      status: "too_few_requests",
      minimumRequests: MIN_PLAYLIST_REQUESTS
    };
  }

  const sync = await input.store.getCompletedLibrarySyncForUser({
    librarySyncId: input.librarySyncId,
    userId: input.userId
  });

  if (!sync) {
    return {
      status: "missing_completed_sync"
    };
  }

  return {
    status: "created",
    sortRun: await input.store.createSortRunWithPlaylistRequests({
      userId: input.userId,
      librarySyncId: input.librarySyncId,
      requests
    })
  };
}

type SortRunRow = {
  id: string;
  user_id: string;
  library_sync_id: string;
  state: SortRunState;
};

type PlaylistRequestRow = {
  id: string;
  user_prompt: string;
  parsed_rules: PlaylistRequestRules;
};

export function createSupabasePlaylistRequestStore(
  supabase: SupabaseClient
): PlaylistRequestStore {
  return {
    async getCompletedLibrarySyncForUser(input) {
      const { data, error } = await supabase
        .from("library_syncs")
        .select("id,user_id,status")
        .eq("id", input.librarySyncId)
        .eq("user_id", input.userId)
        .eq("status", "completed")
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data
        ? {
            id: data.id as string,
            userId: data.user_id as string,
            status: "completed"
          }
        : null;
    },

    async createSortRunWithPlaylistRequests(input) {
      const { data: sortRun, error: sortRunError } = await supabase
        .from("sort_runs")
        .insert({
          user_id: input.userId,
          library_sync_id: input.librarySyncId,
          state: "draft",
          payment_status: "pending"
        })
        .select("id,user_id,library_sync_id,state")
        .single();

      if (sortRunError || !sortRun) {
        throw new Error(sortRunError?.message ?? "Unable to create sort run.");
      }

      const sortRunRow = sortRun as SortRunRow;
      const { data: requestRows, error: requestError } = await supabase
        .from("playlist_requests")
        .insert(
          input.requests.map((request) => ({
            user_id: input.userId,
            sort_run_id: sortRunRow.id,
            user_prompt: request.userPrompt,
            parsed_rules: request.parsedRules
          }))
        )
        .select("id,user_prompt,parsed_rules");

      if (requestError || !requestRows) {
        throw new Error(requestError?.message ?? "Unable to store playlist requests.");
      }

      return {
        id: sortRunRow.id,
        userId: sortRunRow.user_id,
        librarySyncId: sortRunRow.library_sync_id,
        state: sortRunRow.state,
        requests: (requestRows as PlaylistRequestRow[]).map((request) => ({
          id: request.id,
          userPrompt: request.user_prompt,
          parsedRules: request.parsed_rules
        }))
      };
    }
  };
}
