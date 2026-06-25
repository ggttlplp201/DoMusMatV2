"use client";

/**
 * SceneExporter — lives inside the Canvas. Registers an export handler that
 * GLTFExporter-exports the assembled scene to a binary .glb. The sun (directional
 * lights) and the slot "+" ghosts are hidden during export so the .glb carries only
 * the room + items + interior lights; the worker adds the day/night world itself.
 * The HDRI environment is a renderer property (not a scene child), so it is never exported.
 *
 * Textures are temporarily downscaled to MAX_TEX during export: full-res PBR maps
 * (2K AmbientCG sets, cloned per surface) would push the .glb past Supabase's upload
 * limit and slow the cloud render — a tour pano doesn't need more than ~1K maps.
 */

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { registerExportHandler } from "@/lib/configurator/exportBridge";
import { useConfigurator } from "@/state/configurator";

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

const MAX_TEX = 512; // longest texture edge in the exported .glb (keeps it under the Supabase free 50MB upload cap)
const TEX_KEYS = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap"] as const;

/** Swap each material's textures for ~1K downscaled copies; returns a restore fn.
 *  One downscaled canvas is shared per source image (GLTFExporter dedupes by image),
 *  but each material slot gets its own clone so per-surface repeat/wrap is preserved. */
function downscaleTextures(scene: THREE.Object3D): () => void {
  const canvasCache = new Map<unknown, HTMLCanvasElement>();
  const restores: Array<() => void> = [];
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      const m = mat as unknown as Record<string, THREE.Texture | undefined>;
      for (const key of TEX_KEYS) {
        const tex = m[key];
        const img = tex?.image as (HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined);
        if (!tex || !img || !("width" in img) || Math.max(img.width, img.height) <= MAX_TEX) continue;
        let canvas = canvasCache.get(img);
        if (!canvas) {
          const scale = MAX_TEX / Math.max(img.width, img.height);
          canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext("2d")!.drawImage(img as CanvasImageSource, 0, 0, canvas.width, canvas.height);
          canvasCache.set(img, canvas);
        }
        const small = tex.clone();
        small.image = canvas;
        small.needsUpdate = true;
        m[key] = small;
        restores.push(() => { m[key] = tex; });
      }
    }
  });
  return () => restores.forEach((r) => r());
}

export default function SceneExporter() {
  const { scene } = useThree();
  const setCapturing = useConfigurator((s) => s.setCapturing);

  useEffect(() => {
    registerExportHandler(async () => {
      // hide the "+ add" ghosts (capturing flag) and the sun (directional lights)
      setCapturing(true);
      await nextFrame();
      const hiddenSuns: THREE.Light[] = [];
      const spotRestores: Array<() => void> = [];
      const tmp = new THREE.Vector3();
      scene.traverse((o) => {
        const l = o as THREE.DirectionalLight;
        if (l.isDirectionalLight && l.visible) { l.visible = false; hiddenSuns.push(l); }
        // spotlights aim via a separate target object; GLTFExporter only bakes node
        // rotation, so orient each to look at its target before export (else it aims wrong)
        const sl = o as THREE.SpotLight;
        if (sl.isSpotLight && sl.target) {
          const prev = sl.quaternion.clone();
          sl.lookAt(sl.target.getWorldPosition(tmp));
          sl.updateMatrixWorld();
          spotRestores.push(() => { sl.quaternion.copy(prev); sl.updateMatrixWorld(); });
        }
      });
      const restoreTextures = downscaleTextures(scene);
      try {
        const exporter = new GLTFExporter();
        const buf = await new Promise<ArrayBuffer>((resolve, reject) => {
          exporter.parse(
            scene,
            (result) => resolve(result as ArrayBuffer),
            (err) => reject(err),
            { binary: true, onlyVisible: true },
          );
        });
        return buf;
      } finally {
        restoreTextures();
        spotRestores.forEach((r) => r());
        hiddenSuns.forEach((l) => (l.visible = true));
        setCapturing(false);
      }
    });
    return () => registerExportHandler(null);
  }, [scene, setCapturing]);

  return null;
}
