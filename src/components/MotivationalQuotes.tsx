import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, IconButton, Fade } from '@mui/material';
import { RefreshCw, Quote } from 'lucide-react';

interface MotivationalQuote {
  text: string;
  author: string;
  category: 'focus' | 'productivity' | 'mindfulness' | 'balance' | 'growth';
}

interface MotivationalQuotesProps {
  category?: 'focus' | 'productivity' | 'mindfulness' | 'balance' | 'growth';
  autoRotate?: boolean;
  rotationInterval?: number; // in milliseconds
}

const MotivationalQuotes: React.FC<MotivationalQuotesProps> = ({ 
  category,
  autoRotate = false,
  rotationInterval = 10000
}) => {
  const [currentQuote, setCurrentQuote] = useState<MotivationalQuote | null>(null);
  const [fadeIn, setFadeIn] = useState(true);

  const quotes: MotivationalQuote[] = [
    // Focus quotes
    {
      text: "The successful warrior is the average person with laser-like focus.",
      author: "Bruce Lee",
      category: "focus"
    },
    {
      text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.",
      author: "Alexander Graham Bell",
      category: "focus"
    },
    {
      text: "Focus is a matter of deciding what things you're not going to do.",
      author: "John Carmack",
      category: "focus"
    },
    {
      text: "The art of being wise is knowing what to overlook.",
      author: "William James",
      category: "focus"
    },
    
    // Productivity quotes
    {
      text: "Productivity is never an accident. It is always the result of a commitment to excellence, intelligent planning, and focused effort.",
      author: "Paul J. Meyer",
      category: "productivity"
    },
    {
      text: "The way to get started is to quit talking and begin doing.",
      author: "Walt Disney",
      category: "productivity"
    },
    {
      text: "Don't confuse activity with productivity. Many people are simply busy being busy.",
      author: "Robin Sharma",
      category: "productivity"
    },
    {
      text: "Time is what we want most, but what we use worst.",
      author: "William Penn",
      category: "productivity"
    },
    
    // Mindfulness quotes
    {
      text: "The present moment is the only time over which we have dominion.",
      author: "Thích Nhất Hạnh",
      category: "mindfulness"
    },
    {
      text: "Mindfulness is about being fully awake in our lives. It is about perceiving the exquisite vividness of each moment.",
      author: "Jon Kabat-Zinn",
      category: "mindfulness"
    },
    {
      text: "The best way to take care of the future is to take care of the present moment.",
      author: "Thích Nhất Hạnh",
      category: "mindfulness"
    },
    {
      text: "Wherever you are, be there totally.",
      author: "Eckhart Tolle",
      category: "mindfulness"
    },
    
    // Balance quotes
    {
      text: "Technology is a useful servant but a dangerous master.",
      author: "Christian Lous Lange",
      category: "balance"
    },
    {
      text: "The real problem is not whether machines think but whether men do.",
      author: "B.F. Skinner",
      category: "balance"
    },
    {
      text: "We are not going to be able to operate our Spaceship Earth successfully nor for much longer unless we see it as a whole spaceship and our fate as common.",
      author: "Buckminster Fuller",
      category: "balance"
    },
    {
      text: "Balance is not something you find, it's something you create.",
      author: "Jana Kingsford",
      category: "balance"
    },
    
    // Growth quotes
    {
      text: "The only way to make sense out of change is to plunge into it, move with it, and join the dance.",
      author: "Alan Watts",
      category: "growth"
    },
    {
      text: "What we plant in the soil of contemplation, we shall reap in the harvest of action.",
      author: "Meister Eckhart",
      category: "growth"
    },
    {
      text: "Progress is impossible without change, and those who cannot change their minds cannot change anything.",
      author: "George Bernard Shaw",
      category: "growth"
    },
    {
      text: "The greatest revolution of our generation is the discovery that human beings, by changing the inner attitudes of their minds, can change the outer aspects of their lives.",
      author: "William James",
      category: "growth"
    }
  ];

  const getFilteredQuotes = () => {
    return category ? quotes.filter(q => q.category === category) : quotes;
  };

  const getRandomQuote = () => {
    const filteredQuotes = getFilteredQuotes();
    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    return filteredQuotes[randomIndex];
  };

  const changeQuote = () => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentQuote(getRandomQuote());
      setFadeIn(true);
    }, 300);
  };

  useEffect(() => {
    // Set initial quote
    setCurrentQuote(getRandomQuote());
  }, [category]);

  useEffect(() => {
    if (autoRotate && rotationInterval > 0) {
      const interval = setInterval(changeQuote, rotationInterval);
      return () => clearInterval(interval);
    }
  }, [autoRotate, rotationInterval]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'focus': return '#2196F3';
      case 'productivity': return '#4CAF50';
      case 'mindfulness': return '#9C27B0';
      case 'balance': return '#FF9800';
      case 'growth': return '#F44336';
      default: return '#757575';
    }
  };

  const getCategoryGradient = (cat: string) => {
    switch (cat) {
      case 'focus': return 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)';
      case 'productivity': return 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)';
      case 'mindfulness': return 'linear-gradient(135deg, #9C27B0 0%, #E91E63 100%)';
      case 'balance': return 'linear-gradient(135deg, #FF9800 0%, #FFC107 100%)';
      case 'growth': return 'linear-gradient(135deg, #F44336 0%, #FF5722 100%)';
      default: return 'linear-gradient(135deg, #757575 0%, #9E9E9E 100%)';
    }
  };

  if (!currentQuote) return null;

  return (
    <Card 
      sx={{ 
        background: getCategoryGradient(currentQuote.category),
        color: 'white',
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
      }}
    >
      <CardContent sx={{ position: 'relative', zIndex: 2, p: 3 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Quote size={24} style={{ opacity: 0.8 }} />
            <Typography 
              variant="caption" 
              sx={{ 
                textTransform: 'uppercase',
                fontWeight: 'bold',
                letterSpacing: 1,
                opacity: 0.9
              }}
            >
              {currentQuote.category}
            </Typography>
          </Box>
          <IconButton 
            onClick={changeQuote}
            sx={{ 
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                transform: 'rotate(180deg)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            <RefreshCw size={20} />
          </IconButton>
        </Box>

        <Fade in={fadeIn} timeout={500}>
          <Box>
            <Typography 
              variant="h6" 
              sx={{ 
                fontStyle: 'italic',
                lineHeight: 1.4,
                mb: 2,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' }
              }}
            >
              "{currentQuote.text}"
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                textAlign: 'right',
                fontWeight: 'bold',
                opacity: 0.9,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              — {currentQuote.author}
            </Typography>
          </Box>
        </Fade>

        {/* Decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            zIndex: 1
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            zIndex: 1
          }}
        />
      </CardContent>
    </Card>
  );
};

export default MotivationalQuotes;