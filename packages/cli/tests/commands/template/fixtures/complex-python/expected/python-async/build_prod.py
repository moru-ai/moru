import asyncio
from moru import AsyncTemplate, default_build_logger
from .template import template


async def main():
    await AsyncTemplate.build(
        template,
        alias="complex-python-app",
        on_build_logs=default_build_logger(),
    )


if __name__ == "__main__":
    asyncio.run(main())