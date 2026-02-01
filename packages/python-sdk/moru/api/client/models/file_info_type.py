from enum import Enum


class FileInfoType(str, Enum):
    DIRECTORY = "directory"
    FILE = "file"

    def __str__(self) -> str:
        return str(self.value)
