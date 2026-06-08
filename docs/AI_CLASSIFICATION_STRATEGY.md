# AI Classification Strategy

## Principle

Use AI as a structured classifier and planner, not as the system controller.

The backend controls data, validation, storage, and Apple Music writes. AI only helps classify tracks and propose playlists.

## OpenAI usage

Use OpenAI API with structured outputs.

The app should not rely on free-form text responses for classification or playlist planning. Every OpenAI response used by the backend must match a schema.

Current classification implementation:

- Ambiguous tracks are sent to OpenAI in batches, not one request per track.
- The prompt payload includes compact track metadata only: fingerprint-based track ID, title, artist, album, genres, and content rating.
- Raw Apple Music library song IDs, user IDs, email addresses, and tokens are not included in the OpenAI payload.
- Model output is validated with Zod against the same fixed taxonomy used by the app.
- Invalid or incomplete model output returns `null`; the caller keeps deterministic heuristic classifications instead of failing the whole sync.
- Valid OpenAI classifications include language, genre, subgenres, moods, energy, confidence, source, classifier version, and metadata hash before storage.

## Recommended MVP model strategy

Use a cost-controlled model for most work.

Suggested approach:

- Use a smaller/cheaper OpenAI model for track classification and request parsing.
- Use a stronger model only for complex playlist planning if needed.
- Batch tracks instead of sending one request per track.
- Use metadata heuristics before AI.

Do not train a custom model for MVP.

## Classification pipeline

```text
Raw Apple track
  -> normalized metadata
  -> deterministic heuristic classifier
  -> if confidence low, OpenAI structured classifier
  -> validated classification
  -> stored in track_classifications
```

## Heuristics first

Classify without AI when reliable:

- Apple genre says Hip-Hop/Rap.
- Apple genre says Pop, Rock, Electronic, Classical, Jazz, etc.
- Track has no obvious vocal metadata and genre indicates instrumental/classical.
- Existing metadata is strong enough for a high-confidence genre.

Use AI when ambiguous:

- Language is not obvious.
- Genre metadata is too broad.
- Mood classification is needed.
- User requests a nuanced playlist such as `sad Slavic songs` or `Ukrainian gym rap`.

Current deterministic implementation:

- Apple genre metadata maps obvious genres such as Hip-Hop/Rap, Pop, Rock, Electronic, Classical, Jazz, and related variants without OpenAI.
- Reliable metadata/script hints classify `ukrainian`, `russian`, `polish`, `mixed`, `instrumental`, and other supported language values.
- Metadata-backed genre classifications are stored with `source = metadata` and higher confidence.
- Title/album token mood hints are stored as deterministic heuristic output.
- Library sync persists classifications in `track_classifications` after normalized track IDs are available.
- Ambiguous tracks can be upgraded by OpenAI during library sync when `OPENAI_API_KEY` is configured; otherwise heuristic rows are still stored.

## Track classification output schema

Recommended internal shape:

```json
{
  "trackId": "internal-or-apple-id",
  "language": "ukrainian",
  "primaryGenre": "hip-hop/rap",
  "subgenres": ["ukrainian rap", "trap"],
  "moods": ["hype", "dark"],
  "energy": 0.82,
  "confidence": 0.76,
  "source": "openai",
  "reason": "Metadata suggests Ukrainian-language rap with high-energy style."
}
```

## Supported language values

At minimum support:

```text
english
ukrainian
russian
polish
spanish
french
german
japanese
korean
portuguese
instrumental
mixed
unknown
```

Do not design the MVP around English-only libraries.

## Mood labels

Start simple:

```text
chill
hype
focus
sad
romantic
workout
feel_good
melancholy
dark
party
driving
late_night
```

Keep labels practical. The user wants usable playlists, not a perfect musicology taxonomy.

## Playlist request parsing

User input examples:

```text
Ukrainian rap
Gym rap
Sad Slavic songs
Late night electronic
Clean pop for work
Old school hip hop
```

Parse into structured rules:

```json
{
  "title": "Ukrainian Rap",
  "languages": ["ukrainian"],
  "genres": ["hip-hop/rap", "rap", "trap"],
  "moods": [],
  "energyMin": null,
  "energyMax": null,
  "excludeExplicit": false
}
```

Current request parser implementation:

- The dashboard accepts one playlist request per line.
- Legacy `POST /api/sort-runs` playlist-request creation is disabled. Platform Sort creation uses `/api/app/sorts`, then structured playlist recipes.
- Simple requests such as `Ukrainian rap`, `Gym rap`, and `Sad Slavic songs` are parsed deterministically without OpenAI.
- Parsed rules are stored in `playlist_requests.parsed_rules` for review and later planning.
- This step creates a draft sort run only; playlist planning, preview generation, and Apple Music write-back happen in later tickets.

## Playlist planning

The playlist planner should match tracks from stored classification data, not from raw AI output alone.

Steps:

1. Load user's latest normalized tracks.
2. Load classifications.
3. Load parsed playlist rules.
4. Score each track against each playlist rule.
5. Select tracks above threshold.
6. Sort by score and optionally by artist/title.
7. Store playlist-track reason.
8. Generate title and description.
9. Save preview.

## Scoring example

A simple scoring approach:

```text
+0.40 language match
+0.35 genre match
+0.20 mood match
+0.10 energy range match
-0.20 explicit mismatch
```

The exact formula can change, but the output should be explainable.

Current playlist planner implementation:

- `generateRequestedPlaylists` scores each requested playlist independently from parsed rules and stored classifications.
- Language rules are treated as required filters when present.
- Genre, subgenre, mood, and energy rules contribute to score and explainable track reasons.
- Language or genre can act as a strong fallback anchor for use-case playlists when mood or energy metadata is sparse.
- Explicit tracks are excluded when a request asks for clean or family-safe output.
- Tracks may appear in multiple requested playlists when they match multiple rules.
- Empty-result requests are preserved as warning-only preview cards and excluded from default confirmation.
- Generated playlist tracks include position, score, and reason for later preview storage.
- Request parsing currently covers common MVP prompts including Ukrainian rap, gym rap, sad Slavic songs, chill electronic, late night electronic, and mixed-language driving rap.
- The preview page can generate a privacy-safe quality triage report containing
  only playlist-level counts, aggregate match diagnostics, warnings, and top
  rejection reasons. The report also adds issue tags such as `low_match`,
  `empty_playlist`, `language_filter`, and `mood_filter` with a suggested next
  investigation step. The report excludes track names, Apple Music song IDs,
  normalized track IDs, fingerprints, user tokens, and raw Apple Music payloads.

## Prompting rules

Prompts should:

- Include compact metadata only.
- Avoid user email, auth IDs, or unrelated personal data.
- Ask for strict schema.
- Ask for confidence.
- Ask for `unknown` when uncertain.
- Avoid forcing a classification when evidence is weak.

## Failure behavior

If OpenAI fails:

- Do not block the entire app if heuristics can still produce basic playlists.
- Mark low-confidence classifications.
- Show the user that some tracks were uncertain.
- Record job event.
- Allow retry.

## Cost control

For MVP:

- Batch tracks.
- Classify only ambiguous tracks with AI.
- Cache classifications by metadata hash.
- Reuse existing classification if version and metadata hash match.
- Avoid reclassifying the whole library on every sort run.

## What AI must not do

- Do not directly call Apple Music.
- Do not create playlists without app validation.
- Do not decide payment status.
- Do not bypass user confirmation.
- Do not return unvalidated JSON.
