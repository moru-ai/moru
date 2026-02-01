import os
import pytest
import uuid

from moru import AsyncSandbox, AsyncVolume


# Use MORU_TEMPLATE env var or default to "base"
# For local testing with JuiceFS, can set MORU_TEMPLATE=juicefs-vol-test-v2
TEMPLATE = os.environ.get("MORU_TEMPLATE", "base")


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
