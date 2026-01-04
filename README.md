# Artificial Eye for Visually Impaired People



An **Edge AI–based assistive vision system** designed to help visually impaired users perceive their surroundings in real time. The system performs **on-device object detection, classification, and distance estimation** using a **Nicla Vision** board and an **Edge Impulse** model, and converts visual information into **spatial audio and text-to-speech (TTS)** feedback via a **Next.js web application**.

> ⚠️ **No Raspberry Pi is used** — all vision inference runs directly on a microcontroller.

---
DATASET: https://drive.google.com/drive/folders/1MmSBoZGRFOV0r8Ip49wJ2W8kl1uHytrL?usp=sharing
---

##  Key Highlights

- Pure **microcontroller-based Edge AI** (Nicla Vision)
- Real-time object detection, classification & distance estimation
- Edge Impulse–trained ML model
- Spatial audio with left / center / right panning
- Privacy-first architecture (no raw images transmitted)
- Low-latency, offline-capable inference

---

## System Architecture

### Hardware
- Arduino **Nicla Vision** (camera + MCU)
- Headphones / earphones for audio feedback

### Software & Tools
- **OpenMV** – camera control & preprocessing
- **Edge Impulse** – model training & deployment
- **Next.js** – web application
- **WebSocket / HTTP** – data communication
- **Web Audio API** – spatial audio generation
- **TTS Engine** – speech feedback

---

## Data Flow Pipeline

1. Nicla Vision captures real-time camera frames  
2. Edge Impulse model runs **on-device** to:
   - Detect objects  
   - Classify object types  
   - Estimate distance  
3. Only metadata (object label, distance, position) is transmitted  
4. Next.js web app:
   - Renders detected objects
   - Generates spatial audio cues
   - Produces text-to-speech feedback

---

## Audio Feedback Logic

- **Directional Audio (Panning):**
  - Left → object detected on left
  - Center → object directly ahead
  - Right → object detected on right

- **Text-to-Speech (TTS):**
  - Example: *"Person ahead, two meters away"*

- **Proximity Awareness:**
  - Closer objects trigger higher-priority alerts

---

## Why No Raspberry Pi?

- No bulky hardware
- Lower power consumption
- Faster boot and response times
- Reduced system complexity



