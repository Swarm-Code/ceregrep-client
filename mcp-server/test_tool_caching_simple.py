#!/usr/bin/env python3
"""
Simple test for tool discovery caching without MCP dependencies.
Tests the core caching logic.
"""

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from scout_mcp.tool_discovery import ToolDiscovery


def test_cache_stats():
    """Test that cache statistics work."""
    print("=" * 60)
    print("TEST: Cache Statistics")
    print("=" * 60)

    # Create discovery with tools directory
    discovery = ToolDiscovery()

    # Get initial stats
    stats = discovery.get_cache_stats()
    print(f"Initial stats: {stats}")

    assert stats['cache_hits'] == 0, "Should start with 0 hits"
    assert stats['cache_misses'] == 0, "Should start with 0 misses"
    assert stats['hit_rate_percent'] == 0, "Should start with 0% hit rate"

    print("✓ Cache statistics initialized correctly")


def test_discover_tools_basic():
    """Test basic tool discovery."""
    print("\n" + "=" * 60)
    print("TEST: Basic Tool Discovery")
    print("=" * 60)

    discovery = ToolDiscovery()

    # First call
    print("First discovery call...")
    start = time.time()
    tools1 = discovery.discover_tools()
    time1 = time.time() - start

    stats1 = discovery.get_cache_stats()
    print(f"  Time: {time1*1000:.2f}ms")
    print(f"  Tools found: {len(tools1)}")
    print(f"  Stats: {stats1}")

    # Second call (should use cache)
    print("\nSecond discovery call (should be cached)...")
    start = time.time()
    tools2 = discovery.discover_tools()
    time2 = time.time() - start

    stats2 = discovery.get_cache_stats()
    print(f"  Time: {time2*1000:.2f}ms")
    print(f"  Tools found: {len(tools2)}")
    print(f"  Stats: {stats2}")

    # Verify caching
    assert len(tools1) == len(tools2), "Should find same number of tools"
    assert stats2['cache_hits'] >= 1, "Should have at least 1 cache hit"

    if time1 > 0 and time2 > 0:
        speedup = time1 / time2
        print(f"\n✓ Cache speedup: {speedup:.1f}x")

    print("✓ Basic caching works")


def test_force_reload():
    """Test force reload."""
    print("\n" + "=" * 60)
    print("TEST: Force Reload")
    print("=" * 60)

    discovery = ToolDiscovery()

    # Normal discovery
    tools1 = discovery.discover_tools()
    stats1 = discovery.get_cache_stats()
    print(f"After first call: {stats1['cache_misses']} misses")

    # Cached call
    tools2 = discovery.discover_tools()
    stats2 = discovery.get_cache_stats()
    print(f"After cached call: {stats2['cache_hits']} hits")

    # Force reload
    tools3 = discovery.discover_tools(force_reload=True)
    stats3 = discovery.get_cache_stats()
    print(f"After force reload: {stats3['cache_misses']} misses")

    assert stats3['cache_misses'] > stats1['cache_misses'], "Force reload should cause cache miss"

    print("✓ Force reload works")


def test_invalidate_cache():
    """Test cache invalidation."""
    print("\n" + "=" * 60)
    print("TEST: Cache Invalidation")
    print("=" * 60)

    discovery = ToolDiscovery()

    # Build cache
    discovery.discover_tools()
    discovery.discover_tools()
    stats1 = discovery.get_cache_stats()
    print(f"Before invalidation: {stats1}")

    # Invalidate
    discovery.invalidate_cache()
    stats2 = discovery.get_cache_stats()
    print(f"After invalidation: {stats2}")

    assert stats2['cache_hits'] == 0, "Stats should be reset"
    assert stats2['cached_tools'] == 0, "Tools should be cleared"

    print("✓ Cache invalidation works")


def test_repeated_calls_performance():
    """Test performance with repeated calls."""
    print("\n" + "=" * 60)
    print("TEST: Repeated Calls Performance")
    print("=" * 60)

    discovery = ToolDiscovery()

    # Warm up
    discovery.discover_tools()

    # Benchmark multiple cached calls
    print("Running 10 cached discovery calls...")
    times = []
    for i in range(10):
        start = time.time()
        discovery.discover_tools()
        elapsed = time.time() - start
        times.append(elapsed)

    avg_time = sum(times) / len(times)
    min_time = min(times)
    max_time = max(times)

    stats = discovery.get_cache_stats()

    print(f"\n  Results:")
    print(f"    Average time: {avg_time*1000:.2f}ms")
    print(f"    Min time: {min_time*1000:.2f}ms")
    print(f"    Max time: {max_time*1000:.2f}ms")
    print(f"    Hit rate: {stats['hit_rate_percent']:.1f}%")
    print(f"    Total hits: {stats['cache_hits']}")

    assert stats['cache_hits'] >= 10, "Should have at least 10 cache hits"
    assert stats['hit_rate_percent'] > 50, "Hit rate should be > 50%"

    print("✓ Repeated calls use cache efficiently")


def main():
    """Run all tests."""
    print("\nTOOL DISCOVERY CACHING - SIMPLE TEST SUITE\n")

    tests = [
        test_cache_stats,
        test_discover_tools_basic,
        test_force_reload,
        test_invalidate_cache,
        test_repeated_calls_performance,
    ]

    passed = 0
    failed = 0

    for test_func in tests:
        try:
            test_func()
            passed += 1
        except AssertionError as e:
            print(f"\n✗ Test failed: {e}")
            failed += 1
        except Exception as e:
            print(f"\n✗ Test error: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print("\n" + "=" * 60)
    print(f"SUMMARY: {passed} passed, {failed} failed")
    print("=" * 60)

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
