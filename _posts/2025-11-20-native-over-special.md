---
layout: post
title: "Native over special"
date: 2025-11-20 08:15:00 -0500
excerpt: "A machine that rebuilds itself, and the one rule that keeps it small."
---

My dev machine can rebuild itself from a single config file. One command reconciles
symlinks, packages, tools, and defaults from a declarative document in a git repo. It's
the kind of thing that's fun to over-engineer — and I've had to talk myself out of doing
exactly that more than once.

## The rule

The rule that keeps it small is boring and load-bearing: **prefer stock behavior to
bespoke machinery.** Deleting a custom script because a built-in now does the job is the
highest-value change I can make. Every wrapper has to earn its place; most don't.

## Why it matters on a personal repo

Nobody's paying me to maintain cleverness at home. A config a senior engineer could read
top to bottom and nod at is worth more than one that shows off. Small, legible, native —
that's the whole aesthetic, and it's the same one this site is built on.
