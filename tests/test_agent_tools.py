from src.agent.tools import tool_read_file


def test_read_file_ok():
    result = tool_read_file("README.md")
    assert result["ok"] is True
    assert "local chud" in result["content"]


def test_read_file_traversal_blocked():
    try:
        tool_read_file("../../../etc/passwd")
        blocked = False
    except PermissionError:
        blocked = True
    assert blocked
