# Nextract Usage Guide

Welcome to Nextract! This guide will help you understand how to use the application to extract and organize media to your local device.

## The Interface

The application interface is divided into three main sections:
1. **Queue/Home**: Where you paste URLs, analyze media, and manage active downloads.
2. **History**: A record of all previously downloaded files.
3. **Settings**: Configuration options for download paths and application behavior.

## How to Download Media

### 1. Paste a Link
Copy a media URL (currently supporting YouTube videos and playlists). In the **Home** tab, paste the link into the main input field.

### 2. Analyze
Nextract will automatically begin analyzing the link using our integrated processing engine. This step fetches available video qualities, audio streams, thumbnails, and metadata.

### 3. Choose Format & Quality
Once analyzed, a media preview card will appear.
- **For Video**: Select your preferred resolution (e.g., 1080p, 720p). The application will automatically download the highest quality audio stream and merge them locally.
- **For Audio**: Select the "Audio Only" option to extract an MP3 or high-quality audio file.
- **For Playlists**: You will see a list of videos contained in the playlist. You can choose to download the entire playlist or select individual videos.

### 4. Download
Click **Download**. The item will move to your **Download Queue**.
- You can monitor progress, speed, and ETA in real-time.
- Nextract utilizes advanced merging techniques under the hood, so expect a brief processing phase after the download completes.

### 5. Locate Your Files
By default, all media is saved to a `Nextract` folder inside your system's `Downloads` directory (e.g., `~/Downloads/Nextract`). You can change this location in the **Settings** tab.

## Resuming Interrupted Downloads

If you accidentally close the Nextract application while a download is active, don't worry. Nextract gracefully intercepts the shutdown and marks the download as interrupted.
When you restart the app, simply navigate to your queue and click "Resume" to continue downloading from where you left off.

## Settings & Customization

Navigate to the **Settings** tab to configure:
- **Download Directory**: Change where Nextract saves your media.
- **Theme**: Toggle between Light, Dark, or System themes.
- **Concurrency**: Adjust how many active downloads can run simultaneously.

## Ethical Guidelines

Please remember that Nextract is a tool meant for personal archiving. It is your responsibility to ensure you have the legal right to download and save the media you process through this application.