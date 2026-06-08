/*
 * Solar Rover — MG996R 360° continuous rotation servo
 *
 * CURRENT WIRING: one servo signal on pin 7 only
 *   Pin 7 — servo signal (orange/yellow)
 *   Servo +5V and GND → separate power supply (not Arduino 5V for MG996)
 *
 * IMPORTANT: git pull on the Pi does NOT update this sketch.
 *            You must upload to Arduino after changing this file:
 *              cd server/rover_controller
 *              arduino-cli upload -p /dev/ttyACM0 --fqbn arduino:avr:uno .
 *
 * Serial @ 9600 from Raspberry Pi (Node.js):
 *   F = forward, B = backward, L/R = spin (test), S = stop
 */

#include <Servo.h>

// Set to 0 when you add a second servo on pin 8
#define SINGLE_MOTOR 1

const int PIN_MOTOR = 7;
const int PIN_LEFT = 8;

// MG996R 360°: 90 = stop. If motor creeps at rest, try 88 or 92.
const int STOP = 90;
const int FORWARD = 120;
const int BACKWARD = 60;

Servo motor;
#if !SINGLE_MOTOR
Servo leftMotor;
#endif

void setup() {
  Serial.begin(9600);
  delay(800);  // let USB-serial stabilize after Pi connects

  motor.attach(PIN_MOTOR);
#if !SINGLE_MOTOR
  leftMotor.attach(PIN_LEFT);
#endif

  stopAll();
  Serial.println("READY");
}

void loop() {
  // Re-send until Pi hears us (missed on USB reset)
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

void driveMotor(int speed) {
  motor.write(speed);
}

void moveForward() {
#if SINGLE_MOTOR
  driveMotor(FORWARD);
#else
  motor.write(FORWARD);
  leftMotor.write(BACKWARD);
#endif
}

void moveBackward() {
#if SINGLE_MOTOR
  driveMotor(BACKWARD);
#else
  motor.write(BACKWARD);
  leftMotor.write(FORWARD);
#endif
}

void turnLeft() {
#if SINGLE_MOTOR
  driveMotor(FORWARD);  // single motor: same spin for test
#else
  motor.write(FORWARD);
  leftMotor.write(FORWARD);
#endif
}

void turnRight() {
#if SINGLE_MOTOR
  driveMotor(BACKWARD);
#else
  motor.write(BACKWARD);
  leftMotor.write(BACKWARD);
#endif
}

void stopAll() {
  driveMotor(STOP);
#if !SINGLE_MOTOR
  leftMotor.write(STOP);
#endif
}
