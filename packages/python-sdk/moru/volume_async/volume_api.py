"""Async VolumeApi class with static methods for volume operations."""

from typing import List, Optional, Tuple

from typing_extensions import Unpack

from moru.api import handle_api_exception
from moru.api.client_async import get_api_client
from moru.connection_config import ApiParams, ConnectionConfig
from moru.exceptions import NotFoundException
from moru.volume.types import FileInfo, VolumeInfo


class AsyncVolumeApi:
    """Base class for async volume API operations."""

    @staticmethod
    async def _create_volume(
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
        client = api_client.get_async_httpx_client()

        response = await client.post(
            f"{config.api_url}/volumes",
            json={"name": name},
            timeout=config.request_timeout,
        )

        err = handle_api_exception(response)
        if err:
            raise err

        return VolumeInfo._from_api_response(response.json())

    @staticmethod
    async def _get_volume(
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
        client = api_client.get_async_httpx_client()

        response = await client.get(
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
    async def _list_volumes(
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
        client = api_client.get_async_httpx_client()

        params = {}
        if limit is not None:
            params["limit"] = limit
        if next_token is not None:
            params["nextToken"] = next_token

        response = await client.get(
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
    async def _delete_volume(
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
        client = api_client.get_async_httpx_client()

        response = await client.delete(
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
    async def _list_files(
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
        client = api_client.get_async_httpx_client()

        params = {"path": path}
        if limit is not None:
            params["limit"] = limit
        if next_token is not None:
            params["nextToken"] = next_token

        response = await client.get(
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
    async def _upload_file(
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
        client = api_client.get_async_httpx_client()

        response = await client.put(
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
    async def _download_file(
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
        client = api_client.get_async_httpx_client()

        response = await client.get(
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
    async def _delete_file(
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
        client = api_client.get_async_httpx_client()

        params: dict = {"path": path}
        if recursive:
            params["recursive"] = "true"

        response = await client.delete(
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
