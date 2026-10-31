---
order: 2
title: RANDSUM
pitch: Throw dice, not exceptions.
summary: >-
  A zero-dependency, TypeScript-first dice notation and rolling engine, with
  a formal spec for the notation and game packages for the systems people
  actually play.
link: https://randsum.dev
link_label: randsum.dev
code: https://github.com/RANDSUM/randsum
shot: randsum.png
accent: "#6d3fd6"
accent_dark: "#a98bff"
facts:
  - [For, "Developers building anything that rolls dice"]
  - [Packages, "@randsum/roller · @randsum/games · @randsum/mcp"]
  - [Games, "Blades · Daggerheart · Fate · D&D 5e · PbtA · Root · Salvage Union"]
  - [Also, "A notation spec, a playground, a REST API and a Discord bot"]
redirect_from:
  - /work/randsum-dev/
  - /work/randsum-io/
  - /work/notation-randsum-dev/
  - /work/randsum-discord/
---
`roll("4d6L")` should just work, be typed all the way down, and never throw
at your table. RANDSUM is the engine behind that: a dice roller with notation
parsing and validation built in, and nothing else in its dependency tree.

Around the engine sits RANDSUM Dice Notation, a formal specification so the
notation means the same thing everywhere it's spoken. Game packages wrap the
rules of specific systems, and the same engine powers a playground at
randsum.io, a public API, a Discord bot, and an MCP server so agents roll real
dice instead of making numbers up.
