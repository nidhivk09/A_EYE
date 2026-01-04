# Edge Impulse - Nicla Vision
# 2-stage pipeline:
# Stage 1: PERSON / OBJECT classification on full image
# Stage 2: LEFT / FRONT / RIGHT direction detection via cropping
# BLE payload: [class, direction, confidence]
# SILENT when nothing is detected

import sensor
import time
import ml
import uos
import gc

import asyncio
import aioble
import bluetooth
import struct

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
    capture=True
)

aioble.register_services(ai_service)

connected_device = None

async def ble_task():
    global connected_device
    while True:
        try:
            async with await aioble.advertise(
                _ADV_INTERVAL_MS,
                name="NICLA-VISION",
                services=[_AI_SERVICE_UUID],
            ) as connection:
                connected_device = connection
                await connection.disconnected(timeout_ms=None)
        except Exception:
            await asyncio.sleep_ms(1000)
        finally:
            connected_device = None

# ================= ENCODING =================
def encode_class(cls):
    return 1 if cls == "PERSON" else 0

def encode_direction(d):
    return {"LEFT": 0, "FRONT": 1, "RIGHT": 2}[d]

def encode_payload(cls, direction, confidence):
    return struct.pack(
        "BBB",
        encode_class(cls),
        encode_direction(direction),
        min(100, max(0, confidence))
    )

# ================= CAMERA =================
sensor.reset()
sensor.set_pixformat(sensor.RGB565)
sensor.set_framesize(sensor.QVGA)
sensor.set_windowing((240, 240))
sensor.skip_frames(time=2000)

# ================= LOAD MODEL =================
net = ml.Model(
    "trained.tflite",
    load_to_fb=uos.stat("trained.tflite")[6] > (gc.mem_free() - (64 * 1024))
)

labels = [l.strip() for l in open("labels.txt")]

OBJECT_IDX = labels.index("object_data")
PERSON_IDX = labels.index("person_data")

# ================= IMAGE REGIONS =================
IMG_W = 240
IMG_H = 240
ZONE_W = IMG_W // 3

LEFT_RECT  = (0, 0, ZONE_W, IMG_H)
FRONT_RECT = (ZONE_W, 0, ZONE_W, IMG_H)
RIGHT_RECT = (2 * ZONE_W, 0, ZONE_W, IMG_H)

# ================= PARAMETERS =================
CONF_THRESH = 0.70
PROCESS_EVERY_N_FRAMES = 5

clock = time.clock()
frame_count = 0

# ================= VISION TASK =================
async def vision_task():
    global frame_count, connected_device

    while True:
        clock.tick()
        img = sensor.snapshot()

        a = tof.read()

        if a > 1500:
            await asyncio.sleep_ms(100)
            continue

        # ---------- Stage 1: Global classification ----------
        pred_full = net.predict([img])[0].flatten()
        person_conf = pred_full[PERSON_IDX]
        object_conf = pred_full[OBJECT_IDX]

        frame_count += 1
        if frame_count % PROCESS_EVERY_N_FRAMES != 0:
            await asyncio.sleep_ms(1)
            continue

        # ---------- SILENCE CONDITION ----------
        if person_conf < CONF_THRESH and object_conf < CONF_THRESH:
            # Absolute silence: no BLE, no print
            await asyncio.sleep_ms(10)
            continue

        # ---------- Decide class ----------
        if person_conf >= CONF_THRESH:
            detected_class = "PERSON"
            class_idx = PERSON_IDX
            class_conf = person_conf
        else:
            detected_class = "OBJECT"
            class_idx = OBJECT_IDX
            class_conf = object_conf

        # ---------- Stage 2: Direction ----------
        img_left  = img.copy(roi=LEFT_RECT)
        img_mid   = img.copy(roi=FRONT_RECT)
        img_right = img.copy(roi=RIGHT_RECT)

        p_left  = net.predict([img_left])[0].flatten()
        p_mid   = net.predict([img_mid])[0].flatten()
        p_right = net.predict([img_right])[0].flatten()

        scores = {
            "LEFT":  p_left[class_idx],
            "FRONT": p_mid[class_idx],
            "RIGHT": p_right[class_idx]
        }

        best_dir = max(scores, key=scores.get)
        confidence_pct = int(class_conf * 100)

        # ---------- BLE SEND ----------
        if connected_device:
            payload = encode_payload(
                detected_class,
                best_dir,
                confidence_pct
            )
            ai_char.write(payload, send_update=True)

        await asyncio.sleep_ms(5000)  # spacing between notifications

# ================= MAIN =================
async def main():
    await asyncio.gather(
        vision_task(),
        ble_task()
    )

asyncio.run(main())
