# Better GitHub Explore

A replacement UI for github.com/explore: the same five sections plus our own discovery layer.
Single context; this glossary is the project's shared language.

## Language

**Trending (GitHub's)**:
The ranking on the Trending tab — repositories ordered by stars gained during the window,
exactly as github.com/trending orders them. Nothing invented.

**Discover trending**:
The Discover tab's own, invented trending — result sets computed from live search-API queries
with criteria we choose. Both senses of "trending" are legitimate; the hosting tab disambiguates.

**Lens**:
A named search recipe inside Discover that answers one discovery question ("what is quietly
good?", "what just appeared?"). Lens names are proper nouns: Hidden Gems, Rising Stars,
Old But Gold, Fresh Finds, Rock Solid, Sleeping Giants, Community Hungry, Class of YYYY.
_Avoid_: filter, mode, feed

**Category**:
A purpose-based bundle of GitHub topics (Science, Finance, Game Dev, …) that focuses any lens
on an interest domain. Our construct, built from topics. It chooses the subject; the lens
chooses the shape, so a category never moves a lens's star thresholds.
_Avoid_: hub, domain, genre

**Selection**:
One view's full request: a lens, a category, and optionally one topic within it — the three axes
that cost an API request, and the three the URL encodes.

**Topic**:
GitHub's own repository label (`topic:bioinformatics`). The raw material categories are built
from; never a synonym for Category.

**Collection**:
One of GitHub's ~111 hand-curated repository reading lists, served by the explore feed. Curated
by GitHub, not by us.

**Spotlight**:
The curated collections above Discover's lenses: one per Area, drawn from GitHub's own
collections and seeded by the period so every visitor sees the same set.
_Avoid_: featured, daily pick

**Area**:
A field of expertise the Spotlight groups collections under — Game Dev, Security & Privacy,
Media & Audio. Ours, and separate from Category: an Area organises GitHub's collections, a
Category organises GitHub's topics, and the two need not line up.

**Period**:
How often the Spotlight turns over — weekly or monthly, the reader's choice.
