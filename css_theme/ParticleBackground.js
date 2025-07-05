// This is a particle background for the home page using p5.js
// and generative noise to create a dynamic and engaging background.
// It is a client component, so it doesn't need a tsconfig.json
// @ts-nocheck
import { useEffect } from 'react';

export default function ParticleBackground() {
  useEffect(() => {
    // Load p5.js dynamically
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js';
    script.async = true;
    script.onload = () => {
      // Your particle animation code here
      new window.p5((p) => {
        let particles = [];
        const num = 200;
        const noiseScale = 0.01 / 9;

        p.setup = () => {
          const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
          canvas.parent('sketch-holder');

          for (let i = 0; i < num; i++) {
            particles.push(p.createVector(p.random(p.width), p.random(p.height)));
          }

          p.stroke(255, 255, 255, 60);
          p.strokeWeight(1);
          p.clear();
        };

        p.draw = () => {
          p.background(0, 20);

          for (let i = 0; i < num; i++) {
            let pt = particles[i];
            p.point(pt.x, pt.y);

            let n = p.noise(pt.x * noiseScale, pt.y * noiseScale, p.frameCount * noiseScale * noiseScale);
            let a = p.TAU * n;
            pt.x += p.cos(a);
            pt.y += p.sin(a);

            if (pt.x < 0 || pt.x > p.width || pt.y < 0 || pt.y > p.height) {
              pt.x = p.random(p.width);
              pt.y = p.random(p.height);
            }
          }
        };

        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight);
        };
      });
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (window.p5) {
        window.p5.remove();
      }
    };
  }, []);

  return <div id="sketch-holder" style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100vh',
    zIndex: 0,
    pointerEvents: 'none',
    opacity: 0.3
  }} />;
}
