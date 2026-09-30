#!/bin/sh
# syntax check of the concatenated game module
cd "$(dirname "$0")" && python3 build.py >/dev/null && python3 -c "
s=open('../public/index.html').read(); i=s.index('<script type=\"module\">')+len('<script type=\"module\">'); j=s.index('</script>',i); open('/tmp/fd_mod.mjs','w').write(s[i:j])" && node --check /tmp/fd_mod.mjs && echo SYNTAX_OK
