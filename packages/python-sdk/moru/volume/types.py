"""Volume type definitions."""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional


class FileType(str, Enum):
    """Type of file system entry."""

    FILE = "file"
    DIRECTORY = "directory"


@dataclass
class FileInfo:
    """Information about a file or directory in a volume."""

    name: str
    """File or directory name."""

    path: str
    """Full path within volume."""

    type: FileType
    """Entry type (file or directory)."""

    size: Optional[int] = None
    """File size in bytes (only for files)."""

    modified_at: Optional[datetime] = None
    """Last modification time."""

    @classmethod
    def _from_api_response(cls, data: dict) -> "FileInfo":
        """Create FileInfo from API response data."""
        return cls(
            name=data["name"],
            path=data["path"],
            type=FileType(data["type"]),
            size=data.get("size"),
            modified_at=(
                datetime.fromisoformat(data["modifiedAt"].replace("Z", "+00:00"))
                if data.get("modifiedAt")
                else None
            ),
        )


@dataclass
class VolumeInfo:
    """Information about a volume."""

    volume_id: str
    """Unique volume identifier."""

    name: str
    """Volume name."""

    total_size_bytes: int
    """Total size of files in volume (bytes)."""

    total_file_count: int
    """Total number of files in volume."""

    created_at: datetime
    """When the volume was created."""

    updated_at: datetime
    """When the volume was last updated."""

    @classmethod
    def _from_api_response(cls, data: dict) -> "VolumeInfo":
        """Create VolumeInfo from API response data."""
        return cls(
            volume_id=data["volumeID"],
            name=data["name"],
            total_size_bytes=data.get("totalSizeBytes", 0),
            total_file_count=data.get("totalFileCount", 0),
            created_at=datetime.fromisoformat(
                data["createdAt"].replace("Z", "+00:00")
            ),
            updated_at=datetime.fromisoformat(
                data["updatedAt"].replace("Z", "+00:00")
            ),
        )
