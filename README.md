# gdriveget — Google Drive Downloader

**gdriveget** is a sleek, modern, and high-performance web application designed to simplify the process of downloading files from Google Drive. It allows users to convert standard Google Drive share links into direct download links effortlessly.

## Key Features

| Feature | Description |
| :--- | :--- |
| **Direct Download** | Instantly generates direct download links from file IDs or share URLs. |
| **Bulk Processing** | Upload a `.txt` file containing multiple links to queue them all at once. |
| **Download Queue** | Manage multiple downloads with status indicators (Pending, Downloading, Done). |
| **Download History** | Keep track of your previous downloads with local storage persistence. |



## Project Structure

The project is organized for modularity and maintainability:

```text
gdriveget/
├── index.html          # Main entry point (HTML5 structure)
├── script/
│   └── script.js       # Core application logic and state management
├── style/
│   └── style.css       # Design system and UI styling
└── readme.md           # Project documentation
```

## Technology Stack

- **HTML5**: Semantic structure.
- **Vanilla CSS**: Custom design system with glassmorphism and premium dark mode.
- **Vanilla JavaScript**: Asynchronous queue management and DOM manipulation.
- **Google Fonts**: Utilizing 'DM Sans' and 'DM Mono' for a professional look.
- **Lucide Icons**: Crisp SVG iconography for enhanced visual clarity.

## How to Use

1. **Single Link**: Paste your Google Drive link into the input field and click **Add**.
2. **Bulk Upload**: Go to the **Upload .txt** tab, drag and drop your text file, and click **Add to Queue**.
3. **Management**: Monitor your files in the queue and click **Download All** to start the process.
4. **History**: Re-download or copy previous links from the **History** tab.

---
