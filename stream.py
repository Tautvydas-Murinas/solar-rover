import subprocess

# Take a photo with the Pi camera
subprocess.run(["libcamera-still", "-t", "1000", "-o", "test.jpg"])
print("Saved image as test.jpg")