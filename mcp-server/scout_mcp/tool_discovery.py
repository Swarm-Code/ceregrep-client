"""Tool discovery system for MCP server."""

import os
import sys
import importlib
import inspect
from typing import List, Dict
from pathlib import Path
from .tools.base_tool import BaseTool


class ToolDiscovery:
    """Discovers and loads tools from the tools directory."""

    def __init__(self, tools_dir: str = "tools"):
        # Make tools_dir absolute relative to this file's location
        if not Path(tools_dir).is_absolute():
            tools_dir = Path(__file__).parent / tools_dir
        self.tools_dir = Path(tools_dir)
        self._tools: Dict[str, BaseTool] = {}
    
    def discover_tools(self) -> Dict[str, BaseTool]:
        """Discover all tools in the tools directory."""
        if not self.tools_dir.exists():
            return {}

        # Clear existing tools
        self._tools.clear()

        # Look for Python files in the tools directory
        for file_path in self.tools_dir.glob("*.py"):
            if file_path.name.startswith("_") or file_path.name == "base_tool.py":
                continue
                
            module_name = f"ceregrep_mcp.tools.{file_path.stem}"

            try:
                # Import the module
                module = importlib.import_module(module_name)

                # Find classes that inherit from BaseTool
                for name, obj in inspect.getmembers(module, inspect.isclass):
                    if (obj != BaseTool and
                        issubclass(obj, BaseTool) and
                        obj.__module__ == module_name):

                        # Instantiate the tool
                        tool_instance = obj()
                        self._tools[tool_instance.name] = tool_instance

            except Exception as e:
                # Silently skip tools that fail to load
                continue
        
        return self._tools
    
    def get_tool(self, name: str) -> BaseTool:
        """Get a specific tool by name."""
        return self._tools.get(name)
    
    def get_all_tools(self) -> List[BaseTool]:
        """Get all discovered tools."""
        return list(self._tools.values())
    
    def reload_tools(self) -> Dict[str, BaseTool]:
        """Reload all tools (useful for development)."""
        # Clear import cache for tools modules
        modules_to_remove = []
        for module_name in sys.modules:
            if module_name.startswith("tools."):
                modules_to_remove.append(module_name)
        
        for module_name in modules_to_remove:
            del sys.modules[module_name]
        
        return self.discover_tools()


# Global tool discovery instance
tool_discovery = ToolDiscovery()