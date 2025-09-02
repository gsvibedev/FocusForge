import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  LinearProgress, 
  Chip, 
  Button,
  IconButton,
  Collapse
} from '@mui/material';
import { 
  Target, 
  Clock, 
  Zap, 
  Trophy, 
  ChevronDown, 
  ChevronUp,
  CheckCircle,
  Circle
} from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'time_limit' | 'streak' | 'focus' | 'mindful';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  progress: number;
  maxProgress: number;
  completed: boolean;
  icon: React.ReactNode;
  tips: string[];
}

interface DailyChallengesProps {
  onChallengeComplete?: (challengeId: string, points: number) => void;
}

const DailyChallenges: React.FC<DailyChallengesProps> = ({ onChallengeComplete }) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);

  useEffect(() => {
    generateDailyChallenges();
  }, []);

  const generateDailyChallenges = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Generate challenges based on day of week for variety
    const challengePool = [
      {
        id: 'focus-session',
        title: 'Deep Focus Session',
        description: 'Complete a 25-minute focused work session without distractions',
        type: 'focus' as const,
        difficulty: 'medium' as const,
        points: 50,
        maxProgress: 25,
        icon: <Target size={20} />,
        tips: [
          'Turn off notifications during your focus session',
          'Use the Pomodoro technique: 25 minutes work, 5 minutes break',
          'Choose one specific task to focus on'
        ]
      },
      {
        id: 'time-awareness',
        title: 'Time Awareness Challenge',
        description: 'Check your screen time 3 times today and reflect on usage',
        type: 'mindful' as const,
        difficulty: 'easy' as const,
        points: 30,
        maxProgress: 3,
        icon: <Clock size={20} />,
        tips: [
          'Set reminders to check your usage',
          'Ask yourself: "Is this time well spent?"',
          'Notice patterns in your digital habits'
        ]
      },
      {
        id: 'limit-respect',
        title: 'Limit Respect Streak',
        description: 'Stay within all your daily limits',
        type: 'time_limit' as const,
        difficulty: 'hard' as const,
        points: 75,
        maxProgress: 1,
        icon: <Zap size={20} />,
        tips: [
          'Set realistic limits that you can actually follow',
          'Use app blockers when approaching limits',
          'Plan alternative activities when limits are reached'
        ]
      },
      {
        id: 'mindful-break',
        title: 'Mindful Digital Break',
        description: 'Take a 10-minute break from all screens',
        type: 'mindful' as const,
        difficulty: 'easy' as const,
        points: 25,
        maxProgress: 10,
        icon: <Circle size={20} />,
        tips: [
          'Step outside or look out a window',
          'Practice deep breathing or meditation',
          'Stretch or do light physical activity'
        ]
      },
      {
        id: 'productivity-boost',
        title: 'Productivity Power Hour',
        description: 'Complete important tasks for 1 hour without checking social media',
        type: 'focus' as const,
        difficulty: 'hard' as const,
        points: 100,
        maxProgress: 60,
        icon: <Trophy size={20} />,
        tips: [
          'Make a list of important tasks beforehand',
          'Put your phone in another room',
          'Use website blockers for social media'
        ]
      }
    ];

    // Select 3 challenges based on day of week for variety
    const selectedChallenges = [
      challengePool[dayOfWeek % challengePool.length],
      challengePool[(dayOfWeek + 1) % challengePool.length],
      challengePool[(dayOfWeek + 2) % challengePool.length]
    ].map(challenge => ({
      ...challenge,
      progress: Math.floor(Math.random() * challenge.maxProgress * 0.3), // Some random progress
      completed: false
    }));

    setChallenges(selectedChallenges);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#F44336';
      default: return '#757575';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'time_limit': return '#2196F3';
      case 'streak': return '#FF5722';
      case 'focus': return '#9C27B0';
      case 'mindful': return '#009688';
      default: return '#757575';
    }
  };

  const handleChallengeClick = (challengeId: string) => {
    setExpandedChallenge(expandedChallenge === challengeId ? null : challengeId);
  };

  const markChallengeComplete = (challengeId: string) => {
    setChallenges(prev => prev.map(challenge => {
      if (challenge.id === challengeId && !challenge.completed) {
        onChallengeComplete?.(challengeId, challenge.points);
        return { ...challenge, completed: true, progress: challenge.maxProgress };
      }
      return challenge;
    }));
  };

  const completedCount = challenges.filter(c => c.completed).length;
  const totalPoints = challenges.reduce((sum, c) => sum + (c.completed ? c.points : 0), 0);

  return (
    <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Trophy size={24} />
            Daily Challenges
          </Typography>
          <Chip
            label={`${completedCount}/${challenges.length} Complete`}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontWeight: 'bold'
            }}
          />
        </Box>

        {totalPoints > 0 && (
          <Box mb={2}>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Points earned today: <strong>+{totalPoints}</strong>
            </Typography>
          </Box>
        )}

        <Box display="flex" flexDirection="column" gap={2}>
          {challenges.map((challenge) => (
            <Card 
              key={challenge.id} 
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                border: challenge.completed ? '2px solid #4CAF50' : '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  transform: 'translateY(-2px)'
                }
              }}
              onClick={() => handleChallengeClick(challenge.id)}
            >
              <CardContent sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box sx={{ color: getTypeColor(challenge.type) }}>
                      {challenge.icon}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'white' }}>
                        {challenge.title}
                      </Typography>
                      <Box display="flex" gap={1} mt={0.5}>
                        <Chip
                          label={challenge.difficulty.toUpperCase()}
                          size="small"
                          sx={{
                            backgroundColor: getDifficultyColor(challenge.difficulty),
                            color: 'white',
                            fontSize: '0.7rem',
                            height: '20px'
                          }}
                        />
                        <Chip
                          label={`+${challenge.points} pts`}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            fontSize: '0.7rem',
                            height: '20px'
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    {challenge.completed ? (
                      <CheckCircle size={24} color="#4CAF50" />
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={(e) => {
                          e.stopPropagation();
                          markChallengeComplete(challenge.id);
                        }}
                        sx={{
                          backgroundColor: '#4CAF50',
                          '&:hover': { backgroundColor: '#45a049' }
                        }}
                      >
                        Complete
                      </Button>
                    )}
                    <IconButton size="small" sx={{ color: 'white' }}>
                      {expandedChallenge === challenge.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </IconButton>
                  </Box>
                </Box>

                {!challenge.completed && (
                  <Box mt={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                        Progress
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                        {challenge.progress}/{challenge.maxProgress}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(challenge.progress / challenge.maxProgress) * 100}
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getTypeColor(challenge.type)
                        }
                      }}
                    />
                  </Box>
                )}

                <Collapse in={expandedChallenge === challenge.id}>
                  <Box mt={2}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
                      {challenge.description}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'white' }}>
                      Tips for Success:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                      {challenge.tips.map((tip, index) => (
                        <Typography 
                          key={index} 
                          component="li" 
                          variant="body2" 
                          sx={{ color: 'rgba(255,255,255,0.8)', mb: 0.5 }}
                        >
                          {tip}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default DailyChallenges;