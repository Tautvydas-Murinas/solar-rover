#include <Servo.h>

Servo rightFrontServo;
Servo leftFrontServo;
Servo rightRearServo;
Servo leftRearServo;

int forwardSpeed = 120;
int backwardSpeed = 60;
int stopSpeed = 90;

void setup() {
  Serial.begin(9600);
  
  rightFrontServo.attach(8);
  leftFrontServo.attach(9);
  rightRearServo.attach(10);
  leftRearServo.attach(11);

  stopAllServos();
}

void loop() {
  moveForward();
  // if (Serial.available()) {
  //   char command = Serial.read();

  //   if (command == 'F') {
  //     moveForward();
  //   } else if (command == 'S') {
  //     stopAllServos();
  //   }
  // }
}

void moveForward() {
  rightFrontServo.write(forwardSpeed);
  leftFrontServo.write(forwardSpeed);
  rightRearServo.write(backwardSpeed);
  leftRearServo.write(backwardSpeed);
}

void stopAllServos() {
  rightFrontServo.write(stopSpeed);
  leftFrontServo.write(stopSpeed);
  rightRearServo.write(stopSpeed);
  leftRearServo.write(stopSpeed);
}
