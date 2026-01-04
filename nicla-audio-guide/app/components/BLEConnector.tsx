"use client";

import { SERVICE_UUID, CHAR_UUID } from "@/lib/ble";

export interface BinaryData {
  classType: number;  // 0 = OBJECT, 1 = PERSON
  direction: number;  // 0 = LEFT, 1 = FRONT, 2 = RIGHT
}

// Normalize UUID format for Web Bluetooth
function normalizeUUID(uuid: string): string {
  // Remove dashes and convert to lowercase
  const cleaned = uuid.replace(/-/g, '').toLowerCase();
  
  // If it's a 128-bit UUID (32 hex chars), format it properly
  if (cleaned.length === 32) {
    return `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20, 32)}`;
  }
  
  // If it's a 16-bit UUID, return as-is
  return uuid;
}

export async function connectBLE(
  onData: (data: BinaryData) => void
): Promise<BluetoothDevice> {
  if (typeof navigator === "undefined" || !("bluetooth" in navigator)) {
    throw new Error("Web Bluetooth API is not available in this environment.");
  }

  const normalizedServiceUUID = normalizeUUID(SERVICE_UUID);
  const normalizedCharUUID = normalizeUUID(CHAR_UUID);

  try {
    console.log("🔍 Requesting Bluetooth device...");
    console.log(`📋 SERVICE_UUID (original): ${SERVICE_UUID}`);
    console.log(`📋 SERVICE_UUID (normalized): ${normalizedServiceUUID}`);
    console.log(`📋 CHAR_UUID (original): ${CHAR_UUID}`);
    console.log(`📋 CHAR_UUID (normalized): ${normalizedCharUUID}`);
    
    let device;
    
    // Try with specific filters first
    try {
      console.log("🔍 Attempt 1: Trying with name and service filters...");
      device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { name: "NICLA-VISION" },
          { namePrefix: "NICLA" },
          { namePrefix: "Nicla" },
          { services: [normalizedServiceUUID] }
        ],
        optionalServices: [normalizedServiceUUID],
      });
      console.log("✓ Device found with filters!");
    } catch (e) {
      console.warn("⚠️ Filters failed, trying acceptAllDevices...");
      
      // Fallback: Show all devices
      device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          normalizedServiceUUID,
          "0000180a-0000-1000-8000-00805f9b34fb", // Device Info
          "0000180f-0000-1000-8000-00805f9b34fb", // Battery
        ],
      });
      console.log("ℹ️ Please select 'NICLA-VISION' from the device list");
    }

    console.log("✓ Device selected:", device.name || "Unnamed Device");
    console.log("📱 Device ID:", device.id);

    if (!device.gatt) {
      throw new Error("GATT server not available");
    }

    console.log("🔌 Connecting to GATT server...");
    const server = await device.gatt.connect();
    console.log("✓ Connected to GATT server");

    // Discover all services
    console.log("\n🔎 Discovering all services...");
    const services = await server.getPrimaryServices();
    console.log(`📋 Found ${services.length} services:\n`);
    
    for (const svc of services) {
      console.log(`   📦 Service: ${svc.uuid}`);
      try {
        const chars = await svc.getCharacteristics();
        for (const char of chars) {
          const props = [];
          if (char.properties.read) props.push("READ");
          if (char.properties.write) props.push("WRITE");
          if (char.properties.writeWithoutResponse) props.push("WRITE_NO_RESP");
          if (char.properties.notify) props.push("NOTIFY");
          if (char.properties.indicate) props.push("INDICATE");
          
          console.log(`      └─ Char: ${char.uuid}`);
          console.log(`         Properties: [${props.join(", ")}]`);
        }
      } catch (e) {
        console.log(`      └─ Could not read characteristics`);
      }
    }

    let dataCharacteristic = null;
    let foundService = null;

    // Strategy 1: Try exact UUID match
    console.log(`\n🔍 Strategy 1: Looking for exact UUID match...`);
    console.log(`   Target service: ${normalizedServiceUUID}`);
    console.log(`   Target char: ${normalizedCharUUID}`);
    
    try {
      foundService = await server.getPrimaryService(normalizedServiceUUID);
      console.log(`   ✓ Found service: ${foundService.uuid}`);
      
      dataCharacteristic = await foundService.getCharacteristic(normalizedCharUUID);
      console.log(`   ✓ Found characteristic: ${dataCharacteristic.uuid}`);
    } catch (e) {
      console.warn(`   ✗ Exact match failed: ${e}`);
      
      // Strategy 2: Search all services for matching UUIDs
      console.log(`\n🔍 Strategy 2: Searching all services...`);
      for (const service of services) {
        console.log(`   Checking service: ${service.uuid}`);
        
        // Compare UUIDs (case-insensitive, without dashes)
        const serviceMatch = service.uuid.replace(/-/g, '').toLowerCase() === 
                            normalizedServiceUUID.replace(/-/g, '').toLowerCase();
        
        if (serviceMatch) {
          console.log(`   ✓ Service UUID matches!`);
          foundService = service;
          
          try {
            const chars = await service.getCharacteristics();
            for (const char of chars) {
              const charMatch = char.uuid.replace(/-/g, '').toLowerCase() === 
                               normalizedCharUUID.replace(/-/g, '').toLowerCase();
              
              if (charMatch) {
                console.log(`   ✓ Characteristic UUID matches!`);
                dataCharacteristic = char;
                break;
              }
            }
          } catch (e) {
            console.warn(`   Could not read characteristics: ${e}`);
          }
          
          if (dataCharacteristic) break;
        }
      }
      
      // Strategy 3: Find first notify-capable characteristic
      if (!dataCharacteristic) {
        console.log(`\n🔍 Strategy 3: Looking for any notify-capable characteristic...`);
        for (const service of services) {
          try {
            const chars = await service.getCharacteristics();
            for (const char of chars) {
              if (char.properties.notify || char.properties.indicate) {
                console.log(`   ✓ Found notify-capable: ${char.uuid}`);
                dataCharacteristic = char;
                foundService = service;
                break;
              }
            }
            if (dataCharacteristic) break;
          } catch (e) {
            // Continue
          }
        }
      }
    }

    if (!dataCharacteristic) {
      const servicesList = services.map((s: any) => {
        return `  - ${s.uuid}`;
      }).join('\n');
      
      const errorMsg = 
        `❌ Could not find characteristic!\n\n` +
        `Expected:\n` +
        `  Service: ${normalizedServiceUUID}\n` +
        `  Char: ${normalizedCharUUID}\n\n` +
        `Found ${services.length} services:\n` +
        servicesList + '\n\n' +
        `Troubleshooting:\n` +
        `1. Check OpenMV Serial Monitor - is BLE advertising?\n` +
        `2. Verify UUIDs match between OpenMV code and lib/ble.ts\n` +
        `3. Try resetting the Nicla Vision\n` +
        `4. Make sure asyncio.run(main()) is running\n`;
      
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    console.log(`\n📡 Starting notifications...`);
    console.log(`   Service: ${foundService?.uuid}`);
    console.log(`   Characteristic: ${dataCharacteristic.uuid}`);
    
    await dataCharacteristic.startNotifications();
    console.log("✅ Notifications started!\n");

    // Listen for data
    dataCharacteristic.addEventListener("characteristicvaluechanged", (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic | null;
      if (!target || !target.value) return;

      const dataView = target.value;
      const bytes = new Uint8Array(
        dataView.buffer, 
        dataView.byteOffset, 
        dataView.byteLength
      );

      console.log(`📦 Received ${bytes.length} bytes:`, Array.from(bytes));

      if (bytes.length >= 2) {
        const classType = bytes[0];
        const direction = bytes[1];
        
        const binaryData = { classType, direction };
        console.log(`🔥 Parsed:`, {
          class: classType === 0 ? 'OBJECT' : 'PERSON',
          direction: direction === 0 ? 'LEFT' : direction === 1 ? 'FRONT' : 'RIGHT'
        });
        
        onData(binaryData);
      } else {
        console.warn("⚠️ Invalid data length (expected 2+ bytes):", bytes.length);
      }
    });

    // Handle disconnection
    device.addEventListener('gattserverdisconnected', () => {
      console.log("❌ Device disconnected");
    });

    console.log("✅ BLE Setup Complete! Waiting for data...\n");
    return device;
    
  } catch (error) {
    console.error("❌ BLE Error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("User cancelled")) {
        throw new Error("Connection cancelled. Please try again and select NICLA-VISION.");
      } else if (error.message.includes("No Bluetooth adapter available")) {
        throw new Error("Bluetooth not available. Please enable Bluetooth on your device.");
      }
    }
    
    throw error;
  }
}