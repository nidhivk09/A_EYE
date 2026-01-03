"use client";

import { useState, useRef } from "react";
import { connectBLE } from "../components/BLEConnector";
import { parseEvent, buildSentence } from "../components/EventHandler";
import { speak } from "../components/AudioEngine";

interface DetectionEvent {
  object: string;
  direction: string;
  distance: string;
}

export default function Dashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<DetectionEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventCountRef = useRef(0);

  async function start() {
    try {
      setError(null);
      setIsConnected(true);
      setIsListening(true);
      eventCountRef.current = 0;
      setEvents([]);
      setLastEvent(null);

      await connectBLE((raw) => {
        const event = parseEvent(raw);
        if (!event) return;

        const sentence = buildSentence(event);
        speak(sentence, event.direction);

        // Store event in UI
        eventCountRef.current += 1;
        setLastEvent(event);
        setEvents((prev) => [event, ...prev].slice(0, 10)); // Keep last 10 events
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Connection failed";
      setError(message);
      setIsConnected(false);
      setIsListening(false);
    }
  }

  function stop() {
    setIsConnected(false);
    setIsListening(false);
  }

  return (
    <main style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>📊 Dashboard</h1>
          <p style={styles.subtitle}>
            Real-time object detection monitoring
          </p>
        </div>
        <div
          style={{
            ...styles.statusBadge,
            backgroundColor: isConnected ? "var(--success)" : "var(--text-secondary)",
          }}
        >
          <span style={styles.statusDot}></span>
          {isConnected ? "Connected" : "Disconnected"}
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Control Panel */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Control</h2>
          <div style={styles.buttonGroup}>
            <button
              onClick={start}
              disabled={isConnected}
              style={{
                ...styles.button,
                ...styles.primaryButton,
                opacity: isConnected ? 0.6 : 1,
              }}
            >
              {isConnected ? "🔄 Connected" : "🔗 Connect Device"}
            </button>
            {isConnected && (
              <button
                onClick={stop}
                style={{ ...styles.button, ...styles.dangerButton }}
              >
                ⏹ Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={styles.errorCard}>
            <span style={styles.errorIcon}>⚠️</span>
            <div>
              <p style={styles.errorTitle}>Connection Error</p>
              <p style={styles.errorMessage}>{error}</p>
            </div>
          </div>
        )}

        {/* Real-time Data */}
        {isConnected && (
          <>
            {/* Last Detection */}
            {lastEvent && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Last Detection</h2>
                <div style={styles.detectionGrid}>
                  <div style={styles.detectionItem}>
                    <span style={styles.detectionLabel}>Object</span>
                    <span style={styles.detectionValue}>
                      {lastEvent.object}
                    </span>
                  </div>
                  <div style={styles.detectionItem}>
                    <span style={styles.detectionLabel}>Direction</span>
                    <span style={styles.detectionValue}>
                      {getDirectionEmoji(lastEvent.direction)}{" "}
                      {lastEvent.direction}
                    </span>
                  </div>
                  <div style={styles.detectionItem}>
                    <span style={styles.detectionLabel}>Distance</span>
                    <span style={styles.detectionValue}>
                      {lastEvent.distance} cm
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Event History */}
            {events.length > 0 && (
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h2 style={styles.cardTitle}>Detection History</h2>
                  <span style={styles.eventCount}>
                    {eventCountRef.current} detected
                  </span>
                </div>
                <div style={styles.eventList}>
                  {events.map((event, idx) => (
                    <div key={idx} style={styles.eventItem}>
                      <div style={styles.eventDot}></div>
                      <div style={styles.eventContent}>
                        <span style={styles.eventObject}>{event.object}</span>
                        <span style={styles.eventMeta}>
                          {getDirectionEmoji(event.direction)}{" "}
                          {event.direction} • {event.distance} cm
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Info Card */}
        {!isConnected && (
          <div style={styles.infoCard}>
            <h2 style={styles.infoTitle}>📱 How to use</h2>
            <ol style={styles.infoList}>
              <li>Make sure your Nicla device is nearby and powered on</li>
              <li>Click "Connect Device" to establish Bluetooth connection</li>
              <li>The app will detect objects and announce them with spatial audio</li>
              <li>Objects on the left will sound from the left speaker</li>
              <li>Objects on the right will sound from the right speaker</li>
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}

function getDirectionEmoji(direction: string): string {
  switch (direction.toLowerCase()) {
    case "left":
      return "⬅️";
    case "right":
      return "➡️";
    case "center":
      return "⬆️";
    default:
      return "🎯";
  }
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "var(--background)",
    padding: "clamp(1rem, 5vw, 2rem)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "2rem",
    maxWidth: "600px",
    margin: "0 auto",
    position: "relative" as const,
    overflow: "hidden",
  },
  bgBlob1: {
    position: "fixed" as const,
    top: "-50px",
    right: "-50px",
    width: "300px",
    height: "300px",
    background: "radial-gradient(circle, rgba(0, 217, 255, 0.1) 0%, transparent 70%)",
    borderRadius: "50%",
    filter: "blur(40px)",
    animation: "pulse 6s ease-in-out infinite",
    pointerEvents: "none" as const,
  },
  bgBlob2: {
    position: "fixed" as const,
    bottom: "100px",
    left: "-100px",
    width: "400px",
    height: "400px",
    background: "radial-gradient(circle, rgba(255, 0, 110, 0.1) 0%, transparent 70%)",
    borderRadius: "50%",
    filter: "blur(40px)",
    animation: "pulse 8s ease-in-out infinite 1s",
    pointerEvents: "none" as const,
  },
  bgBlob3: {
    position: "fixed" as const,
    top: "50%",
    left: "50%",
    width: "350px",
    height: "350px",
    background: "radial-gradient(circle, rgba(131, 56, 236, 0.08) 0%, transparent 70%)",
    borderRadius: "50%",
    filter: "blur(40px)",
    animation: "pulse 7s ease-in-out infinite 2s",
    pointerEvents: "none" as const,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
    paddingBottom: "1.5rem",
    borderBottom: "1px solid var(--border)",
    position: "relative" as const,
    zIndex: 10,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: "clamp(1.75rem, 6vw, 2.5rem)",
    fontWeight: 700,
    background: "linear-gradient(135deg, var(--accent-yellow) 0%, var(--primary) 50%, var(--accent-green) 100%)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginTop: "0.5rem",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "white",
    boxShadow: "0 4px 15px rgba(0, 217, 255, 0.3)",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    animation: "pulse 2s infinite",
  },
  content: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1.5rem",
    position: "relative" as const,
    zIndex: 10,
  },
  card: {
    background: "rgba(20, 24, 41, 0.7)",
    border: "1px solid rgba(0, 217, 255, 0.2)",
    borderRadius: "var(--radius)",
    padding: "clamp(1rem, 4vw, 1.5rem)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(0, 217, 255, 0.05)",
    backdropFilter: "blur(10px)",
    animation: "slideIn 0.5s ease-out",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  cardTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "var(--foreground)",
  },
  eventCount: {
    fontSize: "0.8rem",
    background: "linear-gradient(135deg, var(--accent-yellow) 0%, var(--primary) 50%, var(--secondary) 100%)",
    color: "white",
    padding: "0.25rem 0.75rem",
    borderRadius: "20px",
    fontWeight: 600,
    boxShadow: "0 4px 12px rgba(0, 217, 255, 0.3)",
  },
  buttonGroup: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap" as const,
  },
  button: {
    flex: "1 1 auto",
    minWidth: "140px",
    padding: "clamp(0.75rem, 3vw, 1rem) 1.5rem",
    borderRadius: "var(--radius)",
    fontSize: "0.95rem",
    fontWeight: 600,
    border: "2px solid transparent",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
  },
  primaryButton: {
    background: "linear-gradient(135deg, var(--accent-yellow) 0%, var(--primary) 100%)",
    color: "white",
    boxShadow: "0 8px 24px rgba(255, 190, 11, 0.4), inset 0 -2px 8px rgba(0, 0, 0, 0.2)",
  },
  dangerButton: {
    background: "linear-gradient(135deg, var(--secondary) 0%, var(--danger) 100%)",
    color: "white",
    boxShadow: "0 8px 24px rgba(255, 0, 110, 0.4)",
  },
  detectionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
  },
  detectionItem: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
    padding: "1rem",
    backgroundColor: "rgba(26, 31, 58, 0.6)",
    borderRadius: "8px",
    border: "1px solid rgba(0, 217, 255, 0.3)",
    background: "linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(131, 56, 236, 0.1) 100%)",
  },
  detectionLabel: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  detectionValue: {
    fontSize: "1.25rem",
    fontWeight: 700,
    background: "linear-gradient(135deg, var(--accent-yellow) 0%, var(--primary) 50%, var(--accent-green) 100%)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  eventList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem",
  },
  eventItem: {
    display: "flex",
    gap: "1rem",
    padding: "0.75rem",
    backgroundColor: "rgba(26, 31, 58, 0.4)",
    borderRadius: "8px",
    border: "1px solid rgba(255, 0, 110, 0.2)",
    transition: "all 0.2s ease",
  },
  eventDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--accent-yellow) 0%, var(--primary) 50%, var(--secondary) 100%)",
    marginTop: "0.35rem",
    flexShrink: 0,
    boxShadow: "0 0 12px rgba(255, 190, 11, 0.6)",
  },
  eventContent: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.25rem",
    flex: 1,
  },
  eventObject: {
    fontWeight: 600,
    color: "var(--foreground)",
    fontSize: "0.95rem",
  },
  eventMeta: {
    fontSize: "0.8rem",
    color: "var(--text-secondary)",
  },
  errorCard: {
    background: "rgba(255, 0, 110, 0.15)",
    border: "1px solid rgba(255, 0, 110, 0.5)",
    borderRadius: "var(--radius)",
    padding: "1rem",
    display: "flex",
    gap: "1rem",
    alignItems: "flex-start",
    boxShadow: "0 0 20px rgba(255, 0, 110, 0.2)",
  },
  errorIcon: {
    fontSize: "1.5rem",
  },
  errorTitle: {
    fontWeight: 600,
    color: "var(--accent-yellow)",
    marginBottom: "0.25rem",
  },
  errorMessage: {
    fontSize: "0.9rem",
    color: "var(--foreground)",
  },
  infoCard: {
    background: "linear-gradient(135deg, rgba(0, 217, 255, 0.15) 0%, rgba(131, 56, 236, 0.15) 100%)",
    borderRadius: "var(--radius)",
    padding: "1.5rem",
    color: "var(--foreground)",
    border: "1px solid rgba(0, 217, 255, 0.3)",
    boxShadow: "0 8px 32px rgba(0, 217, 255, 0.15), inset 0 0 20px rgba(0, 217, 255, 0.05)",
  },
  infoTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    marginBottom: "1rem",
    background: "linear-gradient(135deg, var(--primary) 0%, var(--accent-green) 100%)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  infoList: {
    paddingLeft: "1.5rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem",
    lineHeight: 1.8,
  },
};
