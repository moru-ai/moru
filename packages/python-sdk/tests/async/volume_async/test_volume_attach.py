import asyncio
import os
import pytest
import uuid

from moru import AsyncSandbox, AsyncVolume


# Use MORU_TEMPLATE env var or default to "base"
# For local testing with JuiceFS, can set MORU_TEMPLATE=juicefs-vol-test-v2
TEMPLATE = os.environ.get("MORU_TEMPLATE", "base")


async def wait_for_mount(sbx: AsyncSandbox, path: str, timeout: float = 30) -> bool:
    """
    Wait for volume mount to be ready.

    Volume mounts asynchronously after Sandbox.create() returns.
    There's typically a 2-3 second gap. See limitations.md.
    """
    interval = 0.5
    elapsed = 0.0
    while elapsed < timeout:
        result = await sbx.commands.run(f"mountpoint -q {path} && echo M || echo N")
        if "M" in result.stdout:
            return True
        await asyncio.sleep(interval)
        elapsed += interval
    return False


@pytest.fixture
def unique_volume_name():
    """Generate a unique volume name for testing."""
    return f"test-attach-{uuid.uuid4().hex[:8]}"


@pytest.fixture
async def volume(unique_volume_name):
    """Create a volume for testing and clean up after."""
    vol = await AsyncVolume.create(name=unique_volume_name)
    yield vol
    try:
        await vol.delete()
    except Exception:
        pass


@pytest.mark.skip_debug()
async def test_sandbox_with_volume(volume):
    """Test creating a sandbox with a volume attached."""
    sbx = await AsyncSandbox.create(
        TEMPLATE,
        volume_id=volume.volume_id,
        volume_mount_path="/workspace/data",
        timeout=60,
    )

    try:
        assert await sbx.is_running()

        # Wait for volume mount (async mount has ~2-3s delay)
        mount_ready = await wait_for_mount(sbx, "/workspace/data")
        assert mount_ready, "Volume mount did not become ready in time"

        # Verify the mount path exists
        result = await sbx.commands.run("ls -la /workspace/data")
        assert result.exit_code == 0
    finally:
        await sbx.kill()


@pytest.mark.skip_debug()
async def test_sandbox_volume_file_persistence(volume):
    """Test that files written to volume persist across sandbox restarts."""
    test_content = f"test-content-{uuid.uuid4().hex[:8]}"

    # Create first sandbox and write a file
    sbx1 = await AsyncSandbox.create(
        TEMPLATE,
        volume_id=volume.volume_id,
        volume_mount_path="/workspace/data",
        timeout=60,
    )

    try:
        # Wait for volume mount (async mount has ~2-3s delay)
        mount_ready = await wait_for_mount(sbx1, "/workspace/data")
        assert mount_ready, "Volume mount did not become ready in time"

        await sbx1.commands.run(f"echo '{test_content}' > /workspace/data/test.txt")
    finally:
        await sbx1.kill()

    # Create second sandbox and read the file
    sbx2 = await AsyncSandbox.create(
        TEMPLATE,
        volume_id=volume.volume_id,
        volume_mount_path="/workspace/data",
        timeout=60,
    )

    try:
        # Wait for volume mount (async mount has ~2-3s delay)
        mount_ready = await wait_for_mount(sbx2, "/workspace/data")
        assert mount_ready, "Volume mount did not become ready in time"

        result = await sbx2.commands.run("cat /workspace/data/test.txt")
        assert result.exit_code == 0
        assert test_content in result.stdout
    finally:
        await sbx2.kill()


@pytest.mark.skip_debug()
async def test_sandbox_volume_invalid_mount_path(volume):
    """Test that invalid mount paths are rejected."""
    with pytest.raises(ValueError) as exc_info:
        await AsyncSandbox.create(
            TEMPLATE,
            volume_id=volume.volume_id,
            volume_mount_path="/etc/passwd",  # Invalid - not an allowed prefix
            timeout=60,
        )

    assert "must start with one of" in str(exc_info.value)


@pytest.mark.skip_debug()
async def test_sandbox_volume_missing_mount_path(volume):
    """Test that volume_id without mount_path is rejected."""
    with pytest.raises(ValueError) as exc_info:
        await AsyncSandbox.create(
            TEMPLATE,
            volume_id=volume.volume_id,
            # Missing volume_mount_path
            timeout=60,
        )

    assert "volume_mount_path is required" in str(exc_info.value)
