#!/bin/bash
# Build the finished Into Europe v2 folder: /home/claude/ie/dist
set -e
cd /home/claude/ie
rm -rf dist && mkdir -p dist/maps dist/pdf
cp orig/_headers orig/*.png orig/favicon.ico orig/site.webmanifest orig/welcome.jpg orig/welcome-wide.jpg dist/
cp -r orig/fonts dist/
cp /home/claude/gmap/it/tiles/*.jpg dist/maps/
python3 fx/gather_raster.py
python3 fx/assemble.py dist/index.html
python3 fx/make_sw.py dist/sw.js
[ -f pdf/out/Into-Europe-Italy-1943-1945.pdf ] && cp pdf/out/Into-Europe-Italy-1943-1945.pdf dist/pdf/
du -sh dist; ls dist/maps | wc -l
