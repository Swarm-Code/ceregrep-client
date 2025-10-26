"""Scout Bridge - High-performance communication with Scout SDK."""

from .client import ScoutBridgeClient, ScoutBridgeError, get_bridge, shutdown_bridge

__all__ = ['ScoutBridgeClient', 'ScoutBridgeError', 'get_bridge', 'shutdown_bridge']
