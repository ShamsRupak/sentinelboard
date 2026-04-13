#!/usr/bin/env python3
"""Inject gradual drift into predictions to trigger drift alerts."""
import argparse
import asyncio
import time

import httpx


async def inject_drift(
    base_url: str,
    rate: float,
    shift_per_second: float,
    duration: int,
    n_features: int,
) -> None:
    import random

    async with httpx.AsyncClient(timeout=10.0) as client:
        start = time.time()
        count = 0

        while time.time() - start < duration:
            elapsed = time.time() - start
            shift = elapsed * shift_per_second

            # Gradually shift the mean of all features
            features = [random.gauss(shift, 1) for _ in range(n_features)]

            try:
                resp = await client.post(
                    f"{base_url}/predict",
                    json={"features": features},
                )
                count += 1

                if count % 50 == 0:
                    print(f"[{elapsed:.1f}s] Shift={shift:.2f}, sent {count} drifted predictions")

            except Exception as e:
                print(f"Error: {e}")

            await asyncio.sleep(1.0 / rate)

        print(f"\nDrift injection complete: {count} predictions, final shift={shift:.2f}")


def main():
    parser = argparse.ArgumentParser(description="Inject drift into SentinelBoard")
    parser.add_argument("--url", default="http://localhost:8000")
    parser.add_argument("--rate", type=float, default=10.0)
    parser.add_argument("--shift", type=float, default=0.1, help="Mean shift per second")
    parser.add_argument("--duration", type=int, default=120)
    parser.add_argument("--features", type=int, default=5)
    args = parser.parse_args()

    asyncio.run(inject_drift(args.url, args.rate, args.shift, args.duration, args.features))


if __name__ == "__main__":
    main()
