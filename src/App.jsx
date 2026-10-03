import React, { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import StoneSlab from './StoneSlab'

// Register GSAP ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger)

/**
 * Responsive Camera Framing Rig:
 * Keeps camera.position.z fixed at 6.0 (or 6.5 on mobile/portrait aspect < 0.85)
 * Calls camera.updateProjectionMatrix() cleanly
 */
function ResponsiveCamera() {
  const { camera, size } = useThree()

  useFrame(() => {
    const aspect = size.width / size.height
    const targetZ = aspect < 0.85 ? 6.5 : 6.0

    if (Math.abs(camera.position.z - targetZ) > 0.01) {
      camera.position.z = targetZ
      camera.updateProjectionMatrix()
    }
  })

  return null
}

/**
 * Responsive 3D Storyboard Rig:
 * Dynamically computes scale and coordinates based on R3F's reactive viewport,
 * adapting cleanly between desktop (min-width: 768px) and mobile (max-width: 767px).
 */
function SlabScrollRig({ containerRef }) {
  const slabRef = useRef()
  const spinSpeed = useRef(0)

  // Reactive Three.js viewport in world units at Z=0
  const { width: vpWidth, height: vpHeight } = useThree((state) => state.viewport)

  // Continuous turntable axial spin along the Y-axis
  useFrame((state, delta) => {
    if (!slabRef.current) return

    // Increment Y-axis rotation continuously according to spinSpeed
    slabRef.current.rotation.y += delta * spinSpeed.current * 0.5

    // Settle rotation.y smoothly when returning to Section 1 hero
    if (spinSpeed.current < 0.05) {
      slabRef.current.rotation.y = THREE.MathUtils.damp(
        slabRef.current.rotation.y,
        0,
        4,
        delta
      )
    }
  })

  useEffect(() => {
    if (!slabRef.current || !containerRef.current) return

    const mm = gsap.matchMedia()

    // ========================================================================
    // 1. DESKTOP CHOREOGRAPHY (min-width: 1024px)
    // ========================================================================
    mm.add('(min-width: 1024px)', () => {
      // Scale to match viewport width with a slight 2% bleed over the sides
      const edgeToEdgeScale = (vpWidth / 3.8) * 1.02
      const desktopStandingScale = Math.min(1.05, vpHeight * 0.18)

      // Initial State 1: Horizontal edge-to-edge lower center
      gsap.set(slabRef.current.position, {
        x: 0,
        y: -vpHeight * 0.28, // lower third of viewport
        z: 0.2,
      })
      gsap.set(slabRef.current.rotation, {
        x: 0.22,
        y: 0.0,
        z: Math.PI / 2,
      })
      gsap.set(slabRef.current.scale, {
        x: edgeToEdgeScale,
        y: edgeToEdgeScale,
        z: edgeToEdgeScale,
      })
      spinSpeed.current = 0

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.5,
        },
      })

      // Section 1 -> Section 2 (Desktop):
      // Un-twists rotation.z to 0, glides to right (vpWidth * 0.25), calm spin (1.0)
      tl.to(
        slabRef.current.position,
        {
          x: vpWidth * 0.25,
          y: 0.0,
          z: 0.0,
          ease: 'power1.inOut',
        },
        0
      )
      tl.to(
        slabRef.current.rotation,
        {
          x: 0.0,
          z: 0.0,
          ease: 'power1.inOut',
        },
        0
      )
      tl.to(
        slabRef.current.scale,
        {
          x: desktopStandingScale,
          y: desktopStandingScale,
          z: desktopStandingScale,
          ease: 'power1.inOut',
        },
        0
      )
      tl.to(
        spinSpeed,
        {
          current: 1.0,
          ease: 'power1.inOut',
        },
        0
      )

      // Section 2 -> Section 3 (Desktop):
      // Glides to left (-vpWidth * 0.25), architectural tilt, spinSpeed 1.5
      tl.to(
        slabRef.current.position,
        {
          x: -vpWidth * 0.25,
          y: 0.0,
          z: 0.0,
          ease: 'power1.inOut',
        },
        1
      )
      tl.to(
        slabRef.current.rotation,
        {
          x: 0.15,
          z: -0.05,
          ease: 'power1.inOut',
        },
        1
      )
      tl.to(
        slabRef.current.scale,
        {
          x: desktopStandingScale * 0.96,
          y: desktopStandingScale * 0.96,
          z: desktopStandingScale * 0.96,
          ease: 'power1.inOut',
        },
        1
      )
      tl.to(
        spinSpeed,
        {
          current: 1.5,
          ease: 'power1.inOut',
        },
        1
      )
    })

    // ========================================================================
    // 2. TABLET & MOBILE CHOREOGRAPHY (< 1024px)
    // 425px Baseline Calibration: 0.72 Scale Multiplier & Screen Margin Offsets
    // ========================================================================
    mm.add('(max-width: 1023px)', () => {
      // Full vertical architectural presence calibrated to 0.72 multiplier
      const mobileHeroScale = (vpHeight / 3.8) * 0.95
      const mobileScale = (vpHeight / 3.8) * 0.72

      // Axis Recalibration: Tucked cleanly into right & left margins (-/+ 0.08 * vpWidth)
      const targetRightX = (vpWidth * 0.5) - (vpWidth * 0.08)
      const targetLeftX = -((vpWidth * 0.5) - (vpWidth * 0.08))

      // Initial State 1: Vertical full-bleed portrait cover slab
      gsap.set(slabRef.current.position, {
        x: 0,
        y: 0,
        z: 0.1,
      })
      gsap.set(slabRef.current.rotation, {
        x: 0.0,
        y: 0.0,
        z: 0.0,
      })
      gsap.set(slabRef.current.scale, {
        x: mobileHeroScale,
        y: mobileHeroScale,
        z: mobileHeroScale,
      })
      spinSpeed.current = 0

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.5,
        },
      })

      // Section 1 -> Section 2 (Tucked cleanly into right margin):
      // Animate slab.position.x to targetRightX, mobileScale (0.72), upright (x: 0, z: 0), spinSpeed 0.05
      tl.to(
        slabRef.current.position,
        {
          x: targetRightX,
          y: 0,
          z: 0,
          ease: 'power1.inOut',
        },
        0
      )
      tl.to(
        slabRef.current.rotation,
        {
          x: 0.0,
          z: 0.0,
          ease: 'power1.inOut',
        },
        0
      )
      tl.to(
        slabRef.current.scale,
        {
          x: mobileScale,
          y: mobileScale,
          z: mobileScale,
          ease: 'power1.inOut',
        },
        0
      )
      tl.to(
        spinSpeed,
        {
          current: 0.05,
          ease: 'power1.inOut',
        },
        0
      )

      // Section 2 -> Section 3 (Tucked cleanly into left margin):
      // Animate slab.position.x to targetLeftX, mobileScale (0.72), architectural tilt (x: 0.12), spinSpeed 0.2
      tl.to(
        slabRef.current.position,
        {
          x: targetLeftX,
          y: 0,
          z: 0,
          ease: 'power1.inOut',
        },
        1
      )
      tl.to(
        slabRef.current.rotation,
        {
          x: 0.12,
          z: 0.0,
          ease: 'power1.inOut',
        },
        1
      )
      tl.to(
        slabRef.current.scale,
        {
          x: mobileScale,
          y: mobileScale,
          z: mobileScale,
          ease: 'power1.inOut',
        },
        1
      )
      tl.to(
        spinSpeed,
        {
          current: 0.2,
          ease: 'power1.inOut',
        },
        1
      )
    })

    // Refresh ScrollTrigger to ensure bounds are perfectly aligned
    ScrollTrigger.refresh()

    return () => mm.revert()
  }, [vpWidth, vpHeight, containerRef])

  return (
    <group ref={slabRef}>
      <StoneSlab />
    </group>
  )
}

export default function App() {
  const containerRef = useRef(null)
  const heroTextRef = useRef(null)
  const specsTextRef = useRef(null)
  const inquireTextRef = useRef(null)

  // Coordinate text opacity transitions with scroll narrative
  useEffect(() => {
    if (!containerRef.current) return

    const ctx = gsap.context(() => {
      // Fade Hero Text as user scrolls down
      if (heroTextRef.current) {
        gsap.to(heroTextRef.current, {
          scrollTrigger: {
            trigger: heroTextRef.current,
            start: 'top 15%',
            end: 'bottom top',
            scrub: true,
          },
          opacity: 0,
          y: -50,
        })
      }

      // Fade in Section 2 text
      if (specsTextRef.current) {
        gsap.fromTo(
          specsTextRef.current,
          { opacity: 0.15, y: 60 },
          {
            scrollTrigger: {
              trigger: specsTextRef.current,
              start: 'top 80%',
              end: 'top 40%',
              scrub: true,
            },
            opacity: 1,
            y: 0,
          }
        )
      }

      // Fade in Section 3 inquiry card
      if (inquireTextRef.current) {
        gsap.fromTo(
          inquireTextRef.current,
          { opacity: 0.15, y: 60 },
          {
            scrollTrigger: {
              trigger: inquireTextRef.current,
              start: 'top 80%',
              end: 'top 45%',
              scrub: true,
            },
            opacity: 1,
            y: 0,
          }
        )
      }
    })

    // Listen to resize to keep ScrollTrigger measurements accurate
    const handleResize = () => {
      ScrollTrigger.refresh()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      ctx.revert()
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="page-container bg-[#0c0d0e] text-white overflow-x-hidden"
    >
      {/* Subtle Ambient Vignette Lighting */}
      <div className="ambient-glow" />

      {/* Floating Minimal Navigation Header */}
      <nav className="luxury-nav">
        <div>
          <div className="brand-title">Statuario Atelier</div>
          <div className="brand-subtitle">Carrara • Milano • London</div>
        </div>
        <div className="nav-status">
          <span className="status-dot"></span>
          <span>Lot Reserve: Active</span>
        </div>
      </nav>

      {/* Fixed Fullscreen 3D Canvas Background Layer */}
      <div
        className="fixed inset-0 w-full h-full pointer-events-none z-0 fixed-canvas-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 6], fov: 45 }}
          gl={{ antialias: true }}
        >
          <Suspense fallback={null}>
            {/* Preserved Studio Lighting & Environment */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 8, 5]} intensity={1.5} />
            <directionalLight position={[-5, -2, -5]} intensity={0.3} />
            <Environment preset="city" />

            {/* Responsive Camera Distance Rig */}
            <ResponsiveCamera />

            {/* Responsive GSAP Scroll Storyboard Rig */}
            <SlabScrollRig containerRef={containerRef} />

            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.05}
              enableZoom={false}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* HTML Content Presentation Layers (relative z-10) */}
      <main className="content-layers relative z-10 w-full">
        {/* ==================================================================
            SECTION 1: HERO (Clean, minimal placeholder top-aligned)
            Horizontal slab stretches edge-to-edge across lower center
            ================================================================== */}
        <section
          id="section-hero"
          className="story-section section-hero-centered min-h-screen"
        >
          <div ref={heroTextRef} className="hero-centered-content">
            <div className="hero-frosted-card backdrop-blur-md bg-black/40 border border-white/10 rounded-2xl p-5 mx-4">
              <div className="kicker-badge">
                <span>●</span> Quarry Extraction
              </div>
              <h1 className="hero-headline font-serif">
                STATUARIO WHITE
              </h1>
              <p className="hero-subtitle">
                Scroll to explore
              </p>
              <div className="hero-scroll-cue">
                <div className="mouse-scroll-icon">
                  <div className="mouse-scroll-dot" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================
            SECTION 2: CRAFTSMANSHIP & CALIBRATION
            Desktop: Slab upright on right (vpWidth * 0.25), text on left
            Tablet/Mobile: Left 62% viewport (38% margin for right-docked slab)
            ================================================================== */}
        <section
          id="section-specs"
          className="story-section section-specs-left min-h-screen"
        >
          <div
            ref={specsTextRef}
            className="text-container section-text-wrapper mobile-split-left w-[62vw] max-w-[62vw] text-left pl-4 pr-2 overflow-hidden"
          >
            <div className="kicker-badge">
              PRECISION CALIBRATED
            </div>
            <h2 className="section-headline font-serif">
              20mm Sawn Bookmatched Slabs
            </h2>
            <p className="sub-paragraph">
              Extracted from pristine Italian quarry beds, wire-sawn and calibrated with
              precision chamfers to expose deep crystalline veining.
            </p>

            {/* Placeholder Feature Bullets */}
            <div className="specs-glass-card">
              <div className="bullet-specs-list">
                <div className="bullet-item">
                  <span className="bullet-dot">◆</span>
                  <span>
                    <strong className="bullet-highlight">20mm True Calibrated Thickness:</strong> Precision
                    architectural edge profile with 0.03 chamfer.
                  </span>
                </div>
                <div className="bullet-item">
                  <span className="bullet-dot">◆</span>
                  <span>
                    <strong className="bullet-highlight">Mirror Polish Finish:</strong> Progressive
                    diamond abrasives yielding glass-smooth ambient reflections.
                  </span>
                </div>
                <div className="bullet-item">
                  <span className="bullet-dot">◆</span>
                  <span>
                    <strong className="bullet-highlight">Continuous Veining Flow:</strong> Sawn in sequence
                    for seamless mirror and quad-bookmatched staging.
                  </span>
                </div>
                <div className="bullet-item">
                  <span className="bullet-dot">◆</span>
                  <span>
                    <strong className="bullet-highlight">Technical Metric:</strong> Water absorption
                    ≤ 0.13% | Calcite crystal ground &gt; 98.8%.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================
            SECTION 3: FINAL PRESENTATION & INQUIRY
            Desktop: Slab on left (-vpWidth * 0.25), inquiry card on right
            Tablet/Mobile: Right 62% viewport (38% margin for left-docked slab)
            ================================================================== */}
        <section
          id="section-inquire"
          className="story-section section-inquire-right min-h-screen"
        >
          <div
            ref={inquireTextRef}
            className="text-container section-text-wrapper mobile-split-right w-[62vw] max-w-[62vw] ml-auto text-left pr-4 pl-2 overflow-hidden"
          >
            <div className="kicker-badge">
              SPECIFICATION & LOT RESERVE
            </div>
            <h2 className="section-headline font-serif">
              Specify For Your Project
            </h2>
            <p className="sub-paragraph">
              Full bundle photos, photogrammetric slab dimension scans, and export logistics
              available on request.
            </p>

            {/* Micro-Details Inquiry Card */}
            <div className="micro-details-card">
              <div className="detail-row">
                <span className="check-icon">✓</span>
                <span>High-resolution dry-lay CAD staging scans available</span>
              </div>
              <div className="detail-row">
                <span className="check-icon">✓</span>
                <span>Seaworthy timber A-frame crating with shock-sensor tracking</span>
              </div>
              <div className="detail-row">
                <span className="check-icon">✓</span>
                <span>FOB vessel dispatch directly from Port of La Spezia, Italy</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <a
                href="mailto:inquire@statuario-atelier.com?subject=Inquiry%20on%20Statuario%20White%20Lot"
                className="btn-luxury"
              >
                Inquire on Current Lot
                <span>→</span>
              </a>
              <button
                className="btn-secondary"
                onClick={() =>
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }
              >
                Back to Top ↑
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
