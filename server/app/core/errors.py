from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        _request: Request, exc: HTTPException
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, _exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"detail": "Please check your request and try again."},
        )

    @app.exception_handler(Exception)
    async def unexpected_exception_handler(
        _request: Request, _exc: Exception
    ) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={"detail": "Something went wrong. Please try again."},
        )
