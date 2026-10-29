/**
 * "PAPEL AHUMADO · IV" — edition-IV variant of the EPK field shader.
 *
 * Same skeleton as the EPK (fbm field, slow drift, vignette, grain) but graded
 * to References/Flyer.jpg: off-white concrete paper, graphite smoke clouds that
 * drift and gather around the centre, and static ink dust. No colour — red
 * belongs only to the eyes. The field leans gently toward the pointer.
 */

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision mediump float;

  varying vec2 vUv;

  uniform float uTime;
  uniform float uAspect;
  uniform vec2  uPointer;  // -1..1, damped
  uniform vec3  uPaper;
  uniform vec3  uSmoke;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 p = vUv - 0.5;
    p.x *= uAspect;
    vec2 pp = p + uPointer * 0.02;

    float t = uTime * 0.035;

    // Domain-warped smoke, denser toward the centre (where the figure stands).
    vec2 q = vec2(fbm(pp * 1.4 + t), fbm(pp * 1.4 - t + 4.3));
    float smoke = fbm(pp * 2.1 + q * 1.6 + vec2(t * 0.6, -t * 0.3));
    float centre = smoothstep(0.95, 0.05, length(p * vec2(0.8, 1.15)));
    smoke = smoothstep(0.42, 0.92, smoke) * (0.45 + centre * 0.55);

    // Paper grain (fine, static).
    float grain = noise(vUv * vec2(uAspect, 1.0) * 600.0);

    vec3 col = uPaper;
    col = mix(col, uSmoke, smoke * 0.55);
    col *= 0.96 + grain * 0.06;

    // Ink dust: sparse round specks (random size/offset per cell), like airbrush spatter.
    vec2 g = vUv * vec2(uAspect, 1.0) * 160.0;
    vec2 cell = floor(g);
    float h = hash(cell);
    vec2 centre2 = vec2(hash(cell + 3.1), hash(cell + 7.7));
    float r = 0.05 + 0.12 * hash(cell + 1.3);
    float speck = (1.0 - smoothstep(r * 0.6, r, length(fract(g) - centre2))) * step(0.965, h);
    col = mix(col, vec3(0.1), speck * 0.8);

    // Soft burn at the edges, like the printed poster.
    float vig = smoothstep(1.25, 0.35, length(p * vec2(0.8, 1.1)));
    col *= 0.9 + vig * 0.1;

    gl_FragColor = vec4(col, 1.0);
  }
`;
