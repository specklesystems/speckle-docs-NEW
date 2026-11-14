import json
import os

import azure.functions as func
import requests

from properties import version_properties

SPECKLE_URL = os.environ.get("SPECKLE_URL", "https://app.speckle.systems")

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)


@app.route(route="properties", methods=["POST"])
def properties(req: func.HttpRequest) -> func.HttpResponse:
    body = req.get_json()
    response = requests.get(
        f"{SPECKLE_URL}/api/v2/projects/{body['projectId']}/models/{body['modelId']}"
        f"/versions/{body['versionId']}/artifacts",
        headers={"Authorization": f"Bearer {os.environ['SPECKLE_TOKEN']}"},
        timeout=30,
    )
    if not response.ok:
        return func.HttpResponse(response.text, status_code=response.status_code)

    try:
        rows = version_properties(response.json()["files"])
    except LookupError as err:
        return func.HttpResponse(str(err), status_code=404)
    return func.HttpResponse(json.dumps(rows), mimetype="application/json")
