# How the writing works

The one part of this platform an agent does not automate. Everything else here
is plumbing; this is the reason the plumbing exists.

Read this before touching any content repo. It is short, and the rule at the
centre of it is stronger than it first sounds.

---

## The separation

Three places, deliberately not connected:

| | |
|---|---|
| **iA Writer library** | where Jochen writes. Outside the vault, outside every repo. **No agent access, ever.** Synced between desktop and mobile. |
| **THE_BRAIN** (Obsidian) | knowledge repository. Private thinking, not publication. |
| **The content repos** | the external world, fully managed by agents. |

Finished markdown moves from the first to the third by hand. That handoff is the
only connection, and it is one-directional.

**Never read from or write to the iA Writer library**, even when told where it
is, even to be helpful, even to fix a typo. The git working copy is the handoff
point. If a file needs changing, change it in the repo.

## The rule: diagnose, never draft

An agent may say *what is wrong*. Jochen decides *what to write*.

That is the line, and it is the whole point. Not because AI prose is bad, but
because the value of the writing is that it is his — and because a pasted
sentence is a sentence he did not think.

**Allowed**

- "This paragraph is doing two jobs and the second one is more interesting."
- "You assert this and never support it."
- "Your best line is buried at the end of section three."
- "Section three should be section one."
- Reading a section cold and reporting what it seems to argue, so the gap
  against his intent becomes his edit list.
- Research: dates, figures, sources, who disagrees and why, the strongest
  objection. Facts are provenance-neutral; phrasing is not.

**Not allowed, unless he explicitly asks**

- Writing a replacement sentence. He will paste it.
- Outlining the piece before he writes it. That makes the architecture the
  agent's, and it is the part rewriting never touches.
- Handing over a list of words to use. That is asking for AI vocabulary
  directly, and it is the signal every detector agrees on.

An explicit "write this for me" overrides all of it. The default is the
constraint; the constraint is not a refusal.

## Vocabulary help, done properly

English is Jochen's second language, and his productive vocabulary is much
smaller than his receptive one. Retrieval help for a word he already has in mind
is a real need and is not the same as steering the piece. Three rules make it
safe:

- **Pull, not push.** He asks when stuck mid-sentence. No pre-supplied lists.
- **A field, not a recommendation.** Six or eight options across registers with
  the connotations spelled out, unranked. If you name one, he uses that one.
- **Flag which candidates are AI-marked.** This is the genuinely useful
  inversion: he has no way of knowing which English words carry that smell,
  because it is a recent and arbitrary fact about the language.

```
keeps working while damaged:
  resilient          common, slightly worn
  robust             heavily AI-marked, avoid
  fault-tolerant     engineering register, precise
  hardy              plainer, organic connotation
  forgiving          implies it tolerates YOUR mistakes, not its own
  degrades gracefully  the term of art, if the audience is technical
```

His first language is available as a bridge: naming the concept there is faster
than circumlocution, and it lets you catch false friends.

One thing to watch: the gap produces plain prose, and plain prose is usually
better prose. "I could not find a fancier word" is often the correct outcome.

## iA Writer

**Authorship** is why the tool was chosen. It tracks provenance per character
and shows it in the editor. Jochen distinguishes his own writing, AI-assisted
text and source material. Anything not from his own head is assigned deliberately
to the appropriate provenance, and the document view gives a character count per
author.

That number is ground truth, not an inference, which is the point. It runs
locally, and the metadata is stored as a block at the end of the markdown file
following the open Markdown Annotations spec, so it survives in plain text and
versions in git. Export to Markdown, HTML, PDF or Word strips it.

**One consequence for us: an issue or post arriving in a repo may carry an
authorship metadata block at the end of the file.** Leave it alone. Do not
strip it, do not reformat it, do not comment on it.

**Style Check → Custom Patterns** is loaded with the LLM-marked vocabulary
cluster (*delve, intricate, underscore, multifaceted, leverage, robust, pivotal,
nuanced, testament, landscape, seamless, holistic, myriad, harness, elevate,
resonate, transformative, ever-evolving*, and the phrase-level ones: *it's worth
noting, at its core, in conclusion, furthermore, moreover, let's dive in*). If
you catch a new one, suggest adding it there rather than editing his text.

**Syntax Highlight** on adjectives and adverbs is used as a padding detector.

## On AI detectors

Pangram is a transformer over the whole document, not a word-frequency scorer,
so "humanising" a generated draft does not work and is not the strategy here.
Non-native English is **not** itself a detection risk: Pangram reports 0.09%
false positives on ICNALE, 5,600 essays by Asian undergraduates writing English.
That was a genuine failure of older perplexity-based detectors and is not this
one's.

Authorship marks are metadata a detector never sees. They do not move a
classifier's verdict by one point. What they give is an accurate account of the
process and a number that can be defended — which, given that detectors are
inference and this is a record, is the more useful thing to have.

The workflow above is not laundering. Nothing needs laundering, because nothing
is generated. That is why it survives contact with a detector.
