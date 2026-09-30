#!/usr/bin/env python3
"""Builds public/index.html from dev/src (core + world + game are concatenated into one ES module)."""
import os, sys
D = os.path.dirname(os.path.abspath(__file__))
S = lambda f: open(os.path.join(D, 'src', f), encoding='utf-8').read()
imports = '''import * as THREE from "three";
import {EffectComposer} from "three/addons/postprocessing/EffectComposer.js";
import {RenderPass} from "three/addons/postprocessing/RenderPass.js";
import {UnrealBloomPass} from "three/addons/postprocessing/UnrealBloomPass.js";
import {OutputPass} from "three/addons/postprocessing/OutputPass.js";
import {ShaderPass} from "three/addons/postprocessing/ShaderPass.js";
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
'''
head = S('head.html').replace('/*__DATA__*/null', open(os.path.join(D, 'data.json'), encoding='utf-8').read().strip())
head = head.replace('<script type="importmap">', '<script>\n' + S('net.js') + '\n</script>\n<script type="importmap">', 1)
head = head.replace('<title>Fischerdock Inseln</title>', '<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"><meta name="theme-color" content="#081524">\n<title>Fischerdock Inseln</title>', 1)
head = head.replace('\n<div id="app">', '\n</head><body>\n<div id="app">', 1)
parts = [S('core.js')]
for f in ['world.js', 'game.js']:
    parts.append(S(f))
out = head + '<script type="module">\n' + imports + '\n'.join(parts) + '\n</script>\n</body></html>\n'
dst = os.path.join(D, '..', 'public', 'index.html')
open(dst, 'w', encoding='utf-8').write(out)
print('wrote', dst, len(out))
