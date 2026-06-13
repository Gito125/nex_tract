import ipaddress
import os
import shutil
from pathlib import Path
from urllib.parse import urlparse

def validate_safe_url(url_str: str) -> None:
    """
    Validates that a URL is safe to process (HTTP/HTTPS only, no internal IPs/localhost).
    Raises ValueError if the URL is unsafe or invalid.
    """
    try:
        parsed = urlparse(url_str)
    except Exception as e:
        raise ValueError("Invalid URL format.") from e
    
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http and https links are supported.")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Invalid URL: missing hostname.")

    # Block explicit localhost strings
    if hostname.lower() in ("localhost", "localhost.localdomain"):
        raise ValueError("Access to internal network is not allowed.")

    # Block private/internal IP addresses
    is_internal_ip = False
    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast:
            is_internal_ip = True
    except ValueError:
        # Not an IP address, which is fine (it's a domain name)
        pass
        
    if is_internal_ip:
        raise ValueError("Access to internal IP addresses is not allowed.")

def check_storage_and_permissions(download_dir: Path, estimated_size: int = 0) -> None:
    """
    Checks if the download directory is writable and has enough disk space.
    Raises ValueError if permissions are denied or space is insufficient.
    """
    # Ensure directory exists or create it
    try:
        if not download_dir.exists():
            download_dir.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        raise ValueError(f"Cannot create download directory: {download_dir}. Permission denied.") from e

    # Check write permissions
    if not os.access(download_dir, os.W_OK):
        raise ValueError(f"No write permissions for directory: {download_dir}")

    # Check disk space (require at least 500MB + estimated size, or a minimum floor)
    try:
        usage = shutil.disk_usage(download_dir)
        required_space = estimated_size + (500 * 1024 * 1024) # 500MB buffer
        if usage.free < required_space:
            raise ValueError("Insufficient disk space. Please free up some space and try again.")
    except OSError:
        # Some file systems or environments might fail to report disk usage
        pass
