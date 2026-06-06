/*
 * Solar Rover — MG996R 360° continuous rotation servos
 *
 * Wiring (signal pins):
 *   Pin 7 — right wheels (front + rear right, same PWM signal)
 *   Pin 8 — left wheels  (front + rear left,  same PWM signal)
 *   Pin 9 — spare / unused (wire here only if you split rear axle later)
 *
 * Serial @ 9600 from Raspberry Pi (Node.js):
 *   F = forward, B = backward, L = turn left, R = turn right, S = stop
 *
 * MG996R 360°: 90 = stop, further from 90 = faster spin
 */

#include <Servo.h>

// --- Pin assignment ---
const int PIN_RIGHT = 7;
const int PIN_LEFT = 8;

// --- Speed (calibrate if wheels creep or spin wrong way) ---
const int STOP = 90;
const int RIGHT_FORWARD = 120;
const int RIGHT_BACKWARD = 60;
const int LEFT_FORWARD = 60;   // opposite to right — servos mounted mirrored
const int LEFT_BACKWARD = 120;

Servo rightWheels;
Servo leftWheels;

void setup() {
  Serial.begin(9600);

  rightWheels.attach(PIN_RIGHT);
  leftWheels.attach(PIN_LEFT);

  stopAll();

  // Handshake so Node.js knows firmware is alive after USB reset
  Serial.println("READY");
}

void loop() {
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

void setTracks(int right, int left) {
  rightWheels.write(right);
  leftWheels.write(left);
}

void moveForward() {
  setTracks(RIGHT_FORWARD, LEFT_FORWARD);
}

void moveBackward() {
  setTracks(RIGHT_BACKWARD, LEFT_BACKWARD);
}

void turnLeft() {
  setTracks(RIGHT_FORWARD, LEFT_BACKWARD);
}

void turnRight() {
  setTracks(RIGHT_BACKWARD, LEFT_FORWARD);
}

void stopAll() {
  setTracks(STOP, STOP);
}
