import React, { useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBox, useTexture } from '@react-three/drei'

// ============================================================================
// Tweakable Triplanar Projection Parameters
// ============================================================================
const TRIPLANAR_CONFIG = {
  blendFactor: 5.0,          // Soft normal blending exponent (~4.0 to 8.0)
  overscan: 1.06,            // Overscan zoom (~1.02 to 1.08) to bleed texture past image borders
  roughness: 0.12,           // Surface roughness for stone polish
  clearcoat: 1.0,            // High-gloss clearcoat reflection
  clearcoatRoughness: 0.08,  // Clearcoat reflection softness
}

export default function StoneSlab({
  texturePath = '/textures/statuario.webp',
  blendFactor = TRIPLANAR_CONFIG.blendFactor,
  overscan = TRIPLANAR_CONFIG.overscan,
  roughness = TRIPLANAR_CONFIG.roughness,
  clearcoat = TRIPLANAR_CONFIG.clearcoat,
  clearcoatRoughness = TRIPLANAR_CONFIG.clearcoatRoughness,
  ...props
}) {
  const materialRef = useRef()

  // Load high-resolution Statuario marble texture
  const texture = useTexture(texturePath)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping

  // Uniform references for dynamic updates without recompilation
  const uniformsRef = useRef({
    uBlendFactor: { value: blendFactor },
    uOverscan: { value: overscan },
  })

  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.uBlendFactor.value = blendFactor
      uniformsRef.current.uOverscan.value = overscan
    }
  }, [blendFactor, overscan])

  // Custom onBeforeCompile for edge-to-edge Triplanar Projection
  const onBeforeCompile = useMemo(() => {
    return (shader) => {
      shader.uniforms.uBlendFactor = uniformsRef.current.uBlendFactor
      shader.uniforms.uOverscan = uniformsRef.current.uOverscan

      // 1. Vertex Shader: Export object-space local coordinates and normals
      shader.vertexShader = `
        varying vec3 vTriplanarPos;
        varying vec3 vTriplanarNormal;
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vTriplanarPos = position;
        vTriplanarNormal = normal;
        `
      )

      // 2. Fragment Shader: Full-bleed overscanned triplanar projection
      shader.fragmentShader = `
        varying vec3 vTriplanarPos;
        varying vec3 vTriplanarNormal;
        uniform float uBlendFactor;
        uniform float uOverscan;
        ${shader.fragmentShader}
      `.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          // Surface normal blend weights with soft transition around corners & chamfers
          vec3 norm = normalize(abs(vTriplanarNormal));
          vec3 blendWeights = pow(norm, vec3(uBlendFactor));
          blendWeights /= (blendWeights.x + blendWeights.y + blendWeights.z + 0.00001);

          // 1. Front / Back face projection (Z axis):
          // Overscanned by uOverscan so marble veins run edge-to-edge with zero white border
          vec2 uvZ = (vTriplanarPos.xy / vec2(2.5, 3.8)) / uOverscan + 0.5;

          // 2. Left / Right side faces projection (X axis):
          // Uniform vertical and lateral scaling matching the front face
          vec2 uvX = vec2(vTriplanarPos.z / 2.5, vTriplanarPos.y / 3.8) / uOverscan + 0.5;

          // 3. Top / Bottom faces projection (Y axis):
          // Uniform horizontal and depth scaling matching the front face
          vec2 uvY = vec2(vTriplanarPos.x / 2.5, vTriplanarPos.z / 3.8) / uOverscan + 0.5;

          // Sample texture along each axis - no clamping, no inner margins
          vec4 colX = texture2D(map, uvX);
          vec4 colY = texture2D(map, uvY);
          vec4 colZ = texture2D(map, uvZ);

          // Seamless triplanar blend around all chamfered edges
          vec4 blendedDiffuse = colX * blendWeights.x + colY * blendWeights.y + colZ * blendWeights.z;

          // 100% full coverage assignment: no untextured base color fallback
          diffuseColor.rgb = blendedDiffuse.rgb;
        #endif
        `
      )
    }
  }, [])

  return (
    <RoundedBox
      args={[2.5, 3.8, 0.3]} // width: 2.5, height: 3.8, depth/thickness: 0.3
      radius={0.03}           // Crisp architectural chamfer radius
      smoothness={4}          // Precision cut edge subdivisions
      {...props}
    >
      <meshPhysicalMaterial
        ref={materialRef}
        map={texture}
        roughness={roughness}
        metalness={0.0}
        clearcoat={clearcoat}
        clearcoatRoughness={clearcoatRoughness}
        reflectivity={0.8}
        ior={1.52}
        onBeforeCompile={onBeforeCompile}
        customProgramCacheKey={() => 'statuario-triplanar-v3'}
      />
    </RoundedBox>
  )
}
