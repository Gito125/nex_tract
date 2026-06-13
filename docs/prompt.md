**Fix PyInstaller entry point — `nextract-server` binary exits silently**

**Context:**
The FastAPI backend is bundled with PyInstaller. The current spec uses `app/main.py` as the entry point, but `main.py` only defines the FastAPI app — it never calls `uvicorn.run()`. So PyInstaller bundles it, Python executes it, the app object is created, and the process exits cleanly with no server running.

**What's already done:**
A new entry point file `server/run_server.py` has been created with this content:
```python
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("NEXTRACT_PORT", 57000))
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=port,
        log_level="info",
    )
```

**Your task:**
1. Read `server/nextract-server.spec`
2. Change the `Analysis` entry point from `['app/main.py']` to `['run_server.py']`
3. Confirm no other references to `app/main.py` as a script target exist in the spec
4. Do not touch anything else in the spec

**Do not:**
- Modify `app/main.py`
- Change hidden imports, datas, or binaries in the spec
- Tell me the Rebuild or run any commands — just make the spec edit. Dont run build commands(Tell me and I run them personally) just test the changes.

**Verify by reading the file after editing and confirming the change is correct.**