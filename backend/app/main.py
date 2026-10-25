import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.alerts import router as alerts_router
from app.api.analytics import router as analytics_router
from app.api.documents import router as documents_router
from app.api.settings import router as settings_router
from app.database import Base, engine, run_sqlite_migrations

# Ensure database tables exist and apply any column migrations
Base.metadata.create_all(bind=engine)
run_sqlite_migrations(engine)

import copy
from fastapi.openapi.utils import get_openapi

app = FastAPI(
    title="DocuQuality: Document Image Quality Assessment & Auto-Correction API",
    description="Automated scoring and targeted auto-correction engine for document scans and mobile captures.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Inline $ref schemas in requestBody so requestBody content schema has properties directly
    for path_item in openapi_schema.get("paths", {}).values():
        for operation in path_item.values():
            if isinstance(operation, dict) and "requestBody" in operation:
                rb_content = operation["requestBody"].get("content", {})
                for media_obj in rb_content.values():
                    if isinstance(media_obj, dict) and "schema" in media_obj:
                        m_schema = media_obj["schema"]
                        if isinstance(m_schema, dict) and "$ref" in m_schema:
                            ref_key = m_schema["$ref"].split("/")[-1]
                            comp_schemas = openapi_schema.get("components", {}).get("schemas", {})
                            if ref_key in comp_schemas:
                                media_obj["schema"] = copy.deepcopy(comp_schemas[ref_key])

    # Recursive schema transformation to remove contentMediaType and set {"type": "string", "format": "binary"}
    def _transform_file_schemas(node):
        if not isinstance(node, dict):
            return
        if node.get("type") == "array" and "items" in node and isinstance(node["items"], dict):
            items = node["items"]
            if items.get("contentMediaType") == "application/octet-stream" or items.get("format") == "binary":
                items.pop("contentMediaType", None)
                items["type"] = "string"
                items["format"] = "binary"
        if node.get("contentMediaType") == "application/octet-stream":
            node.pop("contentMediaType", None)
            node["type"] = "string"
            node["format"] = "binary"
        for v in node.values():
            if isinstance(v, dict):
                _transform_file_schemas(v)
            elif isinstance(v, list):
                for elem in v:
                    if isinstance(elem, dict):
                        _transform_file_schemas(elem)

    _transform_file_schemas(openapi_schema)
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

# CORS setup
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for convenient development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(documents_router)
app.include_router(analytics_router)
app.include_router(alerts_router)
app.include_router(settings_router)


@app.get("/")
def root():
    return {
        "app": "DocuQuality API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "docuquality-backend"}
