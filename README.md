# PMI UAE Webinar Tracking System

Auto-syncing webinar link manager and tracker with Google Sheets integration. Generate trackable links for your webinars across multiple platforms (Email, LinkedIn, Facebook, Instagram, Twitter) and monitor performance in real-time.

## ✨ Features

- 🎯 **Auto-Sync:** Add webinars once, available everywhere automatically
- 📊 **Multi-Platform Tracking:** Email, LinkedIn, Facebook, Instagram, Twitter
- 🎨 **PMI UAE Branded:** Official colors, logo, and design
- 📈 **Real-Time Analytics:** Track clicks by webinar and platform
- 💾 **Google Sheets Database:** Free, reliable storage
- 🚀 **Zero Manual Work:** No file editing needed

## 🏗️ System Architecture

```
Webinar Manager → Google Sheets (Database) → Webinar Tracker
     ↓                    ↓                         ↓
   Add/Delete         Store Data              Auto-Load & Track
```

## 🚀 Quick Start

### Prerequisites
- Google Account (for Google Sheets & Apps Script)
- Web hosting (GitHub Pages, pmiuae.org, etc.)

### Setup (25 minutes)

1. **Create Google Sheet**
   - Create a new Google Sheet
   - Go to Extensions → Apps Script
   - Paste code from `google-apps-script-autosync.js`
   - Deploy as Web App (Execute as: Me, Access: Anyone)
   - Copy the Web App URL

2. **Configure HTML Files**
   - Update `GOOGLE_SCRIPT_URL` in both HTML files
   - Update `BASE_URL` in manager file

3. **Deploy**
   - Upload to your web host
   - Test the manager URL
   - Add a webinar
   - Test tracking links

## 📁 Project Structure

```
├── webinar-manager-autosync.html      # Manager UI
├── webinar-tracker-autosync.html      # Redirect/tracking page
├── google-apps-script-autosync.js     # Backend logic
├── AUTOSYNC_SETUP_GUIDE.md            # Detailed setup
├── PROJECT_CONTEXT.md                 # Full project context
└── README.md                           # This file
```

## 📊 Google Sheets Structure

### Sheet 1: "Webinars"
Stores webinar data

### Sheet 2: "Tracking Data"
Logs all clicks with timestamps, sources, and device info

## 🧪 Testing

Test Apps Script endpoint:
```bash
curl "YOUR_SCRIPT_URL?action=get_webinars"
```

Should return: `{"status":"success","webinars":[]}`

## 📝 Usage

1. Open webinar manager
2. Add webinar details
3. Generate tracking links
4. Share on social platforms
5. Monitor clicks in Google Sheet

## 🆘 Troubleshooting

See `AUTOSYNC_SETUP_GUIDE.md` for detailed troubleshooting steps.

## 📚 Documentation

- `AUTOSYNC_SETUP_GUIDE.md` - Complete setup instructions
- `PROJECT_CONTEXT.md` - Full technical context

---

**Built for PMI UAE Chapter**
