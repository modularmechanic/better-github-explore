---
status: accepted
---

# Discover is token-gated and always live

The Discover tab is hidden until a personal access token is saved. This is a product decision
rather than a deduction from the rate limit: today a lens view costs one cached search request,
which an anonymous visitor could afford perfectly well. The reasons to gate it anyway are that the
tab is aimed at people who browse GitHub seriously enough to hold a token, and that the category
hubs coming next fan a lens out across a bundle's topics — one search per topic, six to nine per
view, because search qualifiers cannot be OR'd (live-verified 422, 2026-08-28). Rather than design
two behaviours and degrade one of them, Discover asks for the token up front and stays undegraded.

Its results are always computed live. Build-time lens snapshots — the mechanism behind the
Trending, Topics and Events tabs — are rejected here permanently, not deferred: that pipeline
exists for pages a browser *cannot* read, and a lens is an ordinary API query whose freshness is
the point of the feature.

Considered and rejected: a tiered anonymous mode (two code paths to design, test and explain, for
a tab aimed at token holders).

Consequence: the README's "no token needed" claim covers the public tabs only and says so. The
`use-hash-route` tab list is the single place the gate is expressed, via `TOKEN_ONLY`.
