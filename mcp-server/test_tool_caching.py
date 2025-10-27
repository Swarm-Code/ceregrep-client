#!/usr/bin/env python3
"""
Test suite for tool discovery caching optimization.

Tests the intelligent caching mechanism that tracks file modification times
to avoid unnecessary file system scans and module imports.
"""

import sys
import time
import tempfile
import shutil
from pathlib import Path

# Add mcp-server to path
sys.path.insert(0, str(Path(__file__).parent))

from scout_mcp.tool_discovery import ToolDiscovery


def create_test_tool(tools_dir: Path, name: str, tool_name: str) -> Path:
    """Create a test tool file."""
    tool_content = f'''
from scout_mcp.tools.base_tool import BaseTool
from typing import Dict, Any, List
from mcp.types import TextContent

class {name}(BaseTool):
    @property
    def name(self) -> str:
        return "{tool_name}"

    @property
    def description(self) -> str:
        return "Test tool {name}"

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {{"type": "object", "properties": {{}}, "required": []}}

    async def execute(self, arguments: Dict[str, Any]) -> List[TextContent]:
        return [TextContent(type="text", text="Test result")]
'''

    tool_file = tools_dir / f"{name.lower()}.py"
    tool_file.write_text(tool_content)
    return tool_file


def test_basic_caching():
    """Test that tools are cached on subsequent calls."""
    print("=" * 60)
    print("TEST 1: Basic Caching")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        tools_dir = Path(tmpdir) / "tools"
        tools_dir.mkdir()

        # Create a test tool
        create_test_tool(tools_dir, "TestTool1", "test_tool_1")

        # Create discovery instance
        discovery = ToolDiscovery(str(tools_dir))

        # First call - should be a cache miss
        print("First discovery call (cache miss)...")
        start = time.time()
        tools1 = discovery.discover_tools()
        time1 = time.time() - start

        stats1 = discovery.get_cache_stats()
        print(f"  Time: {time1*1000:.2f}ms")
        print(f"  Tools found: {len(tools1)}")
        print(f"  Cache stats: {stats1}")

        # Second call - should be a cache hit
        print("\nSecond discovery call (cache hit)...")
        start = time.time()
        tools2 = discovery.discover_tools()
        time2 = time.time() - start

        stats2 = discovery.get_cache_stats()
        print(f"  Time: {time2*1000:.2f}ms")
        print(f"  Tools found: {len(tools2)}")
        print(f"  Cache stats: {stats2}")

        # Verify caching worked
        assert len(tools1) == len(tools2) == 1, "Should find 1 tool"
        assert stats2['cache_hits'] == 1, "Should have 1 cache hit"
        assert time2 < time1, f"Cached call should be faster: {time2:.4f}s vs {time1:.4f}s"

        speedup = time1 / time2 if time2 > 0 else float('inf')
        print(f"\n✓ Cache speedup: {speedup:.1f}x faster")
        print(f"✓ Test passed!")


def test_modification_detection():
    """Test that file modifications are detected."""
    print("\n" + "=" * 60)
    print("TEST 2: Modification Detection")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        tools_dir = Path(tmpdir) / "tools"
        tools_dir.mkdir()

        # Create a test tool
        tool_file = create_test_tool(tools_dir, "TestTool2", "test_tool_2")

        discovery = ToolDiscovery(str(tools_dir))

        # First discovery
        print("Initial discovery...")
        tools1 = discovery.discover_tools()
        print(f"  Found {len(tools1)} tools")

        # Wait a bit to ensure different mtime
        time.sleep(0.1)

        # Modify the tool file
        print("\nModifying tool file...")
        tool_content = tool_file.read_text()
        tool_file.write_text(tool_content + "\n# Modified")

        # Should detect modification
        print("Discovery after modification...")
        tools2 = discovery.discover_tools()
        stats = discovery.get_cache_stats()

        print(f"  Found {len(tools2)} tools")
        print(f"  Cache misses: {stats['cache_misses']}")

        assert stats['cache_misses'] == 2, "Should have 2 cache misses (initial + modified)"
        print(f"\n✓ Modification detected correctly")
        print(f"✓ Test passed!")


def test_new_file_detection():
    """Test that new tool files are detected."""
    print("\n" + "=" * 60)
    print("TEST 3: New File Detection")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        tools_dir = Path(tmpdir) / "tools"
        tools_dir.mkdir()

        # Create first tool
        create_test_tool(tools_dir, "TestTool3a", "test_tool_3a")

        discovery = ToolDiscovery(str(tools_dir))

        # First discovery
        print("Initial discovery...")
        tools1 = discovery.discover_tools()
        print(f"  Found {len(tools1)} tools")

        # Add new tool
        print("\nAdding new tool file...")
        create_test_tool(tools_dir, "TestTool3b", "test_tool_3b")

        # Should detect new file
        print("Discovery after adding file...")
        tools2 = discovery.discover_tools()

        print(f"  Found {len(tools2)} tools")

        assert len(tools1) == 1, "Should initially have 1 tool"
        assert len(tools2) == 2, "Should now have 2 tools"
        print(f"\n✓ New file detected correctly")
        print(f"✓ Test passed!")


def test_deleted_file_detection():
    """Test that deleted files are detected."""
    print("\n" + "=" * 60)
    print("TEST 4: Deleted File Detection")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        tools_dir = Path(tmpdir) / "tools"
        tools_dir.mkdir()

        # Create two tools
        tool1 = create_test_tool(tools_dir, "TestTool4a", "test_tool_4a")
        tool2 = create_test_tool(tools_dir, "TestTool4b", "test_tool_4b")

        discovery = ToolDiscovery(str(tools_dir))

        # First discovery
        print("Initial discovery...")
        tools1 = discovery.discover_tools()
        print(f"  Found {len(tools1)} tools")

        # Delete one tool
        print("\nDeleting one tool file...")
        tool1.unlink()

        # Should detect deletion
        print("Discovery after deletion...")
        tools2 = discovery.discover_tools()

        print(f"  Found {len(tools2)} tools")

        assert len(tools1) == 2, "Should initially have 2 tools"
        assert len(tools2) == 1, "Should now have 1 tool"
        print(f"\n✓ Deleted file detected correctly")
        print(f"✓ Test passed!")


def test_force_reload():
    """Test force reload functionality."""
    print("\n" + "=" * 60)
    print("TEST 5: Force Reload")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        tools_dir = Path(tmpdir) / "tools"
        tools_dir.mkdir()

        create_test_tool(tools_dir, "TestTool5", "test_tool_5")

        discovery = ToolDiscovery(str(tools_dir))

        # Normal discovery
        print("Normal discovery...")
        discovery.discover_tools()
        stats1 = discovery.get_cache_stats()
        print(f"  Cache misses: {stats1['cache_misses']}")

        # Cached discovery
        print("\nCached discovery...")
        discovery.discover_tools()
        stats2 = discovery.get_cache_stats()
        print(f"  Cache hits: {stats2['cache_hits']}")

        # Force reload
        print("\nForce reload...")
        discovery.discover_tools(force_reload=True)
        stats3 = discovery.get_cache_stats()
        print(f"  Cache misses after force: {stats3['cache_misses']}")

        assert stats2['cache_hits'] == 1, "Should have 1 cache hit"
        assert stats3['cache_misses'] == stats1['cache_misses'] + 1, "Force reload should cause cache miss"
        print(f"\n✓ Force reload works correctly")
        print(f"✓ Test passed!")


def test_cache_invalidation():
    """Test manual cache invalidation."""
    print("\n" + "=" * 60)
    print("TEST 6: Cache Invalidation")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        tools_dir = Path(tmpdir) / "tools"
        tools_dir.mkdir()

        create_test_tool(tools_dir, "TestTool6", "test_tool_6")

        discovery = ToolDiscovery(str(tools_dir))

        # Build cache
        print("Building cache...")
        discovery.discover_tools()
        discovery.discover_tools()  # Cache hit
        stats1 = discovery.get_cache_stats()
        print(f"  Cache hits: {stats1['cache_hits']}")

        # Invalidate
        print("\nInvalidating cache...")
        discovery.invalidate_cache()
        stats2 = discovery.get_cache_stats()
        print(f"  Cache hits after invalidation: {stats2['cache_hits']}")
        print(f"  Cached tools: {stats2['cached_tools']}")

        assert stats1['cache_hits'] > 0, "Should have cache hits before invalidation"
        assert stats2['cache_hits'] == 0, "Cache stats should be reset"
        assert stats2['cached_tools'] == 0, "Tools should be cleared"
        print(f"\n✓ Cache invalidation works correctly")
        print(f"✓ Test passed!")


def test_performance_benchmark():
    """Benchmark cache performance."""
    print("\n" + "=" * 60)
    print("TEST 7: Performance Benchmark")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        tools_dir = Path(tmpdir) / "tools"
        tools_dir.mkdir()

        # Create multiple tools
        num_tools = 5
        print(f"Creating {num_tools} test tools...")
        for i in range(num_tools):
            create_test_tool(tools_dir, f"TestTool{i}", f"test_tool_{i}")

        discovery = ToolDiscovery(str(tools_dir))

        # Benchmark uncached
        print("\nBenchmarking uncached discovery...")
        times_uncached = []
        for i in range(3):
            discovery.invalidate_cache()
            start = time.time()
            discovery.discover_tools()
            elapsed = time.time() - start
            times_uncached.append(elapsed)

        avg_uncached = sum(times_uncached) / len(times_uncached)
        print(f"  Average uncached time: {avg_uncached*1000:.2f}ms")

        # Benchmark cached
        print("\nBenchmarking cached discovery...")
        discovery.discover_tools()  # Warm up cache
        times_cached = []
        for i in range(10):
            start = time.time()
            discovery.discover_tools()
            elapsed = time.time() - start
            times_cached.append(elapsed)

        avg_cached = sum(times_cached) / len(times_cached)
        print(f"  Average cached time: {avg_cached*1000:.2f}ms")

        # Stats
        stats = discovery.get_cache_stats()
        speedup = avg_uncached / avg_cached if avg_cached > 0 else float('inf')

        print(f"\n  Cache statistics:")
        print(f"    Hit rate: {stats['hit_rate_percent']:.1f}%")
        print(f"    Cache hits: {stats['cache_hits']}")
        print(f"    Cache misses: {stats['cache_misses']}")
        print(f"    Speedup: {speedup:.1f}x faster")

        assert speedup > 2, f"Cache should be at least 2x faster, got {speedup:.1f}x"
        print(f"\n✓ Performance improvement verified")
        print(f"✓ Test passed!")


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("TOOL DISCOVERY CACHING TEST SUITE")
    print("=" * 60 + "\n")

    tests = [
        ("Basic Caching", test_basic_caching),
        ("Modification Detection", test_modification_detection),
        ("New File Detection", test_new_file_detection),
        ("Deleted File Detection", test_deleted_file_detection),
        ("Force Reload", test_force_reload),
        ("Cache Invalidation", test_cache_invalidation),
        ("Performance Benchmark", test_performance_benchmark),
    ]

    passed = 0
    failed = 0

    for name, test_func in tests:
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

    # Summary
    print("\n" + "=" * 60)
    print(f"TEST SUMMARY: {passed} passed, {failed} failed")
    print("=" * 60)

    if failed == 0:
        print("\n✓ All tests passed!")
        return 0
    else:
        print(f"\n✗ {failed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
