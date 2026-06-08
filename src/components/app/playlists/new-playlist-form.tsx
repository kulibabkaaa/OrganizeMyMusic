"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { PlaylistRecipeTag, PlaylistRecipeTagCategory } from "@/types/domain";

type PlaylistCreateResponse = {
  playlist?: {
    id: string;
  };
  error?: string;
};

export function NewPlaylistForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [genres, setGenres] = useState("");
  const [moods, setMoods] = useState("");
  const [language, setLanguage] = useState("");
  const [activity, setActivity] = useState("");
  const [energy, setEnergy] = useState("");
  const [targetMax, setTargetMax] = useState("50");
  const [allowExplicit, setAllowExplicit] = useState(true);
  const [showRecipeFields, setShowRecipeFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPlaylistId, setCreatedPlaylistId] = useState<string | null>(null);

  return (
    <form
      className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
          const playlistId =
            createdPlaylistId ??
            (await createPlaylist({
              name,
              description
            }));

          if (!playlistId) {
            return;
          }

          setCreatedPlaylistId(playlistId);

          if (createdPlaylistId) {
            const playlistUpdateResponse = await fetch(
              `/api/app/playlists/${encodeURIComponent(createdPlaylistId)}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name,
                  description
                })
              }
            );
            const playlistUpdatePayload = (await playlistUpdateResponse.json().catch(() => null)) as
              | { error?: string }
              | null;

            if (!playlistUpdateResponse.ok) {
              setError(playlistUpdatePayload?.error ?? "Playlist could not be updated.");
              return;
            }
          }

          const recipeResponse = await fetch(
            `/api/app/playlists/${encodeURIComponent(playlistId)}/recipe`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
                playlistNote: note,
                targetTrackMin: null,
                targetTrackMax: Number.parseInt(targetMax, 10) || null,
                duplicatePolicy: "avoid_duplicates",
                allowExplicit,
                includeLibraryOnly: true,
                tags: buildTags({
                  genres,
                  moods,
                  language,
                  activity,
                  energy
                })
              })
            }
          );
          const recipePayload = (await recipeResponse.json().catch(() => null)) as
            | { error?: string }
            | null;

          if (!recipeResponse.ok) {
            setError(
              recipePayload?.error ??
                "Playlist was created, but the recipe could not be saved. Retry the recipe or open the playlist to finish it."
            );
            return;
          }

          router.push(`/app/playlists/${playlistId}`);
          router.refresh();
        } catch (error) {
          if (error instanceof PlaylistCreateError) {
            setError(error.message);
            return;
          }

          throw error;
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <Card elevated className="p-7 lg:col-span-2">
        <StatusPill label="Saved playlist" tone="pink" />
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-[0em] text-white">
          Create playlist
        </h2>
        <p className="mt-3 text-sm leading-7 text-platform-secondary">
          Make the playlist object first. The recipe stays inside it and can be regenerated from
          your synced Apple Music library.
        </p>

        <div className="mt-6 space-y-5">
          <Field label="Playlist name" htmlFor="playlist-name">
            <input
              id="playlist-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
              placeholder="Ukrainian Rap"
            />
          </Field>
          <Field label="Description" htmlFor="playlist-description">
            <textarea
              id="playlist-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={inputClassName}
              rows={4}
              placeholder="High-energy Ukrainian rap from my saved library."
            />
          </Field>
        </div>
      </Card>

      <Card className="p-7 lg:col-span-2">
        <StatusPill label="Recipe fields" tone="success" />
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">
              Matching rules
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-platform-secondary">
              Optional recipe fields help generation later. You can also finish them inside the playlist workspace.
            </p>
          </div>
          <Button
            type="button"
            variant="glass"
            aria-expanded={showRecipeFields}
            aria-controls="playlist-recipe-fields"
            onClick={() => setShowRecipeFields((current) => !current)}
          >
            {showRecipeFields ? "Hide matching rules" : "Add matching rules"}
          </Button>
        </div>

        {showRecipeFields ? (
          <div id="playlist-recipe-fields">
            <div className="mt-6">
              <Field label="Recipe instructions" htmlFor="playlist-note">
                <textarea
                  id="playlist-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className={inputClassName}
                  rows={4}
                  placeholder="Keep it energetic, modern, and avoid soft pop features."
                />
              </Field>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Genres" htmlFor="playlist-genres" hint="Comma separated.">
                <input
                  id="playlist-genres"
                  value={genres}
                  onChange={(event) => setGenres(event.target.value)}
                  className={inputClassName}
                  placeholder="rap, hip-hop"
                />
              </Field>
              <Field label="Moods" htmlFor="playlist-moods" hint="Comma separated.">
                <input
                  id="playlist-moods"
                  value={moods}
                  onChange={(event) => setMoods(event.target.value)}
                  className={inputClassName}
                  placeholder="Workout, Hype"
                />
              </Field>
              <Field label="Language" htmlFor="playlist-language">
                <input
                  id="playlist-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className={inputClassName}
                  placeholder="ukrainian"
                />
              </Field>
              <Field label="Activity" htmlFor="playlist-activity">
                <select
                  id="playlist-activity"
                  value={activity}
                  onChange={(event) => setActivity(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">None</option>
                  <option value="workout">Workout</option>
                  <option value="driving">Driving</option>
                  <option value="focus">Focus</option>
                  <option value="party">Party</option>
                  <option value="late night">Late night</option>
                </select>
              </Field>
              <Field label="Energy" htmlFor="playlist-energy">
                <select
                  id="playlist-energy"
                  value={energy}
                  onChange={(event) => setEnergy(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Any</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </Field>
              <Field label="Target tracks" htmlFor="playlist-target">
                <input
                  id="playlist-target"
                  type="number"
                  min={1}
                  max={500}
                  value={targetMax}
                  onChange={(event) => setTargetMax(event.target.value)}
                  className={inputClassName}
                />
              </Field>
            </div>

            <label className="mt-6 flex min-h-11 items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-platform-secondary">
              <input
                type="checkbox"
                checked={allowExplicit}
                onChange={(event) => setAllowExplicit(event.target.checked)}
                className="h-5 w-5 rounded border-white/20 bg-black/30"
              />
              Allow explicit tracks
            </label>
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-[1rem] border border-[rgba(255,69,99,0.24)] bg-[rgba(255,69,99,0.10)] px-4 py-3">
            <p className="text-sm text-platform-danger">{error}</p>
            {createdPlaylistId ? (
              <button
                type="button"
                onClick={() => router.push(`/app/playlists/${createdPlaylistId}`)}
                className="mt-3 text-sm font-semibold text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white"
              >
                Open playlist
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit" disabled={isSubmitting} className="min-w-40">
            {getSubmitLabel({ isSubmitting, hasCreatedPlaylist: Boolean(createdPlaylistId) })}
          </Button>
          <Button type="button" variant="glass" onClick={() => router.push("/app/playlists")}>
            Cancel
          </Button>
        </div>
      </Card>
    </form>
  );
}

async function createPlaylist(input: { name: string; description: string }) {
  const playlistResponse = await fetch("/api/app/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const playlistPayload = (await playlistResponse.json().catch(() => null)) as
    | PlaylistCreateResponse
    | null;

  if (!playlistResponse.ok || !playlistPayload?.playlist?.id) {
    throw new PlaylistCreateError(playlistPayload?.error ?? "Playlist could not be created.");
  }

  return playlistPayload.playlist.id;
}

export function getSubmitLabel(input: { isSubmitting: boolean; hasCreatedPlaylist: boolean }) {
  if (input.isSubmitting) {
    return input.hasCreatedPlaylist ? "Saving recipe..." : "Creating...";
  }

  return input.hasCreatedPlaylist ? "Save Recipe" : "Create Playlist";
}

class PlaylistCreateError extends Error {}

const inputClassName =
  "mt-2 w-full rounded-[1rem] border border-white/10 bg-black/24 px-4 py-3 text-sm text-white outline-none transition placeholder:text-platform-muted focus:border-platform-pink focus:ring-2 focus:ring-platform-pink/25";

function Field({
  label,
  htmlFor,
  hint,
  children
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium text-white">
        {label}
      </label>
      {hint ? <p className="mt-1 text-xs text-platform-muted">{hint}</p> : null}
      {children}
    </div>
  );
}

function buildTags(input: {
  genres: string;
  moods: string;
  language: string;
  activity: string;
  energy: string;
}): PlaylistRecipeTag[] {
  return [
    ...splitTags("genre", input.genres),
    ...splitTags("mood", input.moods),
    ...singleTag("language", input.language),
    ...singleTag("activity", input.activity),
    ...singleTag("energy", input.energy)
  ];
}

function splitTags(category: PlaylistRecipeTagCategory, value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => createTag(category, item));
}

function singleTag(category: PlaylistRecipeTagCategory, value: string) {
  return value.trim() ? [createTag(category, value.trim())] : [];
}

function createTag(category: PlaylistRecipeTagCategory, value: string): PlaylistRecipeTag {
  return {
    id: `tag_${category}_${value.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    category,
    value
  };
}
