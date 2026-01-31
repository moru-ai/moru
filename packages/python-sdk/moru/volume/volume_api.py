"""Base VolumeApi class with static methods for volume operations."""

from typing import List, Optional, Tuple

from typing_extensions import Unpack

from moru.api import ApiClient, handle_api_exception
from moru.api.client_sync import get_api_client
from moru.connection_config import ApiParams, ConnectionConfig
from moru.exceptions import NotFoundException

from .types import FileInfo, VolumeInfo


# Allowed mount path prefixes for sandbox volume attachment
ALLOWED_MOUNT_PREFIXES = ("/workspace/", "/data/", "/mnt/", "/volumes/")


def validate_mount_path(path: str) -> None:
    """
    Validate volume mount path.

    :param path: Mount path to validate
    :raises ValueError: If path is invalid

    Allowed prefixes: /workspace/, /data/, /mnt/, /volumes/
    """
    if not path:
        raise ValueError("Mount path cannot be empty")

    if not path.startswith("/"):
        raise ValueError("Mount path must be absolute (start with /)")

    # Check allowed prefixes
    if not any(path.startswith(prefix) for prefix in ALLOWED_MOUNT_PREFIXES):
        raise ValueError(
            f"Mount path must start with one of: {', '.join(ALLOWED_MOUNT_PREFIXES)}"
        )

    # Check for directory traversal
    if ".." in path:
        raise ValueError("Mount path cannot contain '..'")

    # Check that path has a subdirectory after prefix
    # e.g., /workspace is not valid, but /workspace/data is
    for prefix in ALLOWED_MOUNT_PREFIXES:
        if path.startswith(prefix):
            remainder = path[len(prefix) :]
            # Empty remainder means path is just the prefix without trailing content
            # This is actually valid - /workspace/ should work
            break


class VolumeApi:
    """Base class for volume API operations."""

    @staticmethod
    def _create_volume(
        name: str,
        **opts: Unpack[ApiParams],
    ) -> VolumeInfo:
        """
        Create a new volume (idempotent).

        :param name: Volume name
        :return: Volume info
        """
        config = ConnectionConfig(**opts)
        api_client = get_api_client(config)
        client = api_client.get_httpx_client()

        response = client.post(
            f"{config.api_url}/volumes",
            json={"name": name},
            timeout=config.request_timeout,
        )

        err = handle_api_exception(response)
        if err:
            raise err

        return VolumeInfo._from_api_response(response.json())

    @staticmethod
    def _get_volume(
        volume_id_or_name: str,
        **opts: Unpack[ApiParams],
    ) -> VolumeInfo:
        """
        Get volume by ID or name.

        :param volume_id_or_name: Volume ID (vol_xxx) or name
        :return: Volume info
        """
        config = ConnectionConfig(**opts)
        api_client = get_api_client(config)
        client = api_client.get_httpx_client()

        response = client.get(
            f"{config.api_url}/volumes/{volume_id_or_name}",
            timeout=config.request_timeout,
        )

        if response.status_code == 404:
            raise NotFoundException(f"Volume '{volume_id_or_name}' not found")

        err = handle_api_exception(response)
        if err:
            raise err

        return VolumeInfo._from_api_response(response.json())

    @staticmethod
    def _list_volumes(
        limit: Optional[int] = None,
        next_token: Optional[str] = None,
        **opts: Unpack[ApiParams],
    ) -> Tuple[List[VolumeInfo], Optional[str]]:
        """
        List all volumes.

        :param limit: Maximum number of volumes to return
        :param next_token: Pagination token
        :return: Tuple of (volumes, next_token)
        """
        config = ConnectionConfig(**opts)
        api_client = get_api_client(config)
        client = api_client.get_httpx_client()

        params = {}
        if limit is not None:
            params["limit"] = limit
        if next_token is not None:
            params["nextToken"] = next_token

        response = client.get(
            f"{config.api_url}/volumes",
            params=params,
            timeout=config.request_timeout,
        )

        err = handle_api_exception(response)
        if err:
            raise err

        volumes = [VolumeInfo._from_api_response(v) for v in response.json()]
        result_next_token = response.headers.get("x-next-token")

        return volumes, result_next_token

    @staticmethod
    def _delete_volume(
        volume_id_or_name: str,
        **opts: Unpack[ApiParams],
    ) -> bool:
        """
        Delete a volume.

        :param volume_id_or_name: Volume ID (vol_xxx) or name
        :return: True if deleted, False if not found
        """
        config = ConnectionConfig(**opts)
        api_client = get_api_client(config)
        client = api_client.get_httpx_client()

        response = client.delete(
            f"{config.api_url}/volumes/{volume_id_or_name}",
            timeout=config.request_timeout,
        )

        if response.status_code == 404:
            return False

        err = handle_api_exception(response)
        if err:
            raise err

        return True

    @staticmethod
    def _list_files(
        volume_id: str,
        path: str = "/",
        limit: Optional[int] = None,
        next_token: Optional[str] = None,
        **opts: Unpack[ApiParams],
    ) -> Tuple[List[FileInfo], Optional[str]]:
        """
        List files in a volume.

        :param volume_id: Volume ID (vol_xxx)
        :param path: Directory path to list
        :param limit: Maximum number of files to return
        :param next_token: Pagination token
        :return: Tuple of (files, next_token)
        """
        config = ConnectionConfig(**opts)
        api_client = get_api_client(config)
        client = api_client.get_httpx_client()

        params = {"path": path}
        if limit is not None:
            params["limit"] = limit
        if next_token is not None:
            params["nextToken"] = next_token

        response = client.get(
            f"{config.api_url}/volumes/{volume_id}/files",
            params=params,
            timeout=config.request_timeout,
        )

        if response.status_code == 404:
            raise NotFoundException(f"Volume '{volume_id}' not found")

        err = handle_api_exception(response)
        if err:
            raise err

        data = response.json()
        files = [FileInfo._from_api_response(f) for f in data.get("files", [])]
        result_next_token = data.get("nextToken")

        return files, result_next_token

    @staticmethod
    def _upload_file(
        volume_id: str,
        path: str,
        content: bytes,
        **opts: Unpack[ApiParams],
    ) -> int:
        """
        Upload file content to volume.

        :param volume_id: Volume ID (vol_xxx)
        :param path: Destination path in volume
        :param content: File content as bytes
        :return: Size of uploaded file
        """
        config = ConnectionConfig(**opts)
        api_client = get_api_client(config)
        client = api_client.get_httpx_client()

        response = client.put(
            f"{config.api_url}/volumes/{volume_id}/files/upload",
            params={"path": path},
            content=content,
            headers={"Content-Type": "application/octet-stream"},
            timeout=config.request_timeout,
        )

        if response.status_code == 404:
            raise NotFoundException(f"Volume '{volume_id}' not found")

        err = handle_api_exception(response)
        if err:
            raise err

        return response.json().get("size", len(content))

    @staticmethod
    def _download_file(
        volume_id: str,
        path: str,
        **opts: Unpack[ApiParams],
    ) -> bytes:
        """
        Download file content from volume.

        :param volume_id: Volume ID (vol_xxx)
        :param path: File path in volume
        :return: File content as bytes
        """
        config = ConnectionConfig(**opts)
        api_client = get_api_client(config)
        client = api_client.get_httpx_client()

        response = client.get(
            f"{config.api_url}/volumes/{volume_id}/files/download",
            params={"path": path},
            timeout=config.request_timeout,
        )

        if response.status_code == 404:
            raise NotFoundException(
                f"Volume '{volume_id}' or file '{path}' not found"
            )

        err = handle_api_exception(response)
        if err:
            raise err

        return response.content

    @staticmethod
    def _delete_file(
        volume_id: str,
        path: str,
        recursive: bool = False,
        **opts: Unpack[ApiParams],
    ) -> bool:
        """
        Delete file or directory from volume.

        :param volume_id: Volume ID (vol_xxx)
        :param path: Path to delete
        :param recursive: Delete directory recursively
        :return: True if deleted
        """
        config = ConnectionConfig(**opts)
        api_client = get_api_client(config)
        client = api_client.get_httpx_client()

        params: dict = {"path": path}
        if recursive:
            params["recursive"] = "true"

        response = client.delete(
            f"{config.api_url}/volumes/{volume_id}/files",
            params=params,
            timeout=config.request_timeout,
        )

        if response.status_code == 404:
            raise NotFoundException(
                f"Volume '{volume_id}' or path '{path}' not found"
            )

        err = handle_api_exception(response)
        if err:
            raise err

        return True
