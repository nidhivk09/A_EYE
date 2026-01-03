#include <ArduinoBLE.h>


#define SERVICE_UUID "12345678-1234-5678-1234-56789abcdef0"
#define CHAR_UUID    "12345678-1234-5678-1234-56789abcdef1"

BLEService visionService(SERVICE_UUID);
BLECharacteristic detectionChar(
  CHAR_UUID,
  BLERead | BLENotify,
  40  // max payload size
);

void setup() {
  Serial.begin(115200);
  while (!Serial);

  if (!BLE.begin()) {
    Serial.println("BLE init failed!");
    while (1);
  }

  // Device name (this is what browser sees)
  BLE.setLocalName("NICLA-VISION");
  BLE.setDeviceName("NICLA-VISION");

  // Advertise our custom service
  BLE.setAdvertisedService(visionService);

  visionService.addCharacteristic(detectionChar);
  BLE.addService(visionService);

  detectionChar.writeValue("ready");

  BLE.advertise();

  Serial.println("BLE advertising started");
}

void loop() {
  BLEDevice central = BLE.central();

  if (central) {
    Serial.print("Connected to: ");
    Serial.println(central.address());

    while (central.connected()) {
      // Example payload
      sendDetection("person,left,near,87");
      delay(1000);
    }

    Serial.println("Disconnected");
  }
}

void sendDetection(const char* msg) {
  detectionChar.writeValue((const uint8_t*)msg, strlen(msg));
}
