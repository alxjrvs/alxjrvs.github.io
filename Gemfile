source "https://rubygems.org"

# GitHub Pages builds this site server-side with its own pinned gem set
# (Jekyll 3.9 on Ruby 3.3). `github-pages` reproduces that toolchain locally
# so preview == prod. Pair it with the Ruby pin in mise.toml.
gem "github-pages", group: :jekyll_plugins

# Ruby 3+ dropped webrick from stdlib; jekyll serve needs it locally.
gem "webrick"
