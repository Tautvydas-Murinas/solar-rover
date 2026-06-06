#include <Servo.h>

// MG996R 360° continuous rotation: 90 = stop, <90 / >90 = spin (direction depends on wiring)
const int STOP = 90;
const int FORWARD = 120;
const int BACKWARD = 60;

Servo rightFrontServo;
Servo leftFrontServo;
Servo rightRearServo;
Servo leftRearServo;

void setup() {
  Serial.begin(9600);

  rightFrontServo.attach(8);
  leftFrontServo.attach(9);
  rightRearServo.attach(10);
  leftRearServo.attach(11);

  stopAll();
}

void loop() {
  if (Serial.available()) {
    char command = Serial.read();
    while (Serial.available()) {
      Serial.read(); // discard extra bytes
    }

    switch (command) {
      case 'F':
        moveForward();
        break;
      case 'B':
        moveBackward();
        break;
      case 'L':
        turnLeft();
        break;
      case 'R':
        turnRight();
        break;
      case 'S':
        stopAll();
        break;
    }
  }
}

// Front servos are mounted opposite to rear servos on this chassis
void setWheels(int rightFront, int leftFront, int rightRear, int leftRear) {
  rightFrontServo.write(rightFront);
  leftFrontServo.write(leftFront);
  rightRearServo.write(rightRear);
  leftRearServo.write(leftRear);
}

void moveForward() {
  setWheels(FORWARD, FORWARD, BACKWARD, BACKWARD);
}

void moveBackward() {
  setWheels(BACKWARD, BACKWARD, FORWARD, FORWARD);
}

void turnLeft() {
  setWheels(FORWARD, BACKWARD, BACKWARD, FORWARD);
}

void turnRight() {
  setWheels(BACKWARD, FORWARD, FORWARD, BACKWARD);
}

void stopAll() {
  setWheels(STOP, STOP, STOP, STOP);
}
