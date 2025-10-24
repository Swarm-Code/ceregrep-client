#\!/usr/bin/env python3
import time
import sys

def display_time():
    try:
        while True:
            current_time = time.strftime("%H:%M:%S")
            sys.stdout.write(f"\rCurrent Time: {current_time}")
            sys.stdout.flush()
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nTime display stopped.")

if __name__ == "__main__":
    display_time()
