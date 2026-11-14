"""AWS Lambda handler for a Lambda function URL. The query itself is in properties.py."""

import base64
import hmac
import json
import os

# Outside /tmp a Lambda's file system is read-only, and DuckDB installs its httpfs
# extension under HOME.
os.environ["HOME"] = "/tmp"

import requests  # noqa: E402

from properties import version_properties  # noqa: E402

SPECKLE_URL = os.environ.get("SPECKLE_URL", "https://app.speckle.systems")


def _response(status, body, content_type="text/plain"):
    return {"statusCode": status, "headers": {"Content-Type": content_type}, "body": body}


def lambda_handler(event, context):
    # A function URL with auth type NONE is public, so callers must send the shared key.
    key = (event.get("headers") or {}).get("x-api-key", "")
    if not hmac.compare_digest(key, os.environ["FUNCTION_KEY"]):
        return _response(401, "Missing or wrong x-api-key header")

    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        raw = base64.b64decode(raw).decode()
    body = json.loads(raw)

    response = requests.get(
        f"{SPECKLE_URL}/api/v2/projects/{body['projectId']}/models/{body['modelId']}"
        f"/versions/{body['versionId']}/artifacts",
        headers={"Authorization": f"Bearer {os.environ['SPECKLE_TOKEN']}"},
        timeout=30,
    )
    if not response.ok:
        return _response(response.status_code, response.text)

    try:
        rows = version_properties(response.json()["files"])
    except LookupError as err:
        return _response(404, str(err))
    return _response(200, json.dumps(rows), "application/json")
