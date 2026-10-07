#!/bin/bash
# Stamp the css/js links in index.html with a version, so browsers do not mix a new page with old cached files.
# Run before each commit that changes css/ or js/.
v=$(date +%Y%m%d%H%M)
sed -i -E "s#(href=\"css/cp1\.css)(\?v=[0-9]+)?\"#\1?v=$v\"#; s#(src=\"js/(rom|programs|cp1|ui)\.js)(\?v=[0-9]+)?\"#\1?v=$v\"#" index.html
grep -c "?v=$v" index.html
