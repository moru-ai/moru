"""Synchronous Volume class for persistent storage operations."""

from typing import BinaryIO, List, Optional, Union

from typing_extensions import Self, Unpack

from moru.connection_config import ApiParams, ConnectionConfig
from moru.volume.types import FileInfo, VolumeInfo
from moru.volume.volume_api import VolumeApi


class Volume:
    """
    Moru volume is persistent storage for sandboxes.

    Volumes provide crash-durable file storage that persists across sandbox
    lifecycle. Data is accessible even when no sandbox is running.

    Use `Volume.create()` to create a new volume (idempotent).

    Example:
    ```python
    from moru import Volume, Sandbox

    # Create a volume (idempotent - returns existing if name matches)
    vol = Volume.create(name="my-workspace")

    # Attach to sandbox
    sbx = Sandbox.create(
        template="base",
        volume_id=vol.volume_id,
        volume_mount_path="/workspace",
    )

    # Work with files
    files = vol.list_files("/")
    vol.upload("/data/input.csv", b"col1,col2\\n1,2\\n")
    content = vol.download("/output/result.csv")

    # Delete volume
    vol.delete()
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
        Initialize a Volume instance.

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
    def create(
        cls,
        name: str,
        **opts: Unpack[ApiParams],
    ) -> Self:
        """
        Create a new volume (idempotent).

        If a volume with the same name already exists for this team,
        the existing volume is returned.

        :param name: Volume name (unique per team, slug format: lowercase, hyphens)

        :return: Volume instance

        Example:
        ```python
        vol = Volume.create(name="my-workspace")
        print(f"Volume: {vol.volume_id}")
        ```
        """
        info = VolumeApi._create_volume(name=name, **opts)

        return cls(
            volume_id=info.volume_id,
            name=info.name,
            total_size_bytes=info.total_size_bytes,
            total_file_count=info.total_file_count,
            **opts,
        )

    @classmethod
    def get(
        cls,
        volume_id_or_name: str,
        **opts: Unpack[ApiParams],
    ) -> Self:
        """
        Get a volume by ID or name.

        :param volume_id_or_name: Volume ID (vol_xxx) or name

        :return: Volume instance

        Example:
        ```python
        vol = Volume.get("vol_abc123")
        # or
        vol = Volume.get("my-workspace")
        ```
        """
        info = VolumeApi._get_volume(volume_id_or_name=volume_id_or_name, **opts)

        return cls(
            volume_id=info.volume_id,
            name=info.name,
            total_size_bytes=info.total_size_bytes,
            total_file_count=info.total_file_count,
            **opts,
        )

    @staticmethod
    def list(**opts: Unpack[ApiParams]) -> List[VolumeInfo]:
        """
        List all volumes.

        :return: List of volume info objects

        Example:
        ```python
        volumes = Volume.list()
        for vol in volumes:
            print(f"{vol.name}: {vol.total_size_bytes} bytes")
        ```
        """
        volumes, _ = VolumeApi._list_volumes(**opts)
        return volumes

    def delete(self, **opts: Unpack[ApiParams]) -> bool:
        """
        Delete the volume.

        :return: True if deleted, False if not found

        Example:
        ```python
        vol = Volume.create(name="temp-workspace")
        vol.delete()
        ```
        """
        return VolumeApi._delete_volume(
            volume_id_or_name=self._volume_id,
            **self._connection_config.get_api_params(**opts),
        )

    def get_info(self, **opts: Unpack[ApiParams]) -> VolumeInfo:
        """
        Get updated volume information.

        :return: Volume info with current size and file count

        Example:
        ```python
        vol = Volume.get("my-workspace")
        info = vol.get_info()
        print(f"Size: {info.total_size_bytes} bytes, Files: {info.total_file_count}")
        ```
        """
        info = VolumeApi._get_volume(
            volume_id_or_name=self._volume_id,
            **self._connection_config.get_api_params(**opts),
        )

        # Update cached values
        self._total_size_bytes = info.total_size_bytes
        self._total_file_count = info.total_file_count

        return info

    def list_files(
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
        files = vol.list_files("/src")
        for f in files:
            print(f"{f.name} ({f.type})")
        ```
        """
        files, _ = VolumeApi._list_files(
            volume_id=self._volume_id,
            path=path,
            **self._connection_config.get_api_params(**opts),
        )
        return files

    def upload(
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
        vol.upload("/data/input.csv", b"col1,col2\\n1,2\\n")

        # Or with a file
        with open("local_file.txt", "rb") as f:
            vol.upload("/remote/file.txt", f.read())
        ```
        """
        if hasattr(content, "read"):
            content = content.read()

        VolumeApi._upload_file(
            volume_id=self._volume_id,
            path=path,
            content=content,
            **self._connection_config.get_api_params(**opts),
        )

    def download(
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
        content = vol.download("/output/result.csv")
        print(content.decode("utf-8"))
        ```
        """
        return VolumeApi._download_file(
            volume_id=self._volume_id,
            path=path,
            **self._connection_config.get_api_params(**opts),
        )

    def delete_file(
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
        vol.delete_file("/temp/cache.txt")
        vol.delete_file("/temp/", recursive=True)
        ```
        """
        return VolumeApi._delete_file(
            volume_id=self._volume_id,
            path=path,
            recursive=recursive,
            **self._connection_config.get_api_params(**opts),
        )

    def __repr__(self) -> str:
        return f"Volume(volume_id={self._volume_id!r}, name={self._name!r})"
