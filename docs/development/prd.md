Here's a detailed **Product Requirements Document (PRD)** for your AI-powered web application tailored to media buyers creating ad creatives:

---

# **Product Requirements Document (PRD)**

**Project Title**: AI Creative Builder for Media Buyers
**Owner**: \[Your Name / Company]
**Date**: June 23, 2025
**Version**: 1.0

---

## **1. Purpose**

The purpose of this product is to provide media buyers with a web-based AI application to automate and streamline the creation of engaging video ad creatives. By integrating video processing, script generation, and voiceover capabilities, the tool enables users to quickly iterate and produce high-converting video content.

---

## **2. Goals and Objectives**

* Enable users to manage ad creatives via product-specific workspaces.
* Automatically analyze and split uploaded raw videos into named, categorized clips using AI.
* Support multi-script generation per product.
* Generate realistic voiceovers for each script using AI voices.
* Allow users to combine clips and voiceovers into final ad videos, in bulk.

---

## **3. Key Features**

### **3.1. Product Workspace Management**

* Users can create, view, rename, and delete product-specific workspaces.
* Each workspace contains:

  * Raw videos
  * Generated clips (categorized and named)
  * Scripts
  * Voiceovers
  * Final generated videos

### **3.2. Raw Video Upload**

* Support for common video formats (MP4, MOV, WebM).
* Upload via drag-and-drop or file picker.
* Upload progress and success/error feedback.

### **3.3. Video Analysis & Clip Splitting**

* Integration with **Gemini API** to:

  * Analyze uploaded video.
  * Suggest meaningful timestamps to cut (based on scenes, objects, or voice).
  * Assign a **name** to each clip (e.g., "Intro: Product Unboxing").
  * Classify each clip into one of:

    * **Hook**
    * **Body**
    * **CAT** (Call to Action)

* Use **FFmpeg** on the backend to:

  * Automatically cut the raw video into clips based on Gemini's output.
  * Store and display the clip previews.

### **3.4. Script Generation**

* Users can generate multiple scripts for each workspace.
* Each script is created using **Gemini API** based on:

  * Workspace information (product, category, market).
  * Optional user prompt (style, tone, target audience).
* Scripts are saved and editable within the workspace.

### **3.5. Voiceover Generation**

* For each script, the user can generate multiple voiceovers using **ElevenLabs API**.
* Voiceover options:

  * Choose from predefined voices (e.g., male, female, casual, professional).
  * Support for up to 5 versions per script.
* Playback, download, and delete voiceovers.

### **3.6. Video Composer**

* UI to select:

  * Clips (drag/drop from categorized list: Hook, Body, CAT).
  * One voiceover.
* Auto-sync voiceover timing with clips.
* Support generating **N combinations** (shuffle clips, vary order or voiceovers).
* Render videos using FFmpeg.
* Export final videos (MP4, 1080p).

---

## **4. User Roles**

### **4.1. Media Buyer (Primary User)**

* Can create/edit/delete workspaces
* Upload raw video
* Generate scripts/voiceovers
* Compose and export videos

### **4.2. Admin (Optional Future Scope)**

* Monitor API usage
* View user activity logs
* Manage API credentials and quotas

---

## **5. APIs and Technologies**

| Feature                   | Tech / API                       |
| ------------------------- | -------------------------------- |
| Frontend UI               | React, Tailwind CSS              |
| Video Upload / Management | AWS S3 or Firebase               |
| Video Analysis & Naming   | Gemini API                       |
| Clip Cutting              | FFmpeg                           |
| Script Generation         | Gemini API                       |
| Voice Generation          | ElevenLabs API                   |
| Backend / API Integration | Node.js / Python (FastAPI)       |
| Database                  | PostgreSQL or Firebase Firestore |

---

## **6. UX Flow (High-level)**

1. **User logs in**
2. **Creates a new product workspace**
3. **Uploads a raw video**
4. **System processes the video**

   * Gemini analyzes and suggests splits
   * Clips are cut and categorized
5. **User generates multiple scripts**
6. **User creates multiple voiceovers per script**
7. **User selects clips + voiceover to compose a final video**
8. **System renders and stores the final creatives**

---

## **7. Metrics for Success**

* Time to first generated video (TTFGV)
* % of users returning to create new creatives
* Number of video exports per product
* API usage per workspace (Gemini / ElevenLabs)
* User feedback scores on generated content quality

---

## **8. Constraints and Assumptions**

* Gemini API has reliable video comprehension and timestamp suggestion capabilities.
* ElevenLabs API supports multiple languages and high-quality voices.
* FFmpeg operations are performed server-side with acceptable latency (\~10–30 seconds per render).
* Users have a basic understanding of video marketing formats (Hook/Body/CAT structure).

---

## **9. Future Enhancements**

* Multi-language script and voiceover support
* AI-based thumbnail generation
* A/B testing optimizer for creatives
* Integration with ad platforms (Meta, TikTok) for direct publishing
* Team collaboration features

---

