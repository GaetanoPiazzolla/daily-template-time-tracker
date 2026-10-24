# Daily Template Time Tracker

A custom Obsidian plugin to seamlessly track time spent on daily habits directly from your daily notes.

## Features

- **Inline Timers**: Adds a play/stop button right next to your tasks tagged with `#timed`.
- **Target Countdowns & Auto-Check**: Use `#timed-20` to set a 20-minute goal. The timer shows a countdown and checks the box (`- [x]`) when the goal is reached. The target is a goal, not a limit: the timer keeps running and the display rolls over to `+MM:SS`, so overtime is tracked too.
- **Sidebar Panel**: Follow the active timer on a large countdown — and when nothing is running, the panel lists today's `#timed` tasks with their logged time, so you can start one straight from there.
- **No Note Required**: Stop a timer from the panel even if the daily note is closed; the time is written directly to the file.
- **Credit on Check**: Ticking a `#timed-N` task by hand fills its time field up to the target, so a habit you completed away from the keyboard still counts. An already longer time is never lowered.
- **Audio Feedback**: Distinct cues for start, stop and goal reached, synthesized with the Web Audio API (no sound files to ship).
- **Dataview Integration**: Automatically writes the elapsed time (e.g., `[reading-time:: 30m 20s]`) for easy dashboard aggregation, streaks, and check counts.

## Prerequisites

While this plugin works standalone for tracking time, to fully utilize the data and build robust dashboards, you should set up the following:
- **Daily Notes & Templates** (Obsidian Core Plugins): Ensure these are enabled in your core settings. Configure the Daily Notes plugin to use your template file so new daily notes are automatically generated with your habits checklist.
- **[Dataview](https://github.com/blacksmithgu/obsidian-dataview)** (Community Plugin): Required to parse the inline time fields and build the habits dashboard. Make sure to enable JavaScript queries in Dataview settings if you plan to use DataviewJS.
- **[Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks)** (Community Plugin): Highly recommended for querying and organizing your TODOs across different daily notes and projects.

## Installation

Since this plugin is not yet available in the official Obsidian Community Plugins directory, you can install it manually or via BRAT.

### Option 1: Using BRAT (Recommended)
1. Install the **[BRAT](https://github.com/TfTHacker/obsidian42-brat)** plugin from the Obsidian Community Plugins.
2. Enable BRAT in your settings.
3. Open the command palette (`Ctrl/Cmd + P`) and run **BRAT: Add a beta plugin for testing**.
4. Paste the URL of this repository: `https://github.com/GaetanoPiazzolla/daily-template-time-tracker`
5. Enable the plugin in your Community Plugins settings.

### Option 2: Manual Installation
1. Go to the [Releases](https://github.com/GaetanoPiazzolla/daily-template-time-tracker/releases) page of this repository.
2. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
3. In your Obsidian vault, navigate to the `.obsidian/plugins/` folder and create a new folder named `daily-template-time-tracker`.
4. Move the three downloaded files into that folder.
5. Reload Obsidian (or click the reload button in the Community Plugins tab) and enable **Daily Template Time Tracker**.

## How to Use

### 1. Set up your Daily Template
Create a checklist for your habits in your daily template file. Add the tag `#timed` to any habit you want to track time for. If you have a specific time goal (e.g., 30 minutes), use `#timed-30`. For habits that don't need time tracking, just use a standard tag like `#daily`.

```markdown
- [ ] 📖 **Reading** #timed-20
- [ ] 🏋️ **Exercise** #timed-30
- [ ] 💻 **Deep Work** #timed-60
- [ ] 🎸 **Practice Instrument** #timed-30
- [ ] 💧 **Drink Water** #daily
```

*Every time you create a new daily note using this template, your fresh habits list will be ready to go.*

### 2. Track your Time
When you open a note with these tasks in **Live Preview**, a ▶️ button will appear next to the `#timed` tags. 
- Click ▶️ to start tracking — from the note, or from the list in the sidebar panel.
- The sidebar panel will automatically update to show your active session.
- When a `#timed-N` goal is reached the box gets checked and you hear the completion cue; the timer carries on until you stop it.
- Click ⏹️ to stop, in the note or in the panel. The plugin writes a Dataview inline field (like `[deep-work-time:: 30m 22s]`) right after the tag, so trailing markers such as the Tasks plugin's `✅ 2026-01-01` stay at the end of the line.

![Main View](assets/main_view.png)

### 3. Build your Dashboard
The true power of this format is querying it with Dataview. You can build a dashboard that calculates your total time spent, completion counts, and streaks (current and max) for *all* habits.

![Habits Dashboard](assets/dataview_dashboard.png)


### 4. Advanced TODO Queries
By leveraging the **Tasks** plugin, you can easily pull active TODOs from your daily notes and organize them dynamically by category (e.g., `#home`, `#work`) into a master dashboard.
