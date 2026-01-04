# Artificial Eye for Visually Impaired People



An Edge AI–based assistive vision system designed to help visually impaired users perceive their surroundings in real time. The system performs on-device object detection, classification, and distance estimation using a Nicla Vision board and an Edge Impulse model, and converts visual information into spatial audio and text-to-speech (TTS) feedback via a Next.js web application.

⚠️ No Raspberry Pi is used — all vision inference runs directly on a microcontroller.

Key Highlights

✅ Pure microcontroller-based Edge AI (Nicla Vision)

✅ Real-time object detection & distance estimation

✅ Edge Impulse–trained ML model

✅ Spatial audio with left/center/right panning

✅ Privacy-first (no raw images transmitted)

✅ Low-latency, offline-capable inference

System Architecture

Hardware

Nicla Vision (camera + MCU)

Audio output device (headphones / earphones)

Software & Tools

OpenMV (camera control & preprocessing)

Edge Impulse (model training & deployment)

Next.js (web application)

WebSocket / HTTP (data transfer)

Web Audio API (spatial audio)

TTS engine (browser-based or API)

Data Flow

Nicla Vision captures live camera frames

Edge Impulse model runs on-device to:

Detect objects

Classify object types

Estimate distance

Only metadata (object label, distance, position) is sent to the web app

Next.js web app:

Renders detected objects

Generates spatial audio cues

Provides TTS feedback to the user

Audio Feedback Logic

Directional Panning:

Left → object detected on left

Center → object straight ahead

Right → object detected on right

TTS Output:

Example: “Person ahead, two meters away”

Proximity Awareness:

Closer objects can trigger higher priority or louder alerts

Why No Raspberry Pi?

❌ Reduced power consumption

❌ No bulky hardware

❌ Faster startup time

❌ Lower system complexity

This makes the solution wearable-friendly, scalable, and energy efficient.

Use Cases

Navigation assistance for visually impaired users

Indoor and outdoor obstacle awareness

Wearable assistive devices (smart glasses, chest-mounted cameras)

Research in Edge AI and assistive technologies

Future Improvements

Dynamic obstacle prioritization

Haptic feedback integration

Multi-object audio scheduling

Improved distance estimation accuracy

Model optimization for additional object classes

Project Status

🟢 Active Development
Currently focused on improving model accuracy, audio feedback strategies, and real-world testing.

Acknowledgements

Edge Impulse

Arduino Nicla Vision

OpenMV Community

https://drive.google.com/drive/folders/1MmSBoZGRFOV0r8Ip49wJ2W8kl1uHytrL?usp=sharing
