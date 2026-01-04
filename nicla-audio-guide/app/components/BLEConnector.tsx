"use client";

import { SERVICE_UUID, CHAR_UUID } from "@/lib/ble";

export async function connectBLE(
  onData: (data: string) => void
): Promise<BluetoothDevice> {
  if (typeof navigator === "undefined" || !("bluetooth" in navigator)) {
    throw new Error("Web Bluetooth API is not available in this environment.");
  }

  try {
    console.log("🔍 Requesting Bluetooth device...");
    
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [
        { name: "NICLA-VISION" },
        { namePrefix: "NICLA" }
      ],
      optionalServices: [SERVICE_UUID],
    });

    console.log("✓ Device selected:", device.name);

    if (!device.gatt) {
      throw new Error("GATT server not available");
    }

    console.log("🔌 Connecting to GATT server...");
    const server = await device.gatt.connect();
    console.log("✓ Connected to GATT server");

    console.log("🔍 Getting service:", SERVICE_UUID);
    const service = await server.getPrimaryService(SERVICE_UUID);
    console.log("✓ Service found");

    console.log("🔍 Getting characteristic:", CHAR_UUID);
    const characteristic = await service.getCharacteristic(CHAR_UUID);
    console.log("✓ Characteristic found");

    console.log("📡 Starting notifications...");
    await characteristic.startNotifications();
    console.log("✓ Notifications started");

    characteristic.addEventListener("characteristicvaluechanged", (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic | null;
      if (!target || !target.value) return;

      const dataView = target.value;
      const bytes = new Uint8Array(
        dataView.buffer, 
        dataView.byteOffset, 
        dataView.byteLength
      );
      const text = new TextDecoder().decode(bytes);
      
      console.log("📥 Received:", text);
      onData(text);
    });

    // Handle disconnection
    device.addEventListener('gattserverdisconnected', () => {
      console.log("✗ Device disconnected");
    });

    return device;
    
  } catch (error) {
    console.error("❌ BLE Error:", error);
    throw error;
  }
}