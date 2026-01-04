# Edge Impulse - Nicla Vision
# 2-stage pipeline:
# Stage 1: PERSON / OBJECT classification on full image
# Stage 2: LEFT / FRONT / RIGHT direction detection via cropping
# Binary BLE payload: [class, direction, confidence]

import sensor
import time
import ml
import uos
import gc

import asyncio
import aioble
import bluetooth
import struct
import machine

from machine import I2C
from vl53l1x import VL53L1X


tof = VL53L1X(I2C(2))

# ================= BLE SETUP =================
_AI_SERVICE_UUID = bluetooth.UUID("12345678-1234-5678-1234-56789abcdef0")
_AI_CHAR_UUID    = bluetooth.UUID("12345678-1234-5678-1234-56789abcdef1")

_ADV_INTERVAL_MS = 250_000

ai_service = aioble.Service(_AI_SERVICE_UUID)
ai_char = aioble.Characteristic(
    ai_service,
    _AI_CHAR_UUID,
    read=True,
    notify=True,
    capture=True  # Important for notifications
)

aioble.register_services(ai_service)

print("="*50)
print("BLE Configuration:")
print(f"  Device Name: NICLA-VISION")
print(f"  Service UUID: {_AI_SERVICE_UUID}")
print(f"  Char UUID: {_AI_CHAR_UUID}")
print(f"  Advertising Interval: {_ADV_INTERVAL_MS}ms")
print("="*50)

connected_device = None

def ble_task():
    global connected_device

    print("\n🔵 Starting BLE advertisement...")
    try:
        with aioble.advertise(
                _ADV_INTERVAL_MS,
                name="NICLA-VISION",
                services=[_AI_SERVICE_UUID],
                appearance=0x0000,
            ) as connection:
                print(f"✅ BLE connected to: {connection.device}")
                connected_device = connection

    except asyncio.CancelledError:
        raise
    except Exception as e:
        print(f"⚠️ BLE task error: {e}")
        time.sleep_ms(1000)

# ================= ENCODING HELPERS =================
def encode_class(cls_str):
    return 1 if cls_str == "PERSON" else 0

def encode_direction(dir_str):
    if dir_str == "LEFT":
        return 0
    elif dir_str == "FRONT":
        return 1
    elif dir_str == "RIGHT":
        return 2
    return 1  # Default to FRONT

def encode_payload(cls_str, dir_str, confidence):
    """
    Pack data into 3 bytes: [class_type, direction, confidence]
    """
    return struct.pack(
        "BBB",  # Three unsigned bytes
        encode_class(cls_str),
        encode_direction(dir_str),
        min(100, max(0, confidence))  # Clamp to 0-100
    )

# ================= CAMERA SETUP =================
print("\n📷 Initializing camera...")
sensor.reset()
sensor.set_pixformat(sensor.RGB565)
sensor.set_framesize(sensor.QVGA)        # 320x240
sensor.set_windowing((240, 240))         # Center crop
sensor.skip_frames(time=2000)
print("✅ Camera ready")

# ================= LOAD MODEL =================
print("\n🧠 Loading ML model...")
try:
    net = ml.Model(
        "trained.tflite",
        load_to_fb=uos.stat("trained.tflite")[6] > (gc.mem_free() - (64 * 1024))
    )
    print("✅ Model loaded")
except Exception as e:
    raise Exception("Failed to load trained.tflite: " + str(e))

try:
    labels = [line.strip() for line in open("labels.txt")]
    print(f"✅ Labels loaded: {labels}")
except Exception as e:
    raise Exception("Failed to load labels.txt: " + str(e))

OBJECT_IDX = labels.index("object_data")
PERSON_IDX = labels.index("person_data")

# ================= IMAGE REGIONS =================
IMG_W = 240
IMG_H = 240
ZONE_W = IMG_W // 3

LEFT_RECT   = (0,           0, ZONE_W, IMG_H)
FRONT_RECT  = (ZONE_W,      0, ZONE_W, IMG_H)
RIGHT_RECT  = (2 * ZONE_W,  0, ZONE_W, IMG_H)

# ================= PARAMETERS =================
CONF_THRESH = 0.70
ANNOUNCE_EVERY_N_FRAMES = 5

frame_count = 0
from machine import I2C
from vl53l1x import VL53L1X

tof = VL53L1X(I2C(2))
clock = time.clock()

import pyb
from machine import LED

led = LED("LED_BLUE")
rled = LED("LED_RED")

rtc = pyb.RTC()
# (year, month, day[, hour[, minute[, second[, microsecond[, tzinfo]]]]])
rtc.datetime((2014, 5, 1, 4, 13, 0, 0, 0))

# ================= VISION TASK =================
def vision_task():
    global frame_count, connected_device
    #led.on()
    print("\n👁️ Starting vision task...")

    while True:
        clock.tick()

        a = tof.read()

        if a > 1500:
            # time.sleep_ms(1000)
            #led.off()
            rled.on()
            rtc.wakeup(1000)
            machine.sleep()
            rled.off()
            continue

        img = sensor.snapshot()

        # -------- Stage 1: Global classification --------
        try:
            pred_full = net.predict([img])[0].flatten()
        except Exception as e:
            print(f"Prediction error: {e}")
            time.sleep_ms(100)
            continue

        person_conf = pred_full[PERSON_IDX]
        object_conf = pred_full[OBJECT_IDX]

        frame_count += 1

        # Only process every N frames to reduce CPU load
        if frame_count % ANNOUNCE_EVERY_N_FRAMES != 0:
            time.sleep_ms(1)
            continue

        detected_class = None
        class_conf = 0
        class_idx = 0

        if person_conf >= CONF_THRESH:
            detected_class = "PERSON"
            class_conf = person_conf
            class_idx = PERSON_IDX
        elif object_conf >= CONF_THRESH:
            detected_class = "OBJECT"
            class_conf = object_conf
            class_idx = OBJECT_IDX
        else:
            # Nothing detected above threshold
            time.sleep_ms(1)
            continue

        # -------- Stage 2: Direction detection --------
        img_left  = img.copy(roi=LEFT_RECT)
        img_mid   = img.copy(roi=FRONT_RECT)
        img_right = img.copy(roi=RIGHT_RECT)

        pred_left  = net.predict([img_left])[0].flatten()
        pred_mid   = net.predict([img_mid])[0].flatten()
        pred_right = net.predict([img_right])[0].flatten()

        scores = {
            "LEFT":  pred_left[class_idx],
            "FRONT": pred_mid[class_idx],
            "RIGHT": pred_right[class_idx]
        }

        best_dir = max(scores, key=scores.get)
        confidence_pct = int(class_conf * 100)

        # -------- BLE SEND --------
        if connected_device is not None:
            try:
                payload = encode_payload(
                    detected_class,
                    best_dir,
                    confidence_pct
                )

                # Write to characteristic (this triggers notification)
                ai_char.write(payload, send_update=True)

                print(f"📤 TX → {detected_class} | {best_dir} | {confidence_pct}% | FPS: {clock.fps():.1f}")
            except Exception as e:
                print(f"⚠️ BLE send error: {e}")
        else:
            print(f"⏸️ Detected {detected_class} {best_dir} {confidence_pct}% (No BLE connection)")


        # time.sleep_ms(2000)  # Small delay between sends
        rtc.wakeup(2000)
        machine.sleep()

# ================= MAIN =================
def main():
    print("\n🚀 Starting application...")
    ble_task()
    vision_task()


print("\n" + "="*50)
print("Starting asyncio event loop...")
print("="*50 + "\n")

main()
