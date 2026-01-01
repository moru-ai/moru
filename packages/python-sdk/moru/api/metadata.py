import platform

from importlib import metadata

package_version = metadata.version("moru")

default_headers = {
    "lang": "python",
    "lang_version": platform.python_version(),
    "package_version": metadata.version("moru"),
    "publisher": "moru",
    "sdk_runtime": "python",
    "system": platform.system(),
}
