/*
 * Solar Rover — 4× MG996R 360° continuous rotation servos (one per wheel)
 *
 * Signal pins (change below if your wiring differs):
 *   Pin 7  — front right wheel
 *   Pin 8  — front left wheel
 *   Pin 9  — rear right wheel
 *   Pin 10 — rear left wheel
 *
 * Power: use external 5–6V for servos (not Arduino 5V pin for 4× MG996).
 * GND: Arduino GND must connect to servo power GND.
 *
 * Upload after every change (git pull does NOT update Arduino):
 *   Arduino IDE: Tools → Board → Uno, then Upload
 *
 * Serial @ 9600: F=forward B=backward L=left R=right S=stop
 */

#include <Servo.h>

// --- Servo signal pins ---
const int PIN_FRONT_RIGHT = 7;
const int PIN_FRONT_LEFT  = 8;
const int PIN_REAR_RIGHT  = 9;
const int PIN_REAR_LEFT   = 10;

// --- Speed (tune if wheels creep or spin wrong way) ---
const int STOP = 90;
const int SPIN_FWD = 120;
const int SPIN_REV = 60;

// Set to 1 if rear servos are mounted opposite to front (common)
#define MIRROR_REAR 1

Servo frontRight;
Servo frontLeft;
Servo rearRight;
Servo rearLeft;

void setup() {
  Serial.begin(9600);
  delay(800);

  frontRight.attach(PIN_FRONT_RIGHT);
  frontLeft.attach(PIN_FRONT_LEFT);
  rearRight.attach(PIN_REAR_RIGHT);
  rearLeft.attach(PIN_REAR_LEFT);

  stopAll();
  Serial.println("READY");
}

void loop() {
  static unsigned long lastReady = 0;
  if (millis() - lastReady > 3000) {
    Serial.println("READY");
    lastReady = millis();
  }

  if (!Serial.available()) {
    return;
  }

  char command = Serial.read();
  while (Serial.available()) {
    Serial.read();
  }

  switch (command) {
    case 'F':
      moveForward();
      Serial.println("OK F");
      break;
    case 'B':
      moveBackward();
      Serial.println("OK B");
      break;
    case 'L':
      turnLeft();
      Serial.println("OK L");
      break;
    case 'R':
      turnRight();
      Serial.println("OK R");
      break;
    case 'S':
      stopAll();
      Serial.println("OK S");
      break;
    default:
      Serial.print("ERR ");
      Serial.println(command);
      break;
  }
}

int rearSpeed(int forwardSpeed) {
#if MIRROR_REAR
  return forwardSpeed == SPIN_FWD ? SPIN_REV : SPIN_FWD;
#else
  return forwardSpeed;
#endif
}

void setWheels(int fr, int fl, int rr, int rl) {
  frontRight.write(fr);
  frontLeft.write(fl);
  rearRight.write(rr);
  rearLeft.write(rl);
}

void moveForward() {
  setWheels(SPIN_FWD, SPIN_FWD, rearSpeed(SPIN_FWD), rearSpeed(SPIN_FWD));
}

void moveBackward() {
  setWheels(SPIN_REV, SPIN_REV, rearSpeed(SPIN_REV), rearSpeed(SPIN_REV));
}

void turnLeft() {
  // tank turn: right wheels forward, left wheels backward
  setWheels(SPIN_FWD, SPIN_REV, rearSpeed(SPIN_FWD), rearSpeed(SPIN_REV));
}

void turnRight() {
  setWheels(SPIN_REV, SPIN_FWD, rearSpeed(SPIN_REV), rearSpeed(SPIN_FWD));
}

void stopAll() {
  setWheels(STOP, STOP, STOP, STOP);
}
