---
layout: post
title: "On deleting code you wrote"
date: 2026-05-14 09:00:00 -0400
excerpt: "The highest-value change I make in a week is usually a deletion."
---

The highest-value change I make in a week is usually a deletion. A wrapper that once
earned its keep. A clever helper that a built-in now covers. A config that describes a
problem I no longer have. Each one looked load-bearing right up until it wasn't.

Writing code is the easy part. The hard part is being honest about which of it still
belongs — and then having the nerve to take it out.

## Guilty until proven load-bearing

I've started treating every dependency, wrapper, and line as guilty until it proves it
carries weight. On a personal project that bar is high: the reward for deleting something
is a smaller surface, fewer things to explain, and a codebase a stranger could read on a
Sunday.

> Prefer the stock behavior, and make every line prove it still belongs.

The best sessions end with a diff that's mostly red. Nothing broke; something got
simpler. That's the work.
