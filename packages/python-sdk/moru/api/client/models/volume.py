import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, Union

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..types import UNSET, Unset

T = TypeVar("T", bound="Volume")


@_attrs_define
class Volume:
    """
    Attributes:
        created_at (datetime.datetime): When the volume was created
        name (str): Volume name
        updated_at (datetime.datetime): When the volume was last updated
        volume_id (str): Unique volume identifier
        total_file_count (Union[Unset, int]): Total number of files in volume
        total_size_bytes (Union[Unset, int]): Total size of files in volume (bytes)
    """

    created_at: datetime.datetime
    name: str
    updated_at: datetime.datetime
    volume_id: str
    total_file_count: Union[Unset, int] = UNSET
    total_size_bytes: Union[Unset, int] = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        created_at = self.created_at.isoformat()

        name = self.name

        updated_at = self.updated_at.isoformat()

        volume_id = self.volume_id

        total_file_count = self.total_file_count

        total_size_bytes = self.total_size_bytes

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "createdAt": created_at,
                "name": name,
                "updatedAt": updated_at,
                "volumeID": volume_id,
            }
        )
        if total_file_count is not UNSET:
            field_dict["totalFileCount"] = total_file_count
        if total_size_bytes is not UNSET:
            field_dict["totalSizeBytes"] = total_size_bytes

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        created_at = isoparse(d.pop("createdAt"))

        name = d.pop("name")

        updated_at = isoparse(d.pop("updatedAt"))

        volume_id = d.pop("volumeID")

        total_file_count = d.pop("totalFileCount", UNSET)

        total_size_bytes = d.pop("totalSizeBytes", UNSET)

        volume = cls(
            created_at=created_at,
            name=name,
            updated_at=updated_at,
            volume_id=volume_id,
            total_file_count=total_file_count,
            total_size_bytes=total_size_bytes,
        )

        volume.additional_properties = d
        return volume

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
