# Rubric Migration Progress

Tracks the move from Berlitz-derived scoring content to the EYT-authored
rubric (`EYT_Proficiency_Rubric_v2.md`, four dimensions, A2-C1 descriptors,
same structure the tool already runs on). Updated as each location is
finished, so progress is not lost if the session compacts.

Rubric source in use: `EYT_Proficiency_Rubric_v2.md`, the four-dimension
A2-C2 version. Not the six-dimension `EYT_Language_Proficiency_Rubric.md`
from earlier in the conversation, that one was set aside.

All edits so far are in copy 1 (the live, executing code) only. Copy 2 (the
escaped mirror inside `<textarea id="_html_source">`, used by "Download File
with Keys Embedded") has not been touched yet, by design, it is deferred
until all five locations below are done, then synced once in a single pass.

## The five locations

### 1. `runAssessment()`, Transcript Upload tab prompt, DONE

What changed:
- Opening framing de-Berlitzed: "EYT Berlitz language assessor" to "EYT
  language assessor."
- LR and GA descriptor blocks replaced with the new rubric's Dimension 1
  (Grammatical Accuracy) and Dimension 2 (Linguistic Range) language.
- Removed entirely: the "CALIBRATION EXAMPLES" section (two worked
  examples), which was explicitly labeled as sourced from "the official
  Berlitz Global Oral Assessment Scale."
- Removed entirely: the "SCORING DECISION RULES FROM EYT DOCUMENTS"
  section, which cited a specific "Slide 9" rule likely from the same
  source.
- The 20-question "EYT Berlitz Proficiency Interview (BPI) Question Bank"
  (BQ1 through BQ20) was replaced with a renamed "EYT Interview Question
  Guide" containing 20 newly written questions (IQ1 through IQ20). Same
  four phases, same per-question skill target as the originals, different
  wording and scenarios throughout.
- Renamed "BPI PHASE NOTE" / "BPI coverage" to "PHASE COVERAGE NOTE" /
  "Phase coverage" in the untested-range flag logic.
- Confirmed via grep: zero "Berlitz" or "BPI" text remains in this
  function's block.
- Confirmed: `node --check` passes.

### 2. `updateSuitability()`, final suitability write-up, DONE

What changed:
- Opening framing de-Berlitzed, same as location 1: "EYT Berlitz language
  assessor" to "EYT language assessor." This was the only line in this
  function referencing Berlitz, it has no descriptor tables of its own,
  just aggregates already-scored dimension results into a write-up.
- The SUITABILITY GUIDE table in this same function (mapping B1/B2/C1/C2
  to role fit) is EYT's own role-mapping logic, not a CEFR descriptor, left
  unchanged.
- Confirmed: `node --check` passes.

### 3. `buildLiveSysPrompt()` and `buildPCSysPrompt()`, Live Interview Mode prompts, DONE

What changed:
- Both framing lines de-Berlitzed, same pattern as locations 1 and 2.
- `buildPCSysPrompt()`: CEFR levels line replaced with the new rubric's
  Dimension 3 (Phonological Control) descriptors, A2 through C1. The
  accent-bias framing above it was not touched, it was authored during the
  dual-scoring build, not Berlitz-derived, and already matches the new
  rubric's own scoring notes on accent bias almost exactly.
- `buildLiveSysPrompt()`: LR, GA, and FL one-line descriptors replaced with
  condensed versions of the new rubric's Linguistic Range, Grammar, and
  Fluency language. Also removed the GA line's "(HARD cap)" phrasing on
  tense drift, which reads as a condensed restatement of the same
  Berlitz-sourced "Slide 9" rule that was removed from location 1.
  Explicit "C2=..." tags were dropped from all three lines to match how
  location 1 handles C2, left as an implicit ceiling, not fabricated
  descriptor text, since the new rubric does not define C2 either.
- Confirmed: `node --check` passes.

### 6. `liveUpdateSuitability()`, NEW, NOT ON ORIGINAL LIST, DONE

Found while grepping the whole file for "Berlitz" after finishing location
3. This is the Live Interview Mode's counterpart to `updateSuitability()`
(location 2), a separate final suitability write-up with its own prompt.
Same one-line framing fix applied: "EYT Berlitz assessor" to "EYT
assessor." Confirmed via grep this was the only Berlitz reference in this
function.

### Branding pass, DONE

A full-file grep after location 3 turned up "Berlitz" in places that are
not scoring descriptor content, they are the tool's own product branding.
Decision made: drop "Berlitz" from branding too, using "EYT Language
Assessor" as the replacement product name (matches the actual filename
already in use for this file). Changed:
- Page `<title>`: "EYT Berlitz Assessor" to "EYT Language Assessor"
- Logo subtitle: "Berlitz Assessor Tool" to "Language Assessor Tool"
- On-screen doc title and PDF header: "Berlitz English Proficiency
  Assessment" to "EYT English Proficiency Assessment" (both locations,
  on-screen and inside `generatePDF()`)
- Footer text, both on-screen and in the PDF: "Berlitz Assessment" to
  "Proficiency Assessment"
- Settings tab UI copy: "the qualifying Berlitz level" to "the qualifying
  level"
- Download filenames: embedded-key HTML file, PDF, and XLSX batch export
  all renamed to drop "Berlitz" ("EYT_Berlitz_Assessor_WithKeys.html" to
  "EYT_Language_Assessor_WithKeys.html", the PDF save name's "Berlitz_"
  prefix to "EYT_", the XLSX batch name's "EYT_Berlitz_Batch_" to
  "EYT_Proficiency_Batch_")

Confirmed via grep: zero "Berlitz" references remain anywhere in copy 1.
Copy 2 still has its full set (15 references), untouched by design, will
be handled in the copy 2 sync pass once all locations are finished.
Confirmed: `node --check` passes.

### 4. `panel-assess` and `panel-live`, on-screen UI, DONE

Both panels checked for descriptor text or level benchmarks shown directly
in the UI, separate from the AI prompts. Clean, only dropdown option values
(B1/B2/C1/C2, A2/B1/B2/C1/C2) and generic placeholder hints, nothing
Berlitz-derived.

While checking `panel-settings` for anything near the already-fixed
"qualifying Berlitz level" line, found one more item outside the original
scope: the "About This Tool" card stated "Scoring is grounded in the EYT
Grammar Refresher, Linguistic Range, and Phonological Control assessor
training documents," a direct sourcing claim that was no longer accurate
given the content swap. Removed that sentence entirely per your direction,
the card now just says what the tool was built for and what model powers
it. The other Settings card ("Scoring Rubric — Four Dimensions") was left
as-is, its one-line summaries per dimension are generic enough to describe
either rubric accurately.

Confirmed: `node --check` passes, only copy 1 changed.

### 5. PDF and XLSX export, DONE, no changes needed

Both `generatePDF()` and `downloadBatch()` checked directly. Clean: no
hardcoded descriptor text, no calibration content, no question bank
references. The only "B1/B2/C1/C2" content in either is a presentational
color-mapping table for the PDF's level pills, and dimension name/abbrev
labels. The actual scored content each renders (aiNotes, interviewerNotes,
aiLevel, interviewerLevel) is pulled dynamically at export time from
whatever the prompts produced, already fixed at the source in locations
1, 3, and 6. Nothing to change here.

## All six locations closed out

Original five-location plan plus the one location found mid-migration
(`liveUpdateSuitability()`) are all done, plus the branding pass. Copy 1
has zero "Berlitz" references anywhere. Copy 2 (the escaped mirror) still
has its original content in full, untouched by design, pending the
one-pass sync mentioned throughout this file.

## Copy 2 sync, DONE

Synced everything from copy 1 into the escaped mirror in one pass:
`runAssessment()`, `updateSuitability()`, `generatePDF()`, `downloadBatch()`,
and `embedApiKey()` swapped in full (script-based, brace-counted extraction
from copy 1, HTML-escaped, replacing the old version at the matching
function signature in copy 2). The branding text swaps (title, logo-sub,
doc-title, footer, qualifying-level line, About This Tool card) applied
the same way. Live Interview Mode functions were not touched, they were
never in copy 2 to begin with, confirmed still true after the sync.

Confirmed: zero "Berlitz" references anywhere in the whole file now, both
copies. `node --check` passes on both copy 1 and copy 2's extracted
scripts.

**Still open, not closed by this migration:**
- None of today's changes are committed or pushed yet, still sitting
  locally per the git status check done mid-session.

**Resolved:** the BPI question rewrite risk was reviewed directly, all 20
original/rewrite pairs shown side by side with an honest closeness
assessment (several, especially IQ11, IQ13, IQ16, and IQ19, are close
paraphrases rather than independently conceived questions). You reviewed
this and confirmed it looks good as-is, no further rewrite pass requested.

## Open risk item: BPI Question Bank verbatim check

**Not fully closed out.** The original BQ1 through BQ20 questions have been
removed from `runAssessment()` and replaced with newly written IQ1 through
IQ20 questions. This was done based on your confirmation that the original
questions were sourced or adapted from Berlitz's script, not from a
verified line-by-line comparison against actual Berlitz source material,
there is no such reference document available to check against directly.

The replacement questions were built by taking each original question's
phase, skill target, and general intent, then writing new wording. This
was already flagged as a real limitation: same scenario, different words,
which may not be far enough from the source if the bar is "originally
conceived" rather than "differently worded." Worth a second look from
whoever owns the compliance requirement before treating this as resolved.

No other location has been checked yet for a second copy of this same
question bank, or any other verbatim Berlitz text.
