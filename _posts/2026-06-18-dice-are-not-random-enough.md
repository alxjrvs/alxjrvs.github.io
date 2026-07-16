---
layout: post
title: "Dice are never random enough"
date: 2026-06-18 14:20:00 -0400
excerpt: "Mock draft — a placeholder post to show a mid-length entry with code."
---

*This is a placeholder post so you can see how an entry looks. Replace it with the real thing.*

People say a die is random. It isn't — it's a small, honest machine with exactly the
outcomes printed on its faces, and no more. That constraint is the whole appeal. When I
built [RANDSUM](https://github.com/RANDSUM/randsum), the goal wasn't randomness; it was
making the notation you'd say out loud into the API you'd actually call.

```
roll('4d6L')        // four d6, drop the lowest
roll('2d20H + 5')   // advantage, plus a modifier
```

You get back a result you can inspect — every die, the drops, the total — instead of a
bare number. The notation is the surface; the types make the wrong roll un-writable.

## Small surface, sharp edges

No game system baked in, no opinions about your character sheet. Just dice, done
correctly, that everything else can build on. That's the version I wanted to depend on.
