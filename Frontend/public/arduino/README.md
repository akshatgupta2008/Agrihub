# Arduino Braille Tactile Controller

This folder contains the Arduino sketch that drives the haptic Braille output for AgriHub's Assistive Support page.

---

## Hardware Required

- **Arduino Uno** (or any 5V-compatible board)
- **Vibrating motor** or **motor driver + motor**
- **USB cable** (for programming + data)

---

## Wiring

### Direct Motor (low-power, &lt;40mA)

```
Motor +VE  →  Arduino Pin 9  (PWM)
Motor -VE  →  Arduino GND
```

### With Motor Driver (recommended for larger motors)

```
Motor Driver IN1  →  Arduino Pin 9  (PWM)
Motor Driver GND  →  Arduino GND
Motor Driver VCC  →  External 5V–12V
Motor  →  Motor Driver OUT terminals
```

**Tip:** Power the motor separately if it draws more than 40mA — Arduino pins are only safe up to ~40mA.

---

## Setup

### 1. Upload the sketch

1. Install the [Arduino IDE](https://www.arduino.cc/en/software).
2. Open `bil369.ino` in the IDE.
3. Connect your Arduino Uno via USB.
4. Select **Tools → Board → Arduino Uno**.
5. Select the correct **Port** (e.g. COM3, /dev/ttyUSB0).
6. Click the **Upload** button (→ arrow).

After uploading, open the **Serial Monitor** (Tools → Serial Monitor) and set baud rate to **9600**. You should see:
```
Enter a letter A–Z to feel its Braille pattern.
```

### 2. Connect from AgriHub

1. Open AgriHub in **Chrome** or **Edge** (Web Serial API required — not available in Firefox/Safari).
2. Go to **Special Dashboard → Accessibility Support**.
3. Click **Connect Arduino** and select your board from the port list.
4. Type text in the converter and click **Send to Tactile**.

---

## How It Works

The sketch maps A–Z to 6-dot Braille patterns. Each active dot vibrates the motor for 150ms with 100ms gaps. Characters are spaced by 500ms.

| Dot position | Arduino pin state |
|---|---|
| All 6 dots off | Motor stays silent |
| Dot 1 on | Motor pulses once |
| Dot 2 on | Motor pulses twice (with delay) |
| … | … |

The browser sends one uppercase letter at a time over USB Serial at 9600 baud. The sketch ignores any character that isn't A–Z.

---

## Pin Reference

| Pin | Function |
|---|---|
| Pin 9 | PWM motor signal (vibration control) |
| GND | Common ground |
| USB | Power + Serial data |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Invalid input. Enter A–Z only" in Serial Monitor | Only A–Z are supported. Numbers and punctuation are ignored by the sketch. |
| Motor not vibrating | Check motor polarity. Try a different motor. If using a driver, verify VCC is getting power. |
| Browser can't connect | Use Chrome or Edge. Make sure the sketch was uploaded successfully and the Serial Monitor is closed. |
| Motor gets hot | The motor is drawing too much current — use a motor driver and external power supply. |
