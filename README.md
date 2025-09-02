# 🎯 FocusForge

**Boost your productivity with smart website blocking, time limits, and gamified tracking!**

FocusForge is a powerful Chrome extension that helps you stay focused and productive by intelligently managing your time online. With AI-powered insights, customizable blocking rules, and gamification elements, it transforms productivity management into an engaging experience.

## ✨ Features

### 🚫 Smart Website Blocking
- **AI-Powered Detection**: Automatically identifies and blocks distracting websites
- **Custom URL Patterns**: Create flexible blocking rules with wildcards and regex
- **Scheduled Blocking**: Set up time-based rules for different periods
- **Category-Based Blocking**: Block entire categories of websites

### ⏱️ Time Management
- **Usage Tracking**: Monitor time spent on different websites
- **Daily Limits**: Set maximum time limits for specific sites
- **Real-time Alerts**: Get notified when approaching time limits
- **Detailed Analytics**: View comprehensive usage reports with charts

### 🎮 Gamification
- **Achievement System**: Unlock badges and rewards for productivity milestones
- **Daily Challenges**: Complete tasks to earn points and maintain streaks
- **Progress Tracking**: Visual progress bars and statistics
- **Motivational Quotes**: Get inspired with context-aware motivational messages

### 📊 Advanced Analytics
- **Interactive Charts**: Beautiful visualizations of your browsing habits
- **Export Reports**: Generate and export detailed productivity reports
- **Data Insights**: AI-powered recommendations for better focus
- **Historical Data**: Track your productivity trends over time

### 🎨 Modern UI/UX
- **Dark Mode**: Easy on the eyes with full dark mode support
- **Responsive Design**: Works seamlessly across different screen sizes
- **Smooth Animations**: Engaging particle effects and transitions
- **Keyboard Shortcuts**: Quick access to common actions

## 🚀 Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) (coming soon)
2. Search for "FocusForge"
3. Click "Add to Chrome"
4. Confirm installation

### Manual Installation (Development)
1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/focusforge.git
   cd focusforge
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

## 🛠️ Usage

### Getting Started
1. **Click the extension icon** in your Chrome toolbar
2. **Complete the onboarding** process to set up your preferences
3. **Start blocking distracting sites** and track your productivity

### Key Features Setup

#### Adding Blocking Rules
1. Open the extension popup or options page
2. Navigate to "URL Patterns" tab
3. Click "Add Pattern"
4. Enter the website URL pattern (e.g., `*.facebook.com`, `youtube.com/watch*`)
5. Set blocking schedule and time limits

#### Setting Time Limits
1. Go to "Limits" in the options page
2. Select a website or category
3. Set daily/weekly time limits
4. Choose notification preferences

#### Viewing Analytics
1. Click "Stats" in the popup or options page
2. View detailed charts and reports
3. Export data for further analysis

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Framework**: Material-UI (MUI)
- **Charts**: Chart.js with React-Chartjs-2
- **Animations**: Framer Motion
- **Database**: Dexie (IndexedDB wrapper)
- **Backend**: Supabase (optional cloud sync)
- **Testing**: Vitest + Testing Library
- **Linting**: ESLint + Prettier

## 📁 Project Structure

```
src/
├── ai/                    # AI-powered suggestions and classification
├── background/           # Service worker and background scripts
│   └── modules/         # Background functionality modules
├── components/          # Reusable React components
├── contexts/           # React contexts for state management
├── hooks/              # Custom React hooks
├── options/            # Extension options page
├── popup/              # Extension popup interface
├── storage/            # Data storage and state management
├── utils/              # Utility functions and helpers
└── manifest.ts         # Chrome extension manifest
```

## 🔧 Development

### Prerequisites
- Node.js 16+
- npm or yarn
- Chrome browser

### Available Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
npm run test     # Run tests
```

### Development Setup
1. Install dependencies: `npm install`
2. Start development: `npm run dev`
3. Load the `dist` folder as unpacked extension in Chrome
4. The extension will reload automatically on code changes

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Guidelines
- Follow TypeScript best practices
- Use functional components with hooks
- Maintain consistent code style with Prettier
- Write tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Icons provided by [Lucide React](https://lucide.dev/)
- UI components powered by [Material-UI](https://mui.com/)
- Charts rendered with [Chart.js](https://www.chartjs.org/)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/focusforge/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/focusforge/discussions)
- **Email**: support@focusforge.com (coming soon)

---

**Made with ❤️ for productive minds everywhere**

*Transform distractions into determination. Master your focus with FocusForge.*
