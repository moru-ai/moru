import pytest
import uuid

from moru import AsyncVolume


@pytest.fixture
def unique_volume_name():
    """Generate a unique volume name for testing."""
    return f"test-vol-{uuid.uuid4().hex[:8]}"


@pytest.mark.skip_debug()
async def test_volume_create(unique_volume_name):
    """Test creating a new volume."""
    vol = await AsyncVolume.create(name=unique_volume_name)

    try:
        assert vol.volume_id.startswith("vol_")
        assert vol.name == unique_volume_name
        assert vol.total_size_bytes >= 0
        assert vol.total_file_count >= 0
    finally:
        await vol.delete()


@pytest.mark.skip_debug()
async def test_volume_create_idempotent(unique_volume_name):
    """Test that creating a volume with the same name returns the existing volume."""
    vol1 = await AsyncVolume.create(name=unique_volume_name)

    try:
        # Second create should return the same volume
        vol2 = await AsyncVolume.create(name=unique_volume_name)

        assert vol1.volume_id == vol2.volume_id
        assert vol1.name == vol2.name
    finally:
        await vol1.delete()


@pytest.mark.skip_debug()
async def test_volume_get_by_id(unique_volume_name):
    """Test getting a volume by ID."""
    created = await AsyncVolume.create(name=unique_volume_name)

    try:
        fetched = await AsyncVolume.get(created.volume_id)

        assert fetched.volume_id == created.volume_id
        assert fetched.name == created.name
    finally:
        await created.delete()


@pytest.mark.skip_debug()
async def test_volume_get_by_name(unique_volume_name):
    """Test getting a volume by name."""
    created = await AsyncVolume.create(name=unique_volume_name)

    try:
        fetched = await AsyncVolume.get(unique_volume_name)

        assert fetched.volume_id == created.volume_id
        assert fetched.name == unique_volume_name
    finally:
        await created.delete()


@pytest.mark.skip_debug()
async def test_volume_list(unique_volume_name):
    """Test listing volumes."""
    vol = await AsyncVolume.create(name=unique_volume_name)

    try:
        volumes = await AsyncVolume.list()

        # Find our created volume in the list
        found = False
        for v in volumes:
            if v.volume_id == vol.volume_id:
                found = True
                assert v.name == unique_volume_name
                break

        assert found, "Created volume should be in list"
    finally:
        await vol.delete()


@pytest.mark.skip_debug()
async def test_volume_delete(unique_volume_name):
    """Test deleting a volume."""
    vol = await AsyncVolume.create(name=unique_volume_name)

    # Delete should succeed
    result = await vol.delete()
    assert result is True

    # Get should fail with NotFoundError
    from moru.exceptions import NotFoundException

    with pytest.raises(NotFoundException):
        await AsyncVolume.get(vol.volume_id)


@pytest.mark.skip_debug()
async def test_volume_get_info(unique_volume_name):
    """Test getting updated volume info."""
    vol = await AsyncVolume.create(name=unique_volume_name)

    try:
        info = await vol.get_info()

        assert info.volume_id == vol.volume_id
        assert info.name == unique_volume_name
        assert info.total_size_bytes >= 0
        assert info.total_file_count >= 0
        assert info.created_at is not None
        assert info.updated_at is not None
    finally:
        await vol.delete()
