import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { Trophy, Star, Zap, Target, Award } from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'streak' | 'usage' | 'goal' | 'milestone' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  icon?: string;
  unlockedAt?: Date;
}

interface AchievementCardProps {
  achievement: Achievement;
  isNew?: boolean;
  showAnimation?: boolean;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ 
  achievement, 
  isNew = false, 
  showAnimation = false 
}) => {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#4CAF50';
      case 'rare': return '#2196F3';
      case 'epic': return '#9C27B0';
      case 'legendary': return '#FF9800';
      default: return '#757575';
    }
  };

  const getRarityGradient = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)';
      case 'rare': return 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)';
      case 'epic': return 'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)';
      case 'legendary': return 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)';
      default: return 'linear-gradient(135deg, #757575 0%, #BDBDBD 100%)';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'streak': return <Zap size={20} />;
      case 'usage': return <Target size={20} />;
      case 'goal': return <Trophy size={20} />;
      case 'milestone': return <Star size={20} />;
      case 'special': return <Award size={20} />;
      default: return <Trophy size={20} />;
    }
  };

  const cardStyle = {
    background: getRarityGradient(achievement.rarity),
    borderRadius: '16px',
    border: `2px solid ${getRarityColor(achievement.rarity)}`,
    boxShadow: `0 8px 32px ${getRarityColor(achievement.rarity)}40`,
    transform: showAnimation ? 'scale(1.05)' : 'scale(1)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    overflow: 'hidden',
    '&:hover': {
      transform: 'scale(1.02)',
      boxShadow: `0 12px 40px ${getRarityColor(achievement.rarity)}60`,
    },
    '&::before': isNew ? {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
      animation: 'shimmer 2s infinite',
    } : {},
  };

  return (
    <>
      <style>
        {`
          @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
          }
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px ${getRarityColor(achievement.rarity)}40; }
            50% { box-shadow: 0 0 30px ${getRarityColor(achievement.rarity)}80; }
          }
        `}
      </style>
      <Card 
        sx={{
          ...cardStyle,
          animation: isNew ? 'bounce 1s ease-in-out, glow 2s ease-in-out infinite' : 'none',
        }}
      >
        <CardContent sx={{ p: 3, color: 'white', position: 'relative', zIndex: 1 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box 
                sx={{ 
                  color: 'white',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  animation: isNew ? 'bounce 1s ease-in-out' : 'none'
                }}
              >
                {getCategoryIcon(achievement.category)}
              </Box>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 'bold',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  fontSize: '1.1rem'
                }}
              >
                {achievement.title}
              </Typography>
            </Box>
            <Chip
              label={achievement.rarity.toUpperCase()}
              size="small"
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.7rem',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)'
              }}
            />
          </Box>
          
          <Typography 
            variant="body2" 
            sx={{ 
              mb: 2,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              lineHeight: 1.4
            }}
          >
            {achievement.description}
          </Typography>
          
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <Star size={16} fill="currentColor" />
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 'bold',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}
              >
                +{achievement.points} points
              </Typography>
            </Box>
            
            {isNew && (
              <Chip
                label="NEW!"
                size="small"
                sx={{
                  backgroundColor: '#FFD700',
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                  animation: 'bounce 1s ease-in-out infinite'
                }}
              />
            )}
          </Box>
          
          {achievement.unlockedAt && (
            <Typography 
              variant="caption" 
              sx={{ 
                mt: 1,
                opacity: 0.8,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                display: 'block'
              }}
            >
              Unlocked: {achievement.unlockedAt.toLocaleDateString()}
            </Typography>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default AchievementCard;