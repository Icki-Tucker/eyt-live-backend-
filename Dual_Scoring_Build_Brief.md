# Build Brief: Dual AI + Interviewer Scoring

Hand this whole file to Claude Code as the task. It's written to minimize
token spend, read it fully before touching any code, then work in the phases
below in order rather than jumping around the file.

---

## Context (read once, don't re-derive this by exploring the file)

The file `EYT_Berlitz_Assessor_v33.html` is a single-file tool with two
nearly-identical copies of all its logic inside it:

1. The live, executing version (roughly the first half of the file)
2. A second copy stored inside a hidden `<textarea id="_html_source">`, HTML-entity-escaped
   (`&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`). This is used by the
   "Download File with Keys Embedded" feature to produce a shareable copy.

**Every functional change below must be made in both copies**, or the
downloaded/shared version will silently regress. Because copy 2 is
HTML-escaped, the safest approach is: write the fix once, verify it in copy 1
with `node --check`, then generate the escaped version of the same diff (swap
`&`→`&amp;`, `<`→`&lt;`, `>`→`&gt;`) and apply it to copy 2. Don't retype it
by hand twice, that's how the two copies drift apart, which is the same bug
class already found and fixed once in this file.

There are two tabs that score interviews: **Transcript Upload** and **Live
Interview Mode**. Both need this change. The PDF export (`generatePDF`, also
duplicated in both copies) needs it too. If there's an XLSX export function,
check whether it also outputs dimension scores, and update it the same way.

---

## The feature

Currently each dimension (LR, GA, FL, PC) stores one score: `{level, notes}`.
Change this to two scores per dimension:

```
{
  aiLevel: 'B2', aiNotes: '...',
  interviewerLevel: 'B1', interviewerNotes: '...'
}
```

**All four dimensions get both an AI score and an interviewer score.**

- **LR, GA**: AI already scores these from the transcript. Add an interviewer
  score dropdown (same CEFR options: A2/B1/B2/C1/C2) next to the existing
  read-only AI notes, so the interviewer can enter their own assessment
  alongside it.
- **FL**: In Live Interview mode, the AI already estimates fluency from live
  speech data, keep that as `aiLevel`. In Transcript Upload mode, there's no
  audio, so AI cannot judge fluency, show `aiLevel` as `'N/A'` with a tooltip
  or small note "requires audio" in that tab only. Interviewer score works
  the same in both tabs (dropdown, as it already does today).
- **PC**: This is the one requiring a new AI prompt. The existing prompt
  explicitly avoids assigning a PC score to reduce accent bias, see the
  `pc_observation`-only system prompt already in the file. Replace it with a
  prompt that assigns a CEFR level for `aiLevel` AND still returns the
  qualitative observation as `aiNotes`. The prompt must explicitly instruct
  the model to distinguish "hard to understand" from "accented but clear,"
  and to default to the higher level when evidence is ambiguous, so a real
  accent doesn't get scored down just for sounding non-native. Keep this
  instruction close to the original accent-bias warning already in the file,
  don't soften or remove that warning, add the scoring instruction on top of
  it.

---

## PDF changes

Switch `generatePDF` from portrait to landscape (`orientation: 'landscape'`
in the `jsPDF` constructor, and update the `W` constant accordingly, A4
landscape is 297mm wide, 210mm tall — update `PAGE_BOTTOM` for the new page
height too).

Replace the current `DIMENSION | SCORE | SCORED BY | EVIDENCE & ANALYSIS`
table header with:

```
DIMENSION | AI SCORE | INTERVIEWER SCORE | EVIDENCE & ANALYSIS
```

Two level pills side by side instead of one, small label under each
("AI" / "Interviewer"). Drop the "Human (audio)" / "AI (transcript)" method
badge entirely, the two labeled columns already make that clear. Widen the
evidence column to use the extra horizontal room from landscape. Keep the
existing `ensureSpace()` page-break logic, just recheck the row height math
since two stacked pills need slightly more vertical room per row than one.

---

## On-screen UI changes

Both tabs need a second input for LR, GA, and PC (FL already has one). Reuse
the existing dropdown pattern already used for FL and PC's manual scoring
today, same styling, same `<select>` options. Don't invent a new UI pattern,
match what's already there so it looks native to the tool.

---

## Suggested phases (do these in order, don't jump ahead)

1. Data model + AI prompts (both the LR/GA prompt already returning scores,
   and the new PC prompt). Verify the AI response parsing handles the new
   `aiLevel`/`aiNotes` field names before moving on.
2. On-screen UI for both tabs (add the missing dropdowns).
3. PDF layout (landscape + two-column scores).
4. XLSX export, if it exists and touches dimension scores.
5. Sync copy 2 (the escaped mirror) with everything from steps 1-4 in one
   pass, not incrementally, to avoid redoing the escaping multiple times.
6. Run `node --check` against both extracted script blocks (copy 1 directly,
   copy 2 by extracting and un-escaping the textarea content first) to catch
   syntax errors before considering it done.

---

## Cost-efficiency instructions for Claude Code specifically

- Don't re-read the entire file between each phase. Use targeted `grep -n`
  to find the exact line ranges you need for each phase, then view only
  those ranges.
- Don't run this in a browser to test unless something's actually
  ambiguous from reading the code. Static analysis (`node --check`, grep to
  confirm both copies match) catches most of what matters here.
- Batch edits within a single phase into as few tool calls as possible
  rather than one small edit at a time.
- Don't produce a written summary after every phase, just move to the next
  one. Give a final summary once at the end covering all changes made.
- Skip generating new documentation or comments beyond what's needed to
  explain the new PC scoring prompt's accent-bias handling, since that one
  genuinely needs a comment explaining why it's written the way it is for
  whoever edits it next.

---

## Definition of done

- Both tabs show AI and interviewer scores for all four dimensions
- PDF is landscape, shows both scores per dimension, doesn't clip
- Both copies of the code (live + escaped mirror) match functionally
- `node --check` passes on both extracted script blocks
- The PC accent-bias warning is preserved and extended, not removed
