#!/usr/bin/env bash
# Downloads OFL-licensed fonts used by the renderer (Cormorant Garamond + Space Grotesk).
set -euo pipefail
cd "$(dirname "$0")/../lib/fonts"

UA="Mozilla/5.0"
CSS=$(curl -s -A "curl" "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Space+Grotesk:wght@400;500;600&display=swap")

dl() { # fam style weight outfile
  local url
  url=$(printf '%s' "$CSS" | python3 -c "
import re,sys
css=sys.stdin.read()
for b in css.split('@font-face')[1:]:
    fam=re.search(r\"font-family: '([^']+)'\",b).group(1)
    st=re.search(r'font-style: (\w+)',b).group(1)
    w=re.search(r'font-weight: (\d+)',b).group(1)
    u=re.search(r'url\((https://[^)]+)\)',b).group(1)
    if fam=='$1' and st=='$2' and w=='$3':
        print(u); break
")
  if [ -n "$url" ]; then
    curl -s -m 60 -o "$4" "$url"
    echo "downloaded $4 ($(wc -c < "$4") bytes)"
  else
    echo "MISSING: $1 $2 $3" >&2; exit 1
  fi
}

dl "Cormorant Garamond" normal 300 CormorantGaramond-Light.ttf
dl "Cormorant Garamond" normal 400 CormorantGaramond-Regular.ttf
dl "Cormorant Garamond" normal 600 CormorantGaramond-SemiBold.ttf
dl "Cormorant Garamond" italic 300 CormorantGaramond-LightItalic.ttf
dl "Space Grotesk" normal 400 SpaceGrotesk-Regular.ttf
dl "Space Grotesk" normal 500 SpaceGrotesk-Medium.ttf
dl "Space Grotesk" normal 600 SpaceGrotesk-SemiBold.ttf
