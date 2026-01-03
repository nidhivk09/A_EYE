"use client";

import { SERVICE_UUID, CHAR_UUID } from "@/lib/ble";

export async function connectBLE(
  onData: (data: string) => void
) {
  if (typeof navigator === "undefined" || !("bluetooth" in navigator)) {
    throw new Error("Web Bluetooth API is not available in this environment.");
  }

  // requestDevice typings may not be available in all TS setups; cast to any
  const device = await (navigator as any).bluetooth.requestDevice({
    filters: [{ namePrefix: "NICLA" }],
    optionalServices: [SERVICE_UUID],
  });

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(SERVICE_UUID);
  const characteristic = await service.getCharacteristic(CHAR_UUID);

  await characteristic.startNotifications();

  characteristic.addEventListener("characteristicvaluechanged", (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic | null;
    if (!target) return;

    const dataView = target.value;
    if (!dataView) return;

    // Convert DataView -> Uint8Array for TextDecoder
    const bytes = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
    const text = new TextDecoder().decode(bytes);
    onData(text);
  });
}
