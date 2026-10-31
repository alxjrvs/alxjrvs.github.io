---
order: 1
title: Vellum
pitch: Your character sheet, on your face.
summary: >-
  A camera overlay for online tabletop games. Vellum draws a live character
  HUD (Hope, HP, Stress, Armor) over your webcam, and OBS carries it into your
  Discord call.
link: https://vellumhud.com
link_label: vellumhud.com
code: https://github.com/alxjrvs/vellum
shot: vellum-site.png
accent: "#8a6a1f"
accent_dark: "#d4ad55"
facts:
  - [For, "Daggerheart players and GMs on Discord"]
  - [Runs, "Entirely in your browser. No account, no server, no telemetry"]
  - [Built with, "TypeScript · React · Vite · Astro · Bun"]
  - [Also, "A Stream Deck plugin and on-device face tracking"]
redirect_from:
  - /work/vellum/
---
Online tables lose the thing a physical table gives you for free: a glance at
someone's sheet. Vellum puts it back where everyone is already looking, on
your video tile.

A web app renders your character as a heads-up display. OBS composites that
over your webcam, and OBS Virtual Camera hands the result to Discord as your
camera. Change a stat and it updates within a frame, with no modal in the way.
Your character lives in your browser and travels in a share link, so nothing
is ever uploaded.

It ships the Daggerheart frame (a Player HUD and a GM Fear view), and it is
built data-driven so adding another game is config and components, not a
rewrite.
