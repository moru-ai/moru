import pytest

from moru.sandbox.commands.command_handle import CommandExitException


@pytest.mark.skip_debug()
async def test_internet_access_enabled(async_sandbox_factory):
    """Test that sandbox with internet access enabled can reach external websites."""
    sbx = await async_sandbox_factory(allow_internet_access=True)

    # Test internet connectivity by making a curl request to a reliable external site
    # Note: moru.io has no DNS A record (only wildcard *.moru.io), so we use google.com
    result = await sbx.commands.run(
        "curl -s -o /dev/null -w '%{http_code}' https://google.com"
    )
    assert result.exit_code == 0
    # google.com may return 200 or 301 redirect
    assert result.stdout.strip() in ["200", "301"]


@pytest.mark.skip_debug()
async def test_internet_access_disabled(async_sandbox_factory):
    """Test that sandbox with internet access disabled cannot reach external websites."""
    sbx = await async_sandbox_factory(allow_internet_access=False)

    # Test that internet connectivity is blocked by making a curl request
    with pytest.raises(CommandExitException) as exc_info:
        await sbx.commands.run(
            "curl --connect-timeout 3 --max-time 5 -Is https://google.com"
        )
        # The command should fail or timeout when internet access is disabled
    assert exc_info.value.exit_code != 0


@pytest.mark.skip_debug()
async def test_internet_access_default(async_sandbox):
    """Test that sandbox with default settings (no explicit allow_internet_access) has internet access."""
    # Test internet connectivity by making a curl request to a reliable external site
    # Note: moru.io has no DNS A record (only wildcard *.moru.io), so we use google.com

    result = await async_sandbox.commands.run(
        "curl -s -o /dev/null -w '%{http_code}' https://google.com"
    )
    assert result.exit_code == 0
    # google.com may return 200 or 301 redirect
    assert result.stdout.strip() in ["200", "301"]
