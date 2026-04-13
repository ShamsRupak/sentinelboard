#!/usr/bin/env python3
"""Simulate realistic prediction traffic against SentinelBoard API."""
import argparse
import asyncio
import random
import time

import httpx


async def send_predictions(
    base_url: str,
    rate: float,
    duration: int,
    n_features: int,
) -> None:
    async with httpx.AsyncClient(timeout=10.0) as client:
        start = time.time()
        count = 0
        errors = 0

        while time.time() - start < duration:
            features = [random.gauss(0, 1) for _ in range(n_features)]

            try:
                resp = await client.post(
                    f"{base_url}/predict",
                    json={"features": features},
                )
                if resp.status_code == 200:
                    count += 1
                else:
                    errors += 1
            except Exception as e:
                errors += 1
                print(f"Error: {e}")

            await asyncio.sleep(1.0 / rate)

            if count % 100 == 0 and count > 0:
                elapsed = time.time() - start
                print(f"[{elapsed:.1f}s] Sent {count} predictions, {errors} errors")

        print(f"\nDone: {count} predictions in {duration}s ({count/duration:.1f} req/s)")


def main():
    parser = argparse.ArgumentParser(description="Simulate SentinelBoard traffic")
    parser.add_argument("--url", default="http://localhost:8000", help="API base URL")
    parser.add_argument("--rate", type=float, default=10.0, help="Requests per second")
    parser.add_argument("--duration", type=int, default=60, help="Duration in seconds")
    parser.add_argument("--features", type=int, default=5, help="Number of features")
    args = parser.parse_args()

    asyncio.run(send_predictions(args.url, args.rate, args.duration, args.features))


if __name__ == "__main__":
    main()
