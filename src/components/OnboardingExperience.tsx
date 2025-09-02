import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Fade,
  Slide,
  Chip,
  Grid,
  IconButton,
  LinearProgress
} from '@mui/material';
import {
  Target,
  Trophy,
  Zap,
  Clock,
  TrendingUp,
  Star,
  Gift,
  ArrowRight,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ParticleEffect } from './ParticleEffect';

interface OnboardingExperienceProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  benefits: string[];
  color: string;
  gradient: string;
}

const OnboardingExperience: React.FC<OnboardingExperienceProps> = ({ onComplete, onSkip }) => {
  const { isDarkMode, theme } = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    setShowContent(true);
  }, []);

  const steps: OnboardingStep[] = [
    {
      id: 'limits',
      title: 'Set Smart Limits',
      description: 'Define healthy boundaries for your digital habits',
      icon: <Target size={32} />,
      benefits: [
        'Reduce screen time naturally',
        'Build awareness of usage patterns',
        'Create sustainable habits'
      ],
      color: theme.palette.primary.main,
      gradient: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
    },
    {
      id: 'gamification',
      title: 'Earn Rewards',
      description: 'Level up and unlock achievements as you progress',
      icon: <Trophy size={32} />,
      benefits: [
        'Gain points for staying within limits',
        'Unlock special achievements',
        'Build streaks and momentum'
      ],
      color: theme.palette.warning.main,
      gradient: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`
    },
    {
      id: 'insights',
      title: 'Track Progress',
      description: 'Get insights and recommendations for better focus',
      icon: <TrendingUp size={32} />,
      benefits: [
        'Visual progress tracking',
        'Smart recommendations',
        'Detailed analytics'
      ],
      color: theme.palette.success.main,
      gradient: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`
    }
  ];

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, activeStep]));
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const currentStep = steps[activeStep];
  const progress = ((activeStep + 1) / steps.length) * 100;

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden' }}>
      {/* Particle Effects */}
      <ParticleEffect 
        type="celebration" 
        trigger={showContent} 
        colors={[currentStep.color, theme.palette.secondary.main]} 
        particleCount={30}
        duration={3000}
      />

      {/* Header */}
      <Fade in={showContent} timeout={800}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            mb: 2,
            p: 1,
            borderRadius: 3,
            background: `${currentStep.color}15`,
            border: `1px solid ${currentStep.color}30`
          }}>
            <Sparkles size={20} style={{ color: currentStep.color }} />
            <Typography variant="caption" sx={{ 
              color: currentStep.color,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: 1
            }}>
              Welcome to FocusForge
            </Typography>
          </Box>
          
          <Typography variant="h5" sx={{ 
            fontWeight: 'bold',
            mb: 1,
            background: currentStep.gradient,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Transform Your Digital Habits
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Let's set you up for success in just 3 simple steps
          </Typography>

          {/* Progress Bar */}
          <Box sx={{ mb: 3 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: `${currentStep.color}20`,
                '& .MuiLinearProgress-bar': {
                  background: currentStep.gradient,
                  borderRadius: 4
                }
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Step {activeStep + 1} of {steps.length}
            </Typography>
          </Box>
        </Box>
      </Fade>

      {/* Main Content */}
      <Slide direction="left" in={showContent} timeout={1000}>
        <Card sx={{
          background: currentStep.gradient,
          color: 'white',
          mb: 3,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.1)',
            zIndex: 1
          }
        }}>
          <CardContent sx={{ position: 'relative', zIndex: 2, p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{
                p: 1.5,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {currentStep.icon}
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {currentStep.title}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {currentStep.description}
                </Typography>
              </Box>
            </Box>

            {/* Benefits */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                What you'll get:
              </Typography>
              <Grid container spacing={1}>
                {currentStep.benefits.map((benefit, index) => (
                  <Grid item xs={12} key={index}>
                    <Fade in={showContent} timeout={1200 + index * 200}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle size={16} style={{ opacity: 0.8 }} />
                        <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                          {benefit}
                        </Typography>
                      </Box>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Decorative elements */}
            <Box sx={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              zIndex: 1
            }} />
          </CardContent>
        </Card>
      </Slide>

      {/* Navigation */}
      <Fade in={showContent} timeout={1400}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            onClick={onSkip}
            sx={{
              color: 'text.secondary',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'transparent',
                color: 'text.primary'
              }
            }}
          >
            Skip for now
          </Button>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {activeStep > 0 && (
              <Button
                variant="outlined"
                onClick={handleBack}
                sx={{
                  borderColor: currentStep.color,
                  color: currentStep.color,
                  '&:hover': {
                    borderColor: currentStep.color,
                    backgroundColor: `${currentStep.color}10`
                  }
                }}
              >
                Back
              </Button>
            )}
            
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={activeStep === steps.length - 1 ? <Star size={18} /> : <ArrowRight size={18} />}
              sx={{
                background: currentStep.gradient,
                color: 'white',
                px: 3,
                py: 1,
                borderRadius: 2,
                fontWeight: 'bold',
                textTransform: 'none',
                '&:hover': {
                  background: currentStep.gradient,
                  transform: 'translateY(-1px)',
                  boxShadow: `0 8px 32px ${currentStep.color}40`
                },
                transition: 'all 0.2s ease'
              }}
            >
              {activeStep === steps.length - 1 ? 'Get Started!' : 'Continue'}
            </Button>
          </Box>
        </Box>
      </Fade>

      {/* Step Indicators */}
      <Fade in={showContent} timeout={1600}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 1, 
          mt: 3,
          pt: 2,
          borderTop: `1px solid ${theme.palette.divider}`
        }}>
          {steps.map((step, index) => (
            <Box
              key={step.id}
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: index <= activeStep ? currentStep.gradient : theme.palette.action.disabled,
                transition: 'all 0.3s ease',
                transform: index === activeStep ? 'scale(1.2)' : 'scale(1)'
              }}
            />
          ))}
        </Box>
      </Fade>
    </Box>
  );
};

export default OnboardingExperience;