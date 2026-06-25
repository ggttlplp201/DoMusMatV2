import * as THREE from "three";

/** Equirect panoramas are 2:1. */
export function equirectSize(width: number): [number, number] {
  return [width, Math.round(width / 2)];
}

const QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const QUAD_FRAG = /* glsl */ `
  precision highp float;
  uniform samplerCube map;
  varying vec2 vUv;
  #define PI 3.141592653589793
  void main() {
    float lon = (vUv.x - 0.5) * 2.0 * PI; // -PI..PI
    float lat = (vUv.y - 0.5) * PI;       // -PI/2..PI/2
    vec3 dir = vec3(cos(lat) * sin(lon), sin(lat), cos(lat) * cos(lon));
    gl_FragColor = textureCube(map, normalize(dir));
  }
`;

/** Render a 360° equirectangular JPEG of `scene` from `position`. */
export async function renderEquirect(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  position: THREE.Vector3,
  width: number,
): Promise<Blob> {
  const [w, h] = equirectSize(width);
  const cubeSize = Math.max(256, Math.floor(width / 4));

  // 1) capture the scene into a cubemap at the spot
  const cubeRT = new THREE.WebGLCubeRenderTarget(cubeSize, {
    generateMipmaps: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  const cubeCam = new THREE.CubeCamera(0.05, 100, cubeRT);
  cubeCam.position.copy(position);
  const prevTarget = renderer.getRenderTarget();
  cubeCam.update(renderer, scene);

  // 2) project the cubemap to an equirect render target via a fullscreen quad
  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: cubeRT.texture } },
    vertexShader: QUAD_VERT,
    fragmentShader: QUAD_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quadScene.add(quad);

  const outRT = new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  renderer.setRenderTarget(outRT);
  renderer.render(quadScene, quadCam);

  // 3) read pixels (bottom-up) and flip into a canvas
  const buf = new Uint8Array(w * h * 4);
  renderer.readRenderTargetPixels(outRT, 0, 0, w, h, buf);
  renderer.setRenderTarget(prevTarget);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * w * 4; // flip Y
    const dst = y * w * 4;
    img.data.set(buf.subarray(src, src + w * 4), dst);
  }
  ctx.putImageData(img, 0, 0);

  // 4) clean up GPU resources
  cubeRT.dispose();
  outRT.dispose();
  mat.dispose();
  quad.geometry.dispose();

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.9,
    ),
  );
}
