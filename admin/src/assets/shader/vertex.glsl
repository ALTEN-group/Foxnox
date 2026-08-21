#ifdef GL_ES
  precision highp float;
#endif

#define halfPI 1.5707963

attribute vec2 aVertexPosition;
uniform float uTime;
varying vec4 baseColor;
varying float speed;

float sineEquation(float amplitude, float period, float shiftX, float shiftY){
  return amplitude * sin( period + shiftX ) + shiftY;
}

void main(){
  gl_Position = vec4(aVertexPosition, 0.0, 1.0);
  speed = uTime * 0.25;
  float fadeIn = smoothstep(0.0, 3.0, uTime);
  // Target color #fb923c (R=0.984, G=0.573, B=0.235), oscillation around 1.0 scaled by fadeIn
  // Red peaks at 1.0 rather than above it, so its oscillation is centred below 1.0
  float osc1 = sineEquation( 0.06, uTime * 0.11, -halfPI, 0.94 );
  float osc2 = sineEquation( 0.10, uTime * 0.07, -halfPI, 1.0 );
  float osc3 = sineEquation( 0.08, uTime * 0.17, -halfPI, 1.0 );
  baseColor = vec4(0.984 * osc1 * fadeIn, 0.573 * osc2 * fadeIn, 0.235 * osc3 * fadeIn, fadeIn);
}