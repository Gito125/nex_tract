from unittest.mock import MagicMock, patch
import pytest

from app.platforms.soundcloud import SoundCloudAdapter, extract_soundcloud_metadata
from app.services.exceptions import AnalyzeError, MediaUnavailableError


def test_soundcloud_detects_playlist() -> None:
    adapter = SoundCloudAdapter()
    
    # Test valid playlist
    from urllib.parse import urlparse
    parsed = urlparse("https://soundcloud.com/user/sets/playlist-name")
    assert adapter.detect_media_type(parsed) == "playlist"
    
    # Test user profile (handled as playlist)
    parsed = urlparse("https://soundcloud.com/user")
    assert adapter.detect_media_type(parsed) == "playlist"
    
    # Test single track
    parsed = urlparse("https://soundcloud.com/user/track-name")
    assert adapter.detect_media_type(parsed) == "video"


@patch("app.platforms.soundcloud.subprocess.run")
def test_soundcloud_extract_track(mock_run) -> None:
    mock_run.return_value = MagicMock(
        returncode=0,
        stdout='{"id": "123", "title": "Test Track", "uploader": "Artist"}',
        stderr="",
    )
    
    result = extract_soundcloud_metadata("https://soundcloud.com/user/track-name", "video")
    
    assert result["title"] == "Test Track"
    assert result["_nextract_media_type"] == "audio"
    
    # Check yt-dlp arguments
    args = mock_run.call_args[0][0]
    assert "--no-playlist" in args


@patch("app.platforms.soundcloud.subprocess.run")
def test_soundcloud_extract_private_track(mock_run) -> None:
    mock_run.return_value = MagicMock(
        returncode=1,
        stdout="",
        stderr="ERROR: This track is not available in your country",
    )
    
    with pytest.raises(MediaUnavailableError) as exc:
        extract_soundcloud_metadata("https://soundcloud.com/user/track-name", "video")
        
    assert "private or unavailable" in str(exc.value).lower()
