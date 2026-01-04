# Edge Impulse - Nicla Vision
# Binary classification (PERSON / OBJECT)
# + Spatial direction (LEFT / FRONT / RIGHT) via image cropping

import sensor
import time
import ml
import uos
import gc

# ---------------- Camera Setup ----------------
sensor.reset()
sensor.set_pixformat(sensor.RGB565)
sensor.set_framesize(sensor.QVGA)       # 320x240
sensor.set_windowing((240, 240))        # Center crop
sensor.skip_frames(time=2000)   # Allow settings to take effect

# ---------------- Load Model ----------------
try:
    net = ml.Model(
        "trained.tflite",
        load_to_fb=uos.stat('trained.tflite')[6] > (gc.mem_free() - (64 * 1024))
    )
except Exception as e:
    raise Exception("Failed to load trained.tflite: " + str(e))

try:
    labels = [line.strip() for line in open("labels.txt")]
except Exception as e:
    raise Exception("Failed to load labels.txt: " + str(e))

print("Loaded labels:", labels)

# Confirm label order
OBJECT_IDX = labels.index("object_data")
PERSON_IDX = labels.index("person_data")

# ---------------- Image Regions ----------------
IMG_W = 240
IMG_H = 240
ZONE_W = IMG_W // 3   # 80 px

LEFT_RECT   = (0,           0, ZONE_W, IMG_H)
FRONT_RECT  = (ZONE_W,      0, ZONE_W, IMG_H)
RIGHT_RECT  = (2 * ZONE_W,  0, ZONE_W, IMG_H)

# ---------------- Parameters ----------------
CONF_THRESH = 0.70
ANNOUNCE_EVERY_N_FRAMES = 5

frame_count = 0
clock = time.clock()

# ---------------- Main Loop ----------------
while True:
    clock.tick()
    img = sensor.snapshot()

    # Crop 3 regions
    img_left  = img.copy(roi=LEFT_RECT)
    img_mid   = img.copy(roi=FRONT_RECT)
    img_right = img.copy(roi=RIGHT_RECT)

    # Run inference
    pred_left  = net.predict([img_left])[0].flatten()
    pred_mid   = net.predict([img_mid])[0].flatten()
    pred_right = net.predict([img_right])[0].flatten()

    # Collect scores
    person_scores = {
        "LEFT":  pred_left[PERSON_IDX],
        "FRONT": pred_mid[PERSON_IDX],
        "RIGHT": pred_right[PERSON_IDX]
    }

    object_scores = {
        "LEFT":  pred_left[OBJECT_IDX],
        "FRONT": pred_mid[OBJECT_IDX],
        "RIGHT": pred_right[OBJECT_IDX]
    }

    # Best directions
    best_person_dir = max(person_scores, key=person_scores.get)
    best_object_dir = max(object_scores, key=object_scores.get)

    person_conf = person_scores[best_person_dir]
    object_conf = object_scores[best_object_dir]

    # ---------------- Output Logic ----------------
    frame_count += 1
    if frame_count % ANNOUNCE_EVERY_N_FRAMES == 0:

        if person_conf > CONF_THRESH:
            print("PERSON", best_person_dir, "conf:", round(person_conf, 2))

        elif object_conf > CONF_THRESH:
            print("OBJECT", best_object_dir, "conf:", round(object_conf, 2))

        else:
            print("No confident detection")

        print("FPS:", round(clock.fps(), 2))
