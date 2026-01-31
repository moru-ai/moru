"""Asynchronous Volume class for persistent storage operations."""

from typing import BinaryIO, List, Optional, Union

from typing_extensions import Self, Unpack

from moru.connection_config import ApiParams, ConnectionConfig
from moru.volume.types import FileInfo, VolumeInfo
from moru.volume_async.volume_api import AsyncVolumeApi


class AsyncVolume:
    """
    Moru async volume is persistent storage for sandboxes.

    Volumes provide crash-durable file storage that persists across sandbox
    lifecycle. Data is accessible even when no sandbox is running.

    Use `await AsyncVolume.create()` to create a new volume (idempotent).

    Example:
    ```python
    from moru import AsyncVolume, AsyncSandbox

    # Create a volume (idempotent - returns existing if name matches)
    vol = await AsyncVolume.create(name="my-workspace")

    # Attach to sandbox
    sbx = await AsyncSandbox.create(
        template="base",
        volume_id=vol.volume_id,
        volume_mount_path="/workspace",
    )

    # Work with files
    files = await vol.list_files("/")
    await vol.upload("/data/input.csv", b"col1,col2\\n1,2\\n")
    content = await vol.download("/output/result.csv")

    # Delete volume
    await vol.delete()
    ```
    """

    def __init__(
        self,
        volume_id: str,
        name: str,
        total_size_bytes: int = 0,
        total_file_count: int = 0,
        connection_config: Optional[ConnectionConfig] = None,
        **opts: Unpack[ApiParams],
    ):
        """
        Initialize an AsyncVolume instance.

        :param volume_id: Unique volume identifier
        :param name: Volume name
        :param total_size_bytes: Total size of files in volume
        :param total_file_count: Total number of files in volume
        :param connection_config: Connection configuration
        """
        self._volume_id = volume_id
        self._name = name
        self._total_size_bytes = total_size_bytes
        self._total_file_count = total_file_count
        self._connection_config = connection_config or ConnectionConfig(**opts)

    @property
    def volume_id(self) -> str:
        """Unique volume identifier."""
        return self._volume_id

    @property
    def name(self) -> str:
        """Volume name."""
        return self._name

    @property
    def total_size_bytes(self) -> int:
        """Total size of files in volume (bytes)."""
        return self._total_size_bytes

    @property
    def total_file_count(self) -> int:
        """Total number of files in volume."""
        return self._total_file_count

    @classmethod
    async def create(
        cls,
        name: str,
        **opts: Unpack[ApiParams],
    ) -> Self:
        """
        Create a new volume (idempotent).

        If a volume with the same name already exists for this team,
        the existing volume is returned.

        :param name: Volume name (unique per team, slug format: lowercase, hyphens)

        :return: AsyncVolume instance

        Example:
        ```python
        vol = await AsyncVolume.create(name="my-workspace")
        print(f"Volume: {vol.volume_id}")
        ```
        """
        info = await AsyncVolumeApi._create_volume(name=name, **opts)

        return cls(
            volume_id=info.volume_id,
            name=info.name,
            total_size_bytes=info.total_size_bytes,
            total_file_count=info.total_file_count,
            **opts,
        )

    @classmethod
    async def get(
        cls,
        volume_id_or_name: str,
        **opts: Unpack[ApiParams],
    ) -> Self:
        """
        Get a volume by ID or name.

        :param volume_id_or_name: Volume ID (vol_xxx) or name

        :return: AsyncVolume instance

        Example:
        ```python
        vol = await AsyncVolume.get("vol_abc123")
        # or
        vol = await AsyncVolume.get("my-workspace")
        ```
        """
        info = await AsyncVolumeApi._get_volume(
            volume_id_or_name=volume_id_or_name, **opts
        )

        return cls(
            volume_id=info.volume_id,
            name=info.name,
            total_size_bytes=info.total_size_bytes,
            total_file_count=info.total_file_count,
            **opts,
        )

    @staticmethod
    async def list(**opts: Unpack[ApiParams]) -> List[VolumeInfo]:
        """
        List all volumes.

        :return: List of volume info objects

        Example:
        ```python
        volumes = await AsyncVolume.list()
        for vol in volumes:
            print(f"{vol.name}: {vol.total_size_bytes} bytes")
        ```
        """
        volumes, _ = await AsyncVolumeApi._list_volumes(**opts)
        return volumes

    async def delete(self, **opts: Unpack[ApiParams]) -> bool:
        """
        Delete the volume.

        :return: True if deleted, False if not found

        Example:
        ```python
        vol = await AsyncVolume.create(name="temp-workspace")
        await vol.delete()
        ```
        """
        return await AsyncVolumeApi._delete_volume(
            volume_id_or_name=self._volume_id,
            **self._connection_config.get_api_params(**opts),
        )

    async def get_info(self, **opts: Unpack[ApiParams]) -> VolumeInfo:
        """
        Get updated volume information.

        :return: Volume info with current size and file count

        Example:
        ```python
        vol = await AsyncVolume.get("my-workspace")
        info = await vol.get_info()
        print(f"Size: {info.total_size_bytes} bytes, Files: {info.total_file_count}")
        ```
        """
        info = await AsyncVolumeApi._get_volume(
            volume_id_or_name=self._volume_id,
            **self._connection_config.get_api_params(**opts),
        )

        # Update cached values
        self._total_size_bytes = info.total_size_bytes
        self._total_file_count = info.total_file_count

        return info

    async def list_files(
        self,
        path: str = "/",
        **opts: Unpack[ApiParams],
    ) -> List[FileInfo]:
        """
        List files and directories at a path.

        Works even while volume is attached to a sandbox.

        :param path: Directory path to list (default: "/")

        :return: List of file info objects

        Example:
        ```python
        files = await vol.list_files("/src")
        for f in files:
            print(f"{f.name} ({f.type})")
        ```
        """
        files, _ = await AsyncVolumeApi._list_files(
            volume_id=self._volume_id,
            path=path,
            **self._connection_config.get_api_params(**opts),
        )
        return files

    async def upload(
        self,
        path: str,
        content: Union[bytes, BinaryIO],
        **opts: Unpack[ApiParams],
    ) -> None:
        """
        Upload file content to the volume.

        Creates parent directories as needed. Works even while volume
        is attached to a sandbox - changes are visible immediately.

        :param path: Destination path in volume
        :param content: File content as bytes or file-like object

        Example:
        ```python
        await vol.upload("/data/input.csv", b"col1,col2\\n1,2\\n")

        # Or with a file
        with open("local_file.txt", "rb") as f:
            await vol.upload("/remote/file.txt", f.read())
        ```
        """
        if hasattr(content, "read"):
            content = content.read()

        await AsyncVolumeApi._upload_file(
            volume_id=self._volume_id,
            path=path,
            content=content,
            **self._connection_config.get_api_params(**opts),
        )

    async def download(
        self,
        path: str,
        **opts: Unpack[ApiParams],
    ) -> bytes:
        """
        Download file content from the volume.

        Works even while volume is attached to a sandbox.

        :param path: File path in volume

        :return: File content as bytes

        Example:
        ```python
        content = await vol.download("/output/result.csv")
        print(content.decode("utf-8"))
        ```
        """
        return await AsyncVolumeApi._download_file(
            volume_id=self._volume_id,
            path=path,
            **self._connection_config.get_api_params(**opts),
        )

    async def delete_file(
        self,
        path: str,
        recursive: bool = False,
        **opts: Unpack[ApiParams],
    ) -> bool:
        """
        Delete file or directory from the volume.

        :param path: Path to delete
        :param recursive: Delete directory recursively

        :return: True if deleted

        Example:
        ```python
        await vol.delete_file("/temp/cache.txt")
        await vol.delete_file("/temp/", recursive=True)
        ```
        """
        return await AsyncVolumeApi._delete_file(
            volume_id=self._volume_id,
            path=path,
            recursive=recursive,
            **self._connection_config.get_api_params(**opts),
        )

    def __repr__(self) -> str:
        return f"AsyncVolume(volume_id={self._volume_id!r}, name={self._name!r})"
