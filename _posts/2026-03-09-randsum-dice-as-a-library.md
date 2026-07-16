---
layout: post
title: "RANDSUM — dice as a library"
date: 2026-03-09 11:30:00 -0400
excerpt: "What if rolling dice were a properly-typed, notation-first API?"
---

Most dice code is an afterthought: a `Math.random()` here, a modulo there, a bug in the
edge cases nobody tests. RANDSUM started from a different question — what if dice were a
real library, notation-first and properly typed, that you'd actually want to depend on?

## Notation in, results out

You write what you'd say at the table:

```
roll('4d6L')        // four d6, drop the lowest
roll('2d20H + 5')   // advantage, plus a modifier
```

and you get back a result you can inspect — every die, the drops, the total — instead of
a bare number. The notation is the API; the types make the wrong roll un-writable.

## Small surface, sharp edges

The whole point is that it does one thing precisely. No game system baked in, no opinions
about your character sheet — just dice, done correctly, that everything else can build on.
