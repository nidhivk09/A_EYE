# This work is licensed under the MIT license.
# Copyright (c) 2013-2023 OpenMV LLC. All rights reserved.
# https://github.com/openmv/openmv/blob/master/LICENSE
#
# Stop Mode Example
# This example demonstrates using the low-power Stop Mode.

import pyb
import machine
import time
from machine import LED

led = LED("LED_BLUE")

led.on()

# Create and init RTC object.
rtc = pyb.RTC()
# (year, month, day[, hour[, minute[, second[, microsecond[, tzinfo]]]]])
rtc.datetime((2014, 5, 1, 4, 13, 0, 0, 0))

# Print RTC info.
print(rtc.datetime())
time.sleep_ms(5000)
led.off()
# Enable RTC interrupts every 5 seconds.
rtc.wakeup(500)

# Enter Stop Mode.
# Note the IDE will disconnect.
machine.sleep()

led.on()
while True:
    pass
