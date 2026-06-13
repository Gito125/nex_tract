import pytest
from pathlib import Path
from app.utils.validators import validate_safe_url, check_storage_and_permissions

def test_validate_safe_url():
    # Valid URLs
    validate_safe_url("https://youtube.com/watch?v=123")
    validate_safe_url("http://example.com")
    
    # Invalid Scheme
    with pytest.raises(ValueError, match="Only http and https"):
        validate_safe_url("ftp://example.com")
    
    with pytest.raises(ValueError, match="Only http and https"):
        validate_safe_url("file:///etc/passwd")

    # Localhost
    with pytest.raises(ValueError, match="internal network"):
        validate_safe_url("http://localhost:8000")
        
    with pytest.raises(ValueError, match="internal network"):
        validate_safe_url("https://localhost.localdomain")

    # Internal IPs
    with pytest.raises(ValueError, match="internal IP"):
        validate_safe_url("http://127.0.0.1")
        
    with pytest.raises(ValueError, match="internal IP"):
        validate_safe_url("http://192.168.1.1")
        
    with pytest.raises(ValueError, match="internal IP"):
        validate_safe_url("http://10.0.0.5")
        
    with pytest.raises(ValueError, match="internal IP"):
        validate_safe_url("http://169.254.169.254")

def test_check_storage_and_permissions_no_dir():
    # Attempting to check a directory we can't create
    with pytest.raises(ValueError, match="Permission denied"):
        check_storage_and_permissions(Path("/root/cannot_create"))

def test_check_storage_and_permissions_no_write(tmp_path):
    # Valid directory, but no write permissions
    test_dir = tmp_path / "test_no_write"
    test_dir.mkdir()
    
    # Remove write permissions
    test_dir.chmod(0o444)
    
    with pytest.raises(ValueError, match="No write permissions"):
        check_storage_and_permissions(test_dir)
    
    # Restore permissions to clean up
    test_dir.chmod(0o777)

def test_check_storage_and_permissions_success(tmp_path):
    # Should pass without raising an error
    check_storage_and_permissions(tmp_path)
