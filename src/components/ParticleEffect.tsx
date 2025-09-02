import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  emoji?: string;
}

interface ParticleEffectProps {
  trigger: boolean;
  type?: 'celebration' | 'levelup' | 'achievement' | 'sparkle';
  duration?: number;
  particleCount?: number;
}

export function ParticleEffect({ 
  trigger, 
  type = 'celebration', 
  duration = 3000,
  particleCount = 50 
}: ParticleEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);

  const getParticleConfig = () => {
    switch (type) {
      case 'levelup':
        return {
          colors: ['#FFD700', '#FFA500', '#FF6347', '#FF1493', '#9370DB'],
          emojis: ['🚀', '⭐', '✨', '🎯', '💫'],
          gravity: 0.2,
          spread: 120
        };
      case 'achievement':
        return {
          colors: ['#32CD32', '#00FF00', '#ADFF2F', '#7FFF00', '#98FB98'],
          emojis: ['🏆', '🎉', '🎊', '🌟', '💎'],
          gravity: 0.15,
          spread: 100
        };
      case 'sparkle':
        return {
          colors: ['#FFD700', '#FFFF00', '#FFF8DC', '#F0E68C'],
          emojis: ['✨', '⭐', '💫', '🌟'],
          gravity: 0.1,
          spread: 80
        };
      default:
        return {
          colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
          emojis: ['🎉', '🎊', '🎈', '🎁', '🌈'],
          gravity: 0.3,
          spread: 150
        };
    }
  };

  const createParticles = () => {
    const config = getParticleConfig();
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * (config.spread * Math.PI / 180);
      const velocity = 2 + Math.random() * 4;
      const life = 60 + Math.random() * 120; // 1-3 seconds at 60fps
      
      newParticles.push({
        id: i,
        x: 50, // Start from center
        y: 50,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 2, // Initial upward bias
        life: life,
        maxLife: life,
        size: 8 + Math.random() * 12,
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        emoji: config.emojis[Math.floor(Math.random() * config.emojis.length)]
      });
    }
    
    setParticles(newParticles);
  };

  const updateParticles = () => {
    setParticles(prevParticles => {
      const config = getParticleConfig();
      return prevParticles
        .map(particle => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          vy: particle.vy + config.gravity, // Apply gravity
          life: particle.life - 1
        }))
        .filter(particle => particle.life > 0 && particle.y < 120); // Remove dead or off-screen particles
    });
  };

  useEffect(() => {
    if (trigger && !isActive) {
      setIsActive(true);
      createParticles();
      
      const animationInterval = setInterval(updateParticles, 16); // ~60fps
      
      const timeout = setTimeout(() => {
        clearInterval(animationInterval);
        setParticles([]);
        setIsActive(false);
      }, duration);
      
      return () => {
        clearInterval(animationInterval);
        clearTimeout(timeout);
      };
    }
  }, [trigger, isActive, duration]);

  if (!isActive || particles.length === 0) return null;

  return (
    <Box sx={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
      zIndex: 1000
    }}>
      {particles.map(particle => {
        const opacity = particle.life / particle.maxLife;
        const scale = 0.5 + (particle.life / particle.maxLife) * 0.5;
        
        return (
          <Box
            key={particle.id}
            sx={{
              position: 'absolute',
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity: opacity,
              fontSize: `${particle.size}px`,
              color: particle.color,
              textShadow: '0 0 10px currentColor',
              transition: 'none',
              userSelect: 'none'
            }}
          >
            {particle.emoji}
          </Box>
        );
      })}
    </Box>
  );
}