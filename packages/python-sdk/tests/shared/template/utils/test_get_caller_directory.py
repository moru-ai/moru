import os
from moru.template.utils import get_caller_directory


def test_get_caller_directory():
    assert get_caller_directory(1) == os.path.dirname(__file__)
