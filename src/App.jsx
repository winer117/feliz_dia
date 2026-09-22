import { useState, useEffect, useMemo, useCallback, memo } from "react";
import "./App.css";
import minionImage from './assets/minion.jpg';

const MAX_FLOWERS = 24; // Reducimos un poco el total para que no se sature de más
const GROWTH_INTERVAL = 1200;
const BRANCH_VARIATION = 0.2;

// CAMBIO CLAVE: Ángulos más cerrados para que crezca hacia arriba como un ramo real
const INITIAL_FLOWERS = [
  { id: 1, angle: -30, distance: 0.08, parent: null, level: 0 },
  { id: 2, angle: 30, distance: 0.08, parent: null, level: 0 },
];

const naturalVariation = (base, variation) =>
  base * (1 + (Math.random() - 0.5) * variation);

const leafPositions = [0.25, 0.5, 0.75, 1];

// ========== CINTAS DORADAS FLOTANTES 3D ==========
const FloatingRibbons = memo(() => {
  const ribbons = useMemo(() => [...Array(25)].map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDuration: `${Math.random() * 5 + 4}s`, 
    animationDelay: `${Math.random() * 2}s`, 
    scale: Math.random() * 0.5 + 0.5,
    rotateStart: `${Math.random() * 360}deg`
  })), []);

  return (
    <div className="ribbons-container" aria-hidden="true">
      {ribbons.map(r => (
        <div 
          key={r.id} 
          className="golden-ribbon" 
          style={{
            left: r.left,
            "--duration": r.animationDuration,
            "--delay": r.animationDelay,
            "--scale": r.scale,
            "--rotate-start": r.rotateStart
          }}
        ></div>
      ))}
    </div>
  );
});

// ========== EFECTO MÁQUINA DE ESCRIBIR ==========
const TypewriterText = ({ text }) => {
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setDisplayText(text.substring(0, i + 1));
      i++;
      if (i === text.length) clearInterval(timer);
    }, 100); 
    
    return () => clearInterval(timer);
  }, [text]);

  return <span>{displayText}</span>;
};

// ========== COMPONENTE FLOR Y TALLO ==========
const Flower = memo(({ level, delay, angle, distance, parentAngle = 0, parentDistance = 0 }) => {
  const { position, stemLength, stemAngle } = useMemo(() => {
    const baseSize = Math.min(window.innerWidth, window.innerHeight);
    
    // REDUCIMOS la dispersión y enfocamos el ramo hacia arriba (-90 grados es vertical hacia arriba)
    const spreadFactor = 0.45; 

    const variedAngle = naturalVariation(angle, BRANCH_VARIATION);
    const variedDistance = naturalVariation(distance, BRANCH_VARIATION);

    // Posición centrada y apuntando hacia arriba
    const position = {
      x: baseSize * spreadFactor * Math.cos(((variedAngle - 90) * Math.PI) / 180),
      y: baseSize * spreadFactor * Math.sin(((variedAngle - 90) * Math.PI) / 180) * 0.8
    };

    const parentPosition = {
      x: parentDistance * baseSize * Math.cos(((parentAngle - 90) * Math.PI) / 180),
      y: parentDistance * baseSize * Math.sin(((parentAngle - 90) * Math.PI) / 180) * 0.8
    };

    const stemLength = Math.hypot(
      position.x - parentPosition.x,
      position.y - parentPosition.y
    );

    const stemAngle = Math.atan2(
      parentPosition.y - position.y,
      parentPosition.x - position.x
    ) * (180 / Math.PI) - 90;

    return { position, stemLength, stemAngle };
  }, [angle, distance, parentAngle, parentDistance]);

  const stemThickness = useMemo(() => {
    return Math.max(1.5, 4 - level * 0.8);
  }, [level]);

  const initialSkew = useMemo(() => (Math.random() - 0.5) * 1, []);

  const randomFeatures = useMemo(() => {
    const stemDelayOffset = Math.random() * 0.2;
    const leaves = leafPositions.map((positionPercent, i) => {
      const isEven = i % 2 === 0;
      const baseRotate = isEven ? -25 : 25;
      const randomRotate = (Math.random() - 0.5) * 15;
      const skewY = (Math.random() - 0.5) * 10;
      
      return {
        positionPercent,
        leafRotate: `${baseRotate + randomRotate}deg`,
        skewY: `skewY(${skewY}deg)`,
        leafDelay: `${delay + 0.1 * i}s`
      };
    });

    return { stemDelayOffset, leaves };
  }, [delay]);

  return (
    <div
      className="flower"
      style={{
        "--delay": `${delay}s`,
        "--x": `${position.x}px`,
        "--y": `${position.y}px`,
      }}
    >
      <div
        className="stem"
        style={{
          "--length": `${stemLength}px`,
          "--angle": `${stemAngle}deg`,
          "--delay": `${delay + randomFeatures.stemDelayOffset}s`,
          "--stem-thickness": `${stemThickness}px`,
          "--stem-skew": `${initialSkew}deg`,
        }}
      >
        {randomFeatures.leaves.map((leaf, i) => (
          <div
            key={i}
            className="leaf"
            style={{
              "--leaf-position": `${leaf.positionPercent * 100}%`,
              "--leaf-rotate": leaf.leafRotate,
              "--leaf-delay": leaf.leafDelay,
              transform: leaf.skewY,
            }}
          ></div>
        ))}
      </div>
      <div className="center"></div>
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="petal"
          style={{
            "--rotate": `${i * 45}deg`,
            animationDelay: `${delay + 0.05 * i}s`,
          }}
        ></div>
      ))}
    </div>
  );
});

// ========== COMPONENTE RAMO ORDENADO ==========
const Bouquet = () => {
  const [flowers, setFlowers] = useState(INITIAL_FLOWERS);
  
  const parentMap = useMemo(() => {
    const map = new Map();
    flowers.forEach(flower => map.set(flower.id, flower));
    return map;
  }, [flowers]);

  const generateBranches = useCallback(() => {
    setFlowers((prev) => {
      if (prev.length >= MAX_FLOWERS) return prev;

      let currentMaxId = Math.max(...prev.map(f => f.id), 0);

      const newFlowers = prev.flatMap((flower) => {
        if (flower.level < 3) {
          // Ángulos controlados para mantener forma de ramo y no dispersarse en círculo
          const angleStep = naturalVariation(35, 0.2); 
          return [1, -1].map(direction => {
            currentMaxId++;
            return {
              id: currentMaxId,
              angle: flower.angle + angleStep * direction,
              distance: naturalVariation(flower.distance + 0.12, 0.1),
              parent: flower.id,
              level: flower.level + 1,
            };
          });
        }
        return []; 
      });

      return prev.concat(newFlowers).slice(0, MAX_FLOWERS);
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(generateBranches, GROWTH_INTERVAL);
    return () => clearInterval(timer);
  }, [generateBranches]);

  return (
    <div className="bouquet" aria-live="polite">
      {flowers.map((flower) => (
        <Flower
          key={flower.id}
          level={flower.level}
          delay={flower.level * 0.3 + 0.2}
          angle={flower.angle}
          distance={flower.distance}
          parentAngle={parentMap.get(flower.parent)?.angle || 0}
          parentDistance={parentMap.get(flower.parent)?.distance || 0}
        />
      ))}
    </div>
  );
};

// ========== APLICACIÓN PRINCIPAL ==========
const App = () => {
  const [showBouquet, setShowBouquet] = useState(false);
  const [isImageVisible, setIsImageVisible] = useState(false);
  const [isTextVisible, setIsTextVisible] = useState(false);

  const handleButtonClick = () => {
    if (!isImageVisible) {
      setIsImageVisible(true);
      setTimeout(() => {
        setShowBouquet(true);
        setIsTextVisible(true);
      }, 800); 
    } else {
      setIsImageVisible(false);
      setShowBouquet(false);
      setIsTextVisible(false);
    }
  };

  return (
    <div className="container">
      {showBouquet && <FloatingRibbons />}

      <h1>"¡ Te tengo una sorpresa !" 🌸</h1>
      
      <button
        onClick={handleButtonClick}
        className="magic-button"
        aria-label={showBouquet ? "Cerrar sorpresa" : "Abrir sorpresa"}
      >
        {showBouquet ? "Cierra la sorpresa." : "¡Haz clic aquí para abrir tu sorpresa!"}
      </button>

      {/* Imagen del Minion */}
      <img
        src={minionImage}
        alt="Minion sosteniendo flores"
        className={`minion-holding ${isImageVisible ? 'visible' : ''}`}
      />

      {showBouquet && <Bouquet />}

      <div className={`bottom-right-text ${isTextVisible ? 'visible' : ''}`}>
        {isTextVisible && <TypewriterText text="Con cariño, Mario" />}
        
        {isTextVisible && (
          <div className="fireworks-container">
            <div className="firework"></div>
            <div className="firework"></div>
            <div className="firework"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;