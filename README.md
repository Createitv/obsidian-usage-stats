# Obtime - Obsidian Usage Statistics

[English](README.md) | [中文](README_CN.md)

A powerful time tracking plugin for Obsidian that helps you monitor and analyze your note-taking habits with detailed statistics and beautiful charts.

## ✨ Features

### 📊 Time Tracking
- **Automatic tracking**: Seamlessly tracks time spent in Obsidian without manual intervention
- **Session management**: Records individual study/work sessions with start and end times
- **File-level tracking**: Monitor time spent on specific notes and files
- **Real-time updates**: See your current session progress in the status bar

### 📈 Analytics & Visualization
- **Beautiful charts**: Interactive charts showing daily, weekly, and monthly usage patterns
- **Detailed statistics**: Comprehensive analytics including total time, average session length, and productivity trends
- **Custom date ranges**: Filter and analyze data for any time period
- **Export capabilities**: Export your usage data for further analysis

### 🔄 Data Synchronization
- **Cloud sync**: Sync your usage data across multiple devices via SaaS backend
- **Local storage**: All data is stored locally first, ensuring privacy and offline access
- **Automatic backup**: Regular data synchronization to prevent data loss
- **Cross-platform**: Works seamlessly across Windows, macOS, and Linux

## 🚀 Installation

### From Obsidian Community Plugins
1. Open Obsidian Settings
2. Go to Community Plugins
3. Turn off Safe mode
4. Click Browse and search for "Obtime"
5. Click Install, then Enable

### Manual Installation
1. Download the latest release from [GitHub Releases](https://github.com/createitv/obsidian-usage-stats/releases)
2. Extract the plugin folder to your Obsidian vault's plugins folder
3. Enable the plugin in Obsidian Settings > Community Plugins

## 📖 Usage

### Getting Started
1. **Enable tracking**: The plugin starts tracking automatically when enabled
2. **View status**: Check the status bar for current session information
3. **Open dashboard**: Use the command palette or click the plugin icon to open the main view

### Main Features

#### Time Tracking Dashboard
- View your daily, weekly, and monthly usage statistics
- See current session progress and total time today
- Access detailed charts and analytics

#### Session Management
- Start/stop tracking manually if needed
- View active session information
- Review historical session data

#### Data Export
- Export usage data in various formats
- Share statistics with productivity tools
- Backup your tracking history

### Commands
- `Obtime: Open Dashboard` - Open the main statistics view
- `Obtime: Start Tracking` - Manually start a new session
- `Obtime: Stop Tracking` - End the current session
- `Obtime: Export Data` - Export your usage statistics

## 🛠️ Configuration

### General Settings
- **Auto-start tracking**: Automatically begin tracking when Obsidian opens
- **Session timeout**: Set how long to wait before considering a session inactive
- **Data retention**: Configure how long to keep historical data

### Privacy Settings
- **Sync preferences**: Choose what data to sync with the cloud
- **Local storage only**: Keep all data local if preferred
- **Data sharing**: Control what analytics are shared

### Display Settings
- **Status bar format**: Customize what appears in the status bar
- **Chart themes**: Choose chart colors and styles
- **Notification preferences**: Set up alerts and reminders

## 🔧 Development

### Prerequisites
- Node.js 18.x or higher
- TypeScript knowledge
- Obsidian plugin development experience

### Setup
```bash
# Clone the repository
git clone https://github.com/createitv/obsidian-usage-stats.git
cd obsidian-usage-stats

# Install dependencies
pnpm install

# Start development
pnpm dev
```

### Building
```bash
# Build for production
pnpm build

# Create plugin package
pnpm package
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- Charts powered by modern web technologies
- Icons from [Lucide React](https://lucide.dev/)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/createitv/obsidian-usage-stats/issues)
- **Discussions**: [GitHub Discussions](https://github.com/createitv/obsidian-usage-stats/discussions)
- **Email**: [Contact via GitHub](https://github.com/createitv)

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a complete list of changes and updates.

---

**Made with ❤️ for the Obsidian community**
