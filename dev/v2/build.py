import sys
imports='''import * as THREE from "three";
import {EffectComposer} from "three/addons/postprocessing/EffectComposer.js";
import {RenderPass} from "three/addons/postprocessing/RenderPass.js";
import {UnrealBloomPass} from "three/addons/postprocessing/UnrealBloomPass.js";
import {OutputPass} from "three/addons/postprocessing/OutputPass.js";
import {ShaderPass} from "three/addons/postprocessing/ShaderPass.js";
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
'''
head=open('head.html').read().replace('/*__DATA__*/null',open('../fisch/data.json').read().strip())
game=open('game.js').read()
if len(sys.argv)>1 and sys.argv[1]=="pub":
    import re; game=re.sub(r'\nwindow\.__fd=\{.*\n?','\n',game)
out=head+'<script type="module">\n'+imports+open('core.js').read()+'\n'+open('world.js').read()+'\n'+game+'\n</script>\n'
open('index.html' if len(sys.argv)<2 else 'publish.html','w').write(out); print(len(out))
