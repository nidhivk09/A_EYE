#include <ArduinoBLE.h>

#define SERVICE_UUID "12345678-1234-5678-1234-56789abcdef0"
#define CHAR_UUID    "12345678-1234-5678-1234-56789abcdef1"

BLEService visionService(SERVICE_UUID);
BLECharacteristic detectionChar(
  CHAR_UUID,
  BLERead | BLENotify,
  40
);

void setup() {
  Serial.begin(115200);
  delay(2000);

  if (!BLE.begin()) {
    Serial.println("BLE init failed!");
    while (1);
  }

  // Set device name
  BLE.setLocalName("NICLA-VISION");
  BLE.setDeviceName("NICLA-VISION");
  
  // Set connectable and discoverable
  BLE.setConnectable(true);  // Add this line
  
  // Advertise the service
  BLE.setAdvertisedService(visionService);
  
  visionService.addCharacteristic(detectionChar);
  BLE.addService(visionService);

  // Set initial value
  detectionChar.writeValue("ready");

  // Start advertising
  BLE.advertise();

  Serial.println("✓ BLE advertising started");
  Serial.println("Device name: NICLA-VISION");
  Serial.print("Service UUID: ");
  Serial.println(SERVICE_UUID);
}

void loop() {
  BLEDevice central = BLE.central();

  if (central) {
    Serial.print("✓ Connected to: ");
    Serial.println(central.address());

    while (central.connected()) {
      sendDetection("person,left,near,87");
      delay(1000);
    }

    Serial.println("✗ Disconnected");
  }
  
  delay(100);
}

void sendDetection(const char* msg) {
  detectionChar.writeValue((const uint8_t*)msg, strlen(msg));
  Serial.print("Sent: ");
  Serial.println(msg);
}