// ShaderGun ready export: 7 Vars baked at 0.00s.
#ifdef GL_ES
  precision highp float;
#endif

uniform vec2 uScreenResolution;
uniform float uTime;

// Vars: min max default step. Clock animation can be overridden by look, blink, and ear perk.
const float uScowl = 0.85; // Baked at 0.00s; Var was: 0.0 1.0 0.85 0.01
const float uLookX = 0.0; // Baked at 0.00s; Var was: -1.0 1.0 0.0 0.01
const float uLookY = 0.0; // Baked at 0.00s; Var was: -1.0 1.0 0.0 0.01
const float uBlink = 0.0; // Baked at 0.00s; Var was: 0.0 1.0 0.0 0.01
const float uEarPerk = 0.0; // Baked at 0.00s; Var was: -1.0 1.0 0.0 0.01
const float uRuff = 0.85; // Baked at 0.00s; Var was: 0.0 1.0 0.85 0.01
const float uOutline = 0.015; // Baked at 0.00s; Var was: 0.0 0.06 0.015 0.001

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

// True-distance ellipse so outline weight stays even on the major axis.
float sdEllipse(vec2 p, vec2 r) {
  float k1 = length(p / r);
  float k2 = length(p / (r * r));
  return (k1 - 1.0) / max(k2, 1e-6);
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float smax(float a, float b, float k) {
  return -smin(-a, -b, k);
}

vec2 rot(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

float fill(float d, float px) {
  return 1.0 - smoothstep(-px, px, d);
}

// Soft mask for painted washes.
float shade(float d, float soft) {
  return 1.0 - smoothstep(-soft, soft, d);
}

// Tapered stroke; not an exact SDF once the radii differ.
float sdHair(vec2 p, vec2 a, vec2 b, float r0, float r1) {
  vec2 ba = b - a;
  vec2 pa = p - a;
  float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * t) - mix(r0, r1, t);
}

vec3 paint(vec3 dst, vec3 src, float a) {
  return mix(dst, src, clamp(a, 0.0, 1.0));
}

// Two-arc lens that preserves outline width while blinking.
float sdLens(vec2 p, float r, float lid) {
  float arcR = (r * r + lid * lid) / (2.0 * lid);
  // Clamp floating-point noise at the fully open position.
  float off = max(arcR - lid, 0.0);
  vec2 q = abs(vec2(p.y, p.x));
  return (q.y - r) * off > q.x * r
    ? length(vec2(q.x, q.y - r))
    : length(vec2(q.x + off, q.y)) - arcR;
}

// Triangle with a sharp apex and a rounded base.
float sdRoundTri(vec2 p, float w, float h, float r) {
  vec2 q = vec2(abs(p.x), p.y);
  float side = (h * q.x + w * q.y - w * h) / sqrt(h * h + w * w);
  vec2 ba = vec2(-w, h);
  vec2 qa = q - vec2(w, 0.0);
  float along = dot(qa, ba) / dot(ba, ba);
  float d = along > 1.0 ? length(q - vec2(0.0, h)) : side;
  return smax(d, -q.y, r * 1.5);
}

// Fur lock; union with min so notches stay creases.
float sdLock(vec2 p, float bearing, float len, float halfW, float round) {
  vec2 q = rot(p, -bearing);
  return sdRoundTri(vec2(q.y, q.x), halfW, len, round);
}

// Temple spike plus two overlapping shingles along the lower rim.
float ruffLocks(vec2 q, float e) {
  float d = sdLock(q - vec2(0.574, -0.185), 0.263, 0.100 + e, 0.019 + e, 0.004);

  d = min(d, sdLock(q - vec2(0.330, -0.512), -0.054, 0.231 + e, 0.026 + e, 0.004));
  d = min(d, sdLock(q - vec2(0.205, -0.540), -0.183, 0.158 + e, 0.018 + e, 0.004));
  return d;
}

// Mirrored ruff lobe; pad grows the triangle instead of rounding its points.
float sdRuffLobePad(vec2 pf, float grow, float pad) {
  vec2 q = vec2(0.450, -0.380) + (pf - vec2(0.450, -0.380)) / grow;
  float e = pad / grow;

  float d = sdCircle(q - vec2(-0.081, 1.356), 1.948);
  d = smax(d, sdCircle(q - vec2(0.648, -0.701), 0.550), 0.020);
  d = smax(d, sdCircle(q - vec2(0.352, -0.647), 0.555), 0.012);
  d = smax(d, dot(q - vec2(0.190, -0.460), vec2(-0.99986, -0.01667)), 0.030);

  return min(d - e, ruffLocks(q, e)) * grow;
}

// Widen the snout in x only; keep the field Euclidean.
const float snoutWide = 1.20;

float snoutField(vec2 p) {
  vec2 pf = vec2(abs(p.x), p.y);
  float d = sdEllipse(p - vec2(0.0, -0.542), vec2(0.205 * snoutWide, 0.165));
  float lobes = smax(d, dot(pf - vec2(0.0, -0.715),
    normalize(vec2(0.5218, -snoutWide))), 0.030);
  float chinBump = sdEllipse(p - vec2(0.0, -0.640), vec2(0.110 * snoutWide, 0.072));
  return smin(lobes, chinBump, 0.014);
}

// Circular crown bounded by a jaw cone, then unioned with the snout.
float headField(vec2 p) {
  vec2 pf = vec2(abs(p.x), p.y);
  float head = sdCircle(p - vec2(0.0, -0.288), 0.596);
  head = smax(head, dot(pf - vec2(0.0, -0.713), vec2(0.535, -0.845)), 0.055);
  return smin(head, snoutField(p), 0.010);
}

// Asymmetric ear in a pivot frame whose +x faces away from the face.
float earBody(vec2 p) {
  float d = sdCircle(p - vec2(-0.777, 0.025), 1.043);
  d = smax(d, sdCircle(p - vec2(0.629, -0.239), 0.822), 0.012);
  d = smax(d, dot(p - vec2(-0.130, 0.077), vec2(-0.6037, -0.7973)), 0.045);
  return d;
}

// Forked tip; overlap the locks so inset masks do not leak orange.
float earSpikes(vec2 p) {
  float a = sdLock(p - vec2(0.137, 0.331), 1.348, 0.167, 0.046, 0.002);
  float b = sdLock(p - vec2(0.153, 0.357), 0.873, 0.131, 0.032, 0.002);
  return min(a, b);
}

float earShape(vec2 p) {
  return min(earBody(p), earSpikes(p));
}

// Interior orange: even outer rim, height-dependent inner band, blunt black cap.
float earOrange(vec2 p) {
  float rim = 0.004 + 0.016 * smoothstep(-0.030, 0.120, p.y);
  float d = sdCircle(p - vec2(-0.777, 0.025), 1.043 - rim);
  d = smax(d, dot(p - vec2(-0.130, 0.077), vec2(-0.6037, -0.7973)) - 0.012, 0.045);
  float bandY = p.y + 0.239;
  float band = 0.0949 * pow(smoothstep(0.05, 0.24, p.y), 2.6)
    * sqrt(max(0.6757 - bandY * bandY, 0.0));
  d = smax(d, sdCircle(p - vec2(0.629, -0.239), 0.822 - band), 0.010);
  return smax(d, p.y - 0.347, 0.045);
}

// Inner tuft: narrow core with outward-facing teeth.
float sdTuft(vec2 p) {
  float d = dot(p - vec2(-0.011, 0.174), vec2(-0.925, 0.381));
  d = smax(d, dot(p - vec2(0.087, 0.222), vec2(-0.376, 0.927)), 0.016);
  d = smax(d, dot(p - vec2(-0.045, 0.060), vec2(-0.471, -0.882)), 0.012);
  d = smax(d, dot(p - vec2(0.089, 0.186), vec2(0.9985, 0.0555)), 0.005);

  float locks = sdLock(p - vec2(0.065, 0.175), 0.600, 0.086, 0.019, 0.004);
  locks = min(locks, sdLock(p - vec2(0.063, 0.129), 0.137, 0.130, 0.070, 0.005));
  locks = min(locks, sdLock(p - vec2(0.070, 0.061), -0.160, 0.080, 0.031, 0.004));
  return min(d, locks);
}

// Clock-driven blinks, gaze, pupils, smile, and ear turns.
float hash1(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

vec2 hash2(float n) {
  return fract(sin(vec2(n * 127.1, n * 311.7)) * 43758.5453);
}

float wander(float t) {
  float i = floor(t);
  float k = t - i;
  return mix(hash1(i), hash1(i + 1.0), k * k * (3.0 - 2.0 * k));
}

float blinkPulse(float dt, float shut) {
  float u = dt / shut;
  if (u < 0.0 || u > 1.0) return 0.0;
  return pow(sin(3.14159265 * u), 0.45);
}

// Irregular single or double blinks; include the previous slot for overlap.
float blinkAmount(float t) {
  float slot = 3.4;
  float here = floor(t / slot);
  float amount = 0.0;
  for (int k = 0; k < 2; k++) {
    float i = here - float(k);
    float start = i * slot + hash1(i) * (slot - 1.2);
    amount = max(amount, blinkPulse(t - start, 0.22));
    float twice = step(0.72, hash1(i + 0.37));
    amount = max(amount, twice * blinkPulse(t - start - 0.34, 0.19));
  }
  return clamp(amount, 0.0, 1.0);
}

vec2 gazeMark(float i) {
  return (hash2(i) * 2.0 - 1.0) * mix(0.30, 1.0, hash1(i + 5.1));
}

// Fast saccade followed by a held gaze.
vec2 gazeAt(float t) {
  float slot = 1.7;
  float i = floor(t / slot);
  float settle = smoothstep(0.0, 0.11, t - i * slot);
  return mix(gazeMark(i - 1.0), gazeMark(i), settle) * 0.82;
}

// Tight dilation range so the amber rim stays a crescent, not a ring.
float pupilScaleAt(float t) {
  return mix(0.80, 1.04, smoothstep(0.15, 0.85, wander(t / 2.2 + 14.0)));
}

// Smile lifts the outer end of the cheek mark; never fully unswept.
float smileAt(float t) {
  float drift = 0.62 * wander(t / 2.9) + 0.38 * wander(t / 7.7 + 31.0);
  return mix(0.20, 1.00, smoothstep(0.18, 0.82, drift));
}

// Rise, hold, then ease back.
float earPulse(float dt, float rise, float hold, float fall) {
  if (dt < 0.0) return 0.0;
  if (dt < rise) return smoothstep(0.0, rise, dt);
  if (dt < rise + hold) return 1.0;
  return 1.0 - smoothstep(rise + hold, rise + hold + fall, dt);
}

// Shared ear events; side is -1 left, +1 right, used only for lone turns.
float earTurnAt(float t, float side) {
  float slot = 5.0;
  float here = floor(t / slot);
  float turn = 0.0;
  for (int k = 0; k < 2; k++) {
    float i = here - float(k);
    float happens = step(0.34, hash1(i + 7.3));
    float start = i * slot + hash1(i) * (slot - 1.0);
    float dir = mix(-1.0, 1.0, step(0.5, hash1(i + 11.7)));

    float quick = step(0.72, hash1(i + 23.9));
    float hold = mix(mix(1.3, 3.4, hash1(i + 29.3)), 0.05, quick);
    float rise = mix(0.16, 0.07, quick);
    float fall = mix(0.55, 0.26, quick);
    float strength = mix(0.38, 0.82, hash1(i + 17.1)) * mix(1.0, 1.20, quick);

    float lone = step(0.74, hash1(i + 31.1));
    float which = mix(-1.0, 1.0, step(0.5, hash1(i + 37.7)));
    float takes = mix(1.0, step(0.0, side * which), lone);

    turn += happens * takes * dir * strength * earPulse(t - start, rise, hold, fall);
  }
  return clamp(turn, -1.0, 1.0);
}

void main() {
  // Keep the background in frame space and draw the face enlarged.
  const float zoom = 1.08;
  vec2 frame = 2.0 * (gl_FragCoord.xy - 0.5 * uScreenResolution.xy) / uScreenResolution.y;
  vec2 uv = frame / zoom;
  float px = 1.6 / (uScreenResolution.y * zoom);

  vec3 fur = vec3(1.000, 0.541, 0.263);

  // Read the ground before the face, so the corners can answer with it alone.
  float r = length(frame);
  vec3 bg = mix(vec3(0.09, 0.12, 0.17), vec3(0.15, 0.21, 0.27), smoothstep(-1.0, 1.0, frame.y));
  bg += 0.28 * exp(-r * 1.8) * mix(fur, vec3(1.0), 0.45);

  // Skip the unused corners; the 1.02 radius covers the crop's antialiased rim.
  if (r > 1.02) {
    gl_FragColor = vec4(bg, 1.0);
    return;
  }

  float scowl = clamp(uScowl, 0.0, 1.0);
  float ruffAmount = clamp(uRuff, 0.0, 1.0);
  float line = max(uOutline, 0.0);
  // Outer contour is heavier; ink straddles the edge so shapes do not inflate.
  float inner = line * 0.80;
  float grow = line * 0.45;
  float growIn = inner * 0.45;

  vec3 ink = vec3(0.043, 0.043, 0.055);
  vec3 furDark = vec3(0.933, 0.408, 0.227);
  vec3 ruffLit = vec3(1.000, 1.000, 1.000);
  vec3 ruffShade = vec3(0.835, 0.847, 0.882);
  // Amber iris, not the drawing's yellow-green.
  vec3 iris = vec3(1.000, 0.596, 0.184);

  vec2 p = uv;
  vec2 pf = vec2(abs(p.x), p.y);

  float turnL = earTurnAt(uTime, -1.0);
  float turnR = earTurnAt(uTime, 1.0);

  // Left ear is mirrored so +x faces away from the face; perk and turn are identity at rest.
  float perk = uEarPerk * 0.26;
  vec2 pEarL = rot(p - vec2(-0.265, 0.185 + uEarPerk * 0.03), -(perk + turnL * 0.18));
  pEarL.x = -pEarL.x;
  vec2 pEarR = rot(p - vec2(0.265, 0.185 + uEarPerk * 0.03), perk + turnR * 0.18);
  float earL = earShape(pEarL);
  float earR = earShape(pEarR);

  float head = headField(p);
  float body = smin(head, min(earL, earR), 0.030);

  // Ruff joins the silhouette; grow it rather than offsetting, so fur points stay sharp.
  vec2 ruffRoot = vec2(0.190, -0.455);
  vec2 pRuff = ruffRoot + rot(pf - ruffRoot, 0.038);
  float ruffGrow = mix(0.84, 1.0, ruffAmount);
  float ruff = sdRuffLobePad(pRuff, ruffGrow, 0.0);
  float silhouette = min(body, ruff);

  // Nothing is drawn past the ink line, so skip the face and its clocks.
  if (silhouette > line + 2.0 * px) {
    gl_FragColor = vec4(bg, 1.0);
    return;
  }

  float ruffOut = fill(-head, px);
  float ruffInk = inner * mix(-0.45 + 0.33 * smoothstep(-0.30, -0.16, p.y), 0.55, ruffOut);
  float ruffInkD = sdRuffLobePad(pRuff, ruffGrow, ruffInk);
  float silhouetteInk = min(body - line * 0.55, sdRuffLobePad(pRuff, ruffGrow, line * 0.55));

  // Gaze from the clock; look Vars override when either is set.
  vec2 look = gazeAt(uTime);
  if (abs(uLookX) + abs(uLookY) >= 0.02) {
    look = vec2(uLookX, uLookY);
  }
  float blink = clamp(max(uBlink, blinkAmount(uTime)), 0.0, 1.0);

  vec3 color = bg;

  color = paint(color, ink, fill(silhouetteInk, px));

  float bodyMask = fill(body + grow, px);
  color = paint(color, fur, bodyMask);

  vec3 coatCol = mix(ruffShade, ruffLit, smoothstep(-px, px, p.x));

  // Dark band on left-facing rims, width from facing, not a filled half-face.
  float headD = headField(p);
  vec2 headN = normalize(p - vec2(0.0, -0.288));
  float rimFace = clamp(-headN.x, 0.0, 1.0);
  float rimBand = max(-(headD + 0.112 * rimFace * sqrt(rimFace)), 0.18 - rimFace);
  color = paint(color, furDark, fill(rimBand, px) * bodyMask);

  // Ears: black first, then orange; clip to the skull so buried bases stay forehead.
  float earOut = fill(-(head + 0.004), px);
  float earMask = fill(min(earL, earR) + grow, px) * earOut;
  color = paint(color, ink, fill(min(earL, earR) - grow, px)
    * fill(-(head + 0.004 + 0.018 * smoothstep(0.04, 0.14, p.y)
      * smoothstep(0.272, 0.242, p.y)), px));
  float earOrangeD = min(earOrange(pEarL), earOrange(pEarR));
  float earOrangeMask = fill(earOrangeD, px) * earOut;
  color = paint(color, fur, earOrangeMask);
  // Left ear is small enough to take the darker orange outright.
  color = paint(color, furDark, earOrangeMask * smoothstep(px, -px, p.x));

  // Fringe falling from the inner black into the orange.
  float earHair = 1.0;
  for (int i = 0; i < 4; i++) {
    float k = float(i);
    vec2 a = vec2(-0.070 + k * 0.014, 0.226 - k * 0.002);
    vec2 b = a + vec2(0.008 - k * 0.004, -0.104 + k * 0.008);
    earHair = min(earHair, sdHair(pEarL, a, b, 0.0078, 0.0008));
    earHair = min(earHair, sdHair(pEarR, a, b, 0.0078, 0.0008));
  }
  color = paint(color, ink, fill(earHair, px) * earOrangeMask);

  float tuft = min(sdTuft(pEarL), sdTuft(pEarR));
  color = paint(color, ink, fill(tuft - inner * 0.55, px) * earMask);
  float tuftMask = fill(tuft + growIn, px);
  vec3 tuftCol = mix(ruffShade, ruffLit,
    smoothstep(0.000, 0.028, pEarR.x) * smoothstep(-px, px, p.x));
  color = paint(color, tuftCol, tuftMask);
  float tuftHair = 1.0;
  for (int i = 0; i < 4; i++) {
    float k = float(i);
    vec2 a = vec2(-0.012 - k * 0.004, 0.172 - k * 0.024);
    vec2 b = a + vec2(0.062, 0.006);
    tuftHair = min(tuftHair, sdHair(pEarL, a, b, 0.0040, 0.0012));
    tuftHair = min(tuftHair, sdHair(pEarR, a, b, 0.0040, 0.0012));
  }
  color = paint(color, ruffShade, fill(tuftHair, px) * tuftMask);

  // Bridge shadow and frown.
  float browShadow = max(
    dot(p - vec2(-0.050, -0.240), vec2(0.99426, -0.10707)),
    p.y + 0.215);
  color = paint(color, furDark, shade(browShadow, 0.030) * bodyMask);

  float shield = sdRoundTri(p - vec2(0.0, -0.230), 0.062, 0.104, 0.012);
  color = paint(color, furDark, shade(shield, 0.026) * bodyMask * (0.30 + 0.70 * scowl));

  float ridge = sdHair(p, vec2(0.0, 0.158), vec2(0.0, -0.058), 0.006, 0.014);
  color = paint(color, furDark, fill(ridge, px) * bodyMask);

  float crease = sdHair(p, vec2(0.0, 0.148), vec2(0.0, -0.042), 0.0016, 0.0050);
  crease = min(crease, sdHair(pf, vec2(0.016, -0.100), vec2(0.052, -0.186), 0.0046, 0.0014));
  color = paint(color, ink, fill(crease, px) * bodyMask * (0.35 + 0.65 * scowl));

  // Ruff over the fur; light inner line, full weight only where it is silhouette.
  color = paint(color, ink, fill(ruffInkD, px));
  float ruffMask = fill(ruff + growIn, px);
  color = paint(color, coatCol, ruffMask);

  float ruffHair = min(
    min(sdHair(pRuff, vec2(0.545, -0.322), vec2(0.732, -0.343), 0.0034, 0.0012),
        sdHair(pRuff, vec2(0.528, -0.356), vec2(0.648, -0.350), 0.0032, 0.0011)),
    sdHair(pRuff, vec2(0.528, -0.413), vec2(0.592, -0.402), 0.0028, 0.0010)
  );
  color = paint(color, ink, fill(ruffHair, px) * ruffMask);

  // Muzzle in front of the ruff; drop the top outline and where it meets the contour.
  float snout = snoutField(p);
  float room = grow + inner * 0.55;
  color = paint(color, ink, fill(snout - inner * 0.55, px) * max(bodyMask, ruffMask)
    * smoothstep(-0.42, -0.50, p.y) * smoothstep(-room, -room - 0.014, silhouette));
  float snoutMask = fill(snout + growIn, px);
  color = paint(color, fur, snoutMask);
  color = paint(color, furDark, shade(browShadow, 0.030) * snoutMask);

  // Shield-shaped nose with a grey fill and catchlight.
  float nose = p.y + 0.428;
  nose = smax(nose, dot(vec2(abs(p.x) - 0.030, p.y + 0.4285), vec2(0.2591, 0.9658)), 0.007);
  nose = smax(nose, dot(vec2(abs(p.x) - 0.0755, p.y + 0.4525), vec2(0.9634, 0.2685)), 0.007);
  nose = smax(nose, dot(vec2(abs(p.x) - 0.0660, p.y + 0.5120), vec2(0.4689, -0.8831)), 0.009);
  color = paint(color, ink, fill(nose, px) * snoutMask);
  color = paint(color, vec3(0.098), smoothstep(-0.010, -0.036, nose) * snoutMask);

  color = paint(color, ruffShade,
    fill(sdHair(p, vec2(0.036, -0.457), vec2(0.047, -0.486), 0.0096, 0.0012), px));

  // Philtrum and lip; outer ends track the widened snout.
  float philtrumD = sdHair(p, vec2(0.0, -0.545), vec2(0.0, -0.606), 0.0060, 0.0055);
  philtrumD = min(philtrumD, sdHair(pf, vec2(0.0, -0.606),
    vec2(0.062 * snoutWide, -0.628), 0.0058, 0.0050));
  philtrumD = min(philtrumD, sdHair(pf, vec2(0.062 * snoutWide, -0.628),
    vec2(0.118 * snoutWide, -0.657), 0.0050, 0.0044));
  color = paint(color, ink, fill(philtrumD, px) * snoutMask);

  float chin = smax(snout,
    sdEllipse(p - vec2(0.0, -0.664), vec2(0.104 * snoutWide, 0.042)), 0.014);
  color = paint(color, ink, fill(chin - inner * 0.55, px) * snoutMask);
  float chinMask = fill(chin + growIn, px);
  color = paint(color, coatCol, chinMask);

  // Two-stroke mouth on each cheek; smile lifts the outer end.
  float smile = smileAt(uTime);
  float mouthScale = 1.60;
  float mouthWeight = 1.45;
  vec2 curl = vec2(0.032, 0.021) * smile;
  vec2 mRoot = vec2(0.2005 * snoutWide, -0.4890);
  vec2 mJoin = mRoot + (vec2(0.2230 * snoutWide, -0.4475) - mRoot) * mouthScale + curl;
  float tickD = min(
    min(sdHair(pf, mRoot + (vec2(0.2080 * snoutWide, -0.4285) - mRoot) * mouthScale + curl,
          mJoin, 0.0035 * mouthWeight, 0.0050 * mouthWeight),
        sdHair(pf, mJoin,
          mRoot + (vec2(0.2325 * snoutWide, -0.4590) - mRoot) * mouthScale + curl,
          0.0050 * mouthWeight, 0.0018 * mouthWeight)),
    sdHair(pf, mJoin, mRoot, 0.0042 * mouthWeight, 0.0050 * mouthWeight)
  );
  color = paint(color, ink, fill(tickD, px) * max(bodyMask, max(ruffMask, snoutMask)));

  // Three whiskers a side; roots follow the snout, tips stay on the ruff.
  float whiskerD = min(
    min(sdHair(pf, vec2(0.176 * snoutWide, -0.508), vec2(0.468, -0.424), 0.0040, 0.0009),
        sdHair(pf, vec2(0.183 * snoutWide, -0.528), vec2(0.448, -0.481), 0.0040, 0.0009)),
    sdHair(pf, vec2(0.188 * snoutWide, -0.546), vec2(0.332, -0.530), 0.0036, 0.0009)
  );
  color = paint(color, ink, fill(whiskerD, px) * max(ruffMask, snoutMask));

  // Eyes: folded x, separate lid and opening tilts. Gaze x is un-folded with sign(p.x).
  float lidOpen = mix(1.0, 0.06, blink);
  float slant = 0.78;
  float tilt = 0.527 * slant * mix(0.55, 1.06, scowl);
  float openTilt = 0.452 * slant * mix(0.55, 1.06, scowl);
  float lidWeight = 0.87;
  float eyeSize = 1.30 / lidWeight;
  float eyeOut = 0.076;
  float eyeUp = 0.045;
  vec2 pe = rot(vec2(abs(p.x) - (0.212 + eyeOut), p.y + 0.183 - eyeUp), -tilt) / eyeSize;
  vec2 po = rot(vec2(abs(p.x) - (0.211 + eyeOut), p.y + 0.1840 - eyeUp), -openTilt) / eyeSize;

  float eyeNarrow = 0.88;
  float eyeWide = 0.95;
  float eyeS = sdLens(pe, 0.131 * lidWeight * eyeWide,
    0.058 * lidWeight * eyeNarrow * lidOpen);
  float underLid = 0.006;
  float underEye = smax(eyeS - underLid, pe.y + 0.026, 0.006) * eyeSize;
  color = paint(color, furDark, fill(underEye, px) * bodyMask);
  float eyeD = eyeS * eyeSize;
  color = paint(color, ink, fill(eyeD, px));
  float openS = sdLens(po, 0.094 * eyeWide, 0.044 * eyeNarrow * lidOpen);
  // Fade interior over the last of the close so a shut eye stays a dark line.
  float openFade = smoothstep(0.06, 0.30, lidOpen);
  float openMask = fill(openS * eyeSize, px) * openFade;
  color = paint(color, vec3(0.980, 0.984, 0.996), openMask);

  vec2 gaze = rot(vec2(sign(p.x) * look.x * 0.020, look.y * 0.014), -openTilt);
  float irisScale = 0.90;
  vec2 irisAt = vec2(-0.0060, 0.0212 + 0.0348 * (1.0 - irisScale));
  float irisC = sdCircle(po - irisAt - gaze, 0.063 * irisScale);
  color = paint(color, iris, fill(max(irisC, openS) * eyeSize, px) * openFade);
  // Clip the pupil to the lid so no hairline appears between them.
  float pupilScale = pupilScaleAt(uTime);
  float pupilD = sdCircle(po - irisAt - gaze, 0.0435 * pupilScale * irisScale);
  color = paint(color, ink, fill(smax(pupilD, eyeS, 0.004) * eyeSize, px));

  float glintD = sdCircle(po - irisAt - vec2(0.0417, -0.0044) * irisScale - gaze, 0.010);
  color = paint(color, vec3(1.0), fill(glintD * eyeSize, px) * openMask * (1.0 - blink));

  gl_FragColor = vec4(color, 1.0);
}
